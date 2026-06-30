<template>
  <div class="canvas-container" ref="container">
    <canvas ref="canvas"></canvas>
    <div class="canvas-controls">
      <button @click="resetCamera" title="重置视角">重置</button>
      <button @click="toggleWireframe" :class="{ active: wireframe }">线框</button>
    </div>
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div>加载 OpenCASCADE.js...</div>
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
const loading = ref(true)

let renderer, scene, camera, controls
const threeMeshes = new Map()
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

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000)
  camera.position.set(5, 5, 5)

  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222)
  scene.add(gridHelper)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 5)
  scene.add(directionalLight)

  loading.value = false
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
  threeMeshes.forEach((mesh) => {
    if (mesh.material) {
      mesh.material.wireframe = wireframe.value
    }
  })
}

function createThreeMesh(meshData, material) {
  if (!meshData.vertices || meshData.vertices.length === 0) {
    return null
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(meshData.vertices, 3))

  if (meshData.normals && meshData.normals.length > 0) {
    geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3))
  } else {
    geometry.computeVertexNormals()
  }

  const color = meshData.color || 0x888888
  const threeMaterial = new THREE.MeshPhongMaterial({
    color: color,
    wireframe: wireframe.value,
    side: THREE.DoubleSide
  })

  const threeMesh = new THREE.Mesh(geometry, threeMaterial)
  return threeMesh
}

function syncScene() {
  // Remove old meshes that are no longer in objects
  const objectIds = new Set(objects.value.map(o => o.id))
  threeMeshes.forEach((mesh, id) => {
    if (!objectIds.has(id)) {
      scene.remove(mesh)
      threeMeshes.delete(id)
    }
  })

  // Add or update meshes
  objects.value.forEach((obj) => {
    let threeMesh = threeMeshes.get(obj.id)

    if (!threeMesh && obj.meshData) {
      // Create new mesh
      threeMesh = createThreeMesh(obj.meshData, obj.material)
      if (threeMesh) {
        scene.add(threeMesh)
        threeMeshes.set(obj.id, threeMesh)
      }
    }
  })
}

function updateMesh(id) {
  const obj = objects.value.find(o => o.id === id)
  if (!obj) return

  const threeMesh = threeMeshes.get(id)
  if (threeMesh) {
    scene.remove(threeMesh)
    threeMesh.geometry.dispose()
    threeMesh.material.dispose()
    threeMeshes.delete(id)
  }

  if (obj.meshData) {
    const newMesh = createThreeMesh(obj.meshData, obj.material)
    if (newMesh) {
      scene.add(newMesh)
      threeMeshes.set(id, newMesh)
    }
  }
}

function highlightSelected() {
  threeMeshes.forEach((mesh, id) => {
    const isSelected = id === selectedObjectId.value
    mesh.material.emissive = new THREE.Color(isSelected ? 0x333333 : 0x000000)
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
  if (!canvas.value) return

  const rect = canvas.value.getBoundingClientRect()
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  )

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)

  const meshArray = Array.from(threeMeshes.values())
  const intersects = raycaster.intersectObjects(meshArray, true)

  if (intersects.length > 0) {
    let target = intersects[0].object
    while (target.parent && !threeMeshes.has(target.userData.id)) {
      target = target.parent
    }
    if (target.userData.id) {
      sceneStore.selectObject(target.userData.id)
    }
  } else {
    sceneStore.clearSelection()
  }
}

// Expose method to update mesh when shape changes
defineExpose({ updateMesh })
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

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #333;
  border-top-color: #4a90d9;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>