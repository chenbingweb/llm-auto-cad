<template>
  <div class="canvas-container" ref="container">
    <canvas ref="canvas"></canvas>
    <div class="canvas-controls">
      <button @click="resetCamera" title="重置视角">重置</button>
      <button @click="toggleWireframe" :class="{ active: wireframe }">线框</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useSceneStore } from '../stores/scene'

const sceneStore = useSceneStore()
const container = ref(null)
const canvas = ref(null)

let renderer, scene, camera, controls
let meshes = new Map()
const wireframe = ref(false)

const objects = computed(() => sceneStore.objects)
const selectedObjectId = computed(() => sceneStore.selectedObjectId)

onMounted(() => {
  initThree()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (renderer) {
    renderer.dispose()
  }
})

function initThree() {
  const width = container.value.clientWidth
  const height = container.value.clientHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a1a)

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  camera.position.set(5, 5, 5)

  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222)
  scene.add(gridHelper)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 5)
  scene.add(directionalLight)

  animate()
}

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

function onResize() {
  if (!container.value) return
  const width = container.value.clientWidth
  const height = container.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function resetCamera() {
  camera.position.set(5, 5, 5)
  camera.lookAt(0, 0, 0)
  controls.reset()
}

function toggleWireframe() {
  wireframe.value = !wireframe.value
  meshes.forEach((mesh) => {
    if (mesh.children.length > 0) {
      mesh.children.forEach((child) => {
        if (child.material) {
          child.material.wireframe = wireframe.value
        }
      })
    }
  })
}

function createMeshFromObject(obj) {
  let geometry

  switch (obj.shape) {
    case 'cuboid':
      geometry = new THREE.BoxGeometry(
        obj.params.width || 1,
        obj.params.height || 1,
        obj.params.depth || 1
      )
      break
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(
        obj.params.radius || 0.5,
        obj.params.radius || 0.5,
        obj.params.height || 1,
        obj.params.segments || 32
      )
      break
    case 'sphere':
      geometry = new THREE.SphereGeometry(
        obj.params.radius || 0.5,
        obj.params.segments || 32,
        obj.params.segments || 32
      )
      break
    case 'wedge':
      geometry = new THREE.ConeGeometry(0.5, 1, 4)
      break
    default:
      geometry = new THREE.BoxGeometry(1, 1, 1)
  }

  const material = new THREE.MeshPhongMaterial({
    color: obj.material?.color || 0x888888,
    transparent: obj.material?.opacity < 1,
    opacity: obj.material?.opacity || 1,
    wireframe: wireframe.value
  })

  const mesh = new THREE.Mesh(geometry, material)

  if (obj.transform) {
    mesh.position.set(
      obj.transform.position?.[0] || 0,
      obj.transform.position?.[1] || 0,
      obj.transform.position?.[2] || 0
    )
    mesh.rotation.set(
      obj.transform.rotation?.[0] || 0,
      obj.transform.rotation?.[1] || 0,
      obj.transform.rotation?.[2] || 0
    )
    mesh.scale.set(
      obj.transform.scale?.[0] || 1,
      obj.transform.scale?.[1] || 1,
      obj.transform.scale?.[2] || 1
    )
  }

  mesh.userData.id = obj.id

  return mesh
}

function syncScene() {
  meshes.forEach((mesh, id) => {
    scene.remove(mesh)
  })
  meshes.clear()

  objects.value.forEach((obj) => {
    const mesh = createMeshFromObject(obj)
    scene.add(mesh)
    meshes.set(obj.id, mesh)
  })
}

function updateMesh(id) {
  const mesh = meshes.get(id)
  if (!mesh) return

  const obj = objects.value.find((o) => o.id === id)
  if (!obj) return

  scene.remove(mesh)
  meshes.delete(id)

  const newMesh = createMeshFromObject(obj)
  scene.add(newMesh)
  meshes.set(id, newMesh)
}

function highlightSelected() {
  meshes.forEach((mesh, id) => {
    if (mesh.children.length > 0) {
      mesh.children.forEach((child) => {
        if (child.material) {
          child.material.emissive = new THREE.Color(
            id === selectedObjectId.value ? 0x444444 : 0x000000
          )
        }
      })
    }
  })
}

watch(objects, () => {
  syncScene()
}, { deep: true })

watch(selectedObjectId, () => {
  highlightSelected()
})

onMounted(() => {
  container.value.addEventListener('click', onCanvasClick)
})

function onCanvasClick(event) {
  const rect = canvas.value.getBoundingClientRect()
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  )

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)

  const meshArray = Array.from(meshes.values())
  const intersects = raycaster.intersectObjects(meshArray, true)

  if (intersects.length > 0) {
    let target = intersects[0].object
    while (target.parent && !target.userData.id) {
      target = target.parent
    }
    if (target.userData.id) {
      sceneStore.selectObject(target.userData.id)
    }
  } else {
    sceneStore.clearSelection()
  }
}
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.canvas-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
}

.canvas-controls button {
  padding: 6px 12px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid #444;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
}

.canvas-controls button:hover {
  background: rgba(0, 0, 0, 0.8);
}

.canvas-controls button.active {
  background: #4a90d9;
  border-color: #4a90d9;
}
</style>