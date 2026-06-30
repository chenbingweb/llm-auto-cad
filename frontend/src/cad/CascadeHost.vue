<template>
  <div ref="container" class="cascade-host">
    <div v-if="!engineReady" class="overlay">加载 CAD 引擎中...</div>
    <div v-if="cadStore.lastError" class="overlay error">{{ cadStore.lastError }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, provide } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CascadeEngine } from 'cascade-core/engine'
import { useCadStore } from './cadStore'

const container = ref(null)
const engineReady = ref(false)
const cadStore = useCadStore()
let engine = null
let scene = null
let camera = null
let renderer = null
let controls = null
let meshGroup = null
let rafId = null

provide('cascadeEngine', {
  get engine() { return engine },
  get ready() { return engineReady.value }
})

async function initEngine() {
  engine = new CascadeEngine({
    workerUrl: '/cascade/cascade-worker.js'
  })

  engine.on('log', (message) => {
    console.log('[Cascade]', message)
  })

  engine.on('error', (message) => {
    console.error('[Cascade]', message)
    cadStore.setError(message)
  })

  await engine.init()
  engineReady.value = true
  cadStore.setEngine(engine)
}

function initThree() {
  const width = container.value.clientWidth
  const height = container.value.clientHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a1a)

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.position.set(8, 6, 8)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 0, 0)

  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambient)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(5, 10, 7)
  scene.add(dirLight)

  const grid = new THREE.GridHelper(20, 20, 0x444444, 0x333333)
  scene.add(grid)

  meshGroup = new THREE.Group()
  // OpenCascade is Z-up; Three.js is Y-up. Rotate to match.
  meshGroup.rotation.x = -Math.PI / 2
  scene.add(meshGroup)

  window.addEventListener('resize', onResize)
  animate()
}

function onResize() {
  if (!container.value || !camera || !renderer) return
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function animate() {
  rafId = requestAnimationFrame(animate)
  if (controls) controls.update()
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function clearMeshGroup() {
  if (!meshGroup) return
  while (meshGroup.children.length > 0) {
    const child = meshGroup.children[0]
    meshGroup.remove(child)
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose())
      } else {
        child.material.dispose()
      }
    }
  }
}

function renderMeshData(data) {
  if (!data || !meshGroup) return
  clearMeshGroup()

  const faces = data.faces || []
  const edges = data.edges || []
  const defaultColor = new THREE.Color(0x888888)

  faces.forEach((face) => {
    const positions = face.vertex_coord
    const normals = face.normal_coord
    const indices = face.tri_indexes

    if (!positions || !indices || positions.length === 0 || indices.length === 0) return

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    if (normals && normals.length === positions.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    }
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    const material = new THREE.MeshStandardMaterial({
      color: defaultColor,
      roughness: 0.4,
      metalness: 0.1,
      side: THREE.DoubleSide
    })

    const mesh = new THREE.Mesh(geometry, material)
    meshGroup.add(mesh)
  })

  edges.forEach((edge) => {
    const positions = edge.vertex_coord
    if (!positions || positions.length < 6) return

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

    const material = new THREE.LineBasicMaterial({ color: 0x222222, linewidth: 1 })
    const line = new THREE.LineSegments(geometry, material)
    meshGroup.add(line)
  })

  fitCamera()
}

function fitCamera() {
  if (!meshGroup || !camera || !controls) return
  const box = new THREE.Box3().setFromObject(meshGroup)
  if (box.isEmpty()) return

  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  const distance = maxDim > 0 ? maxDim * 1.8 : 10

  controls.target.copy(center)
  camera.position.set(center.x + distance, center.y + distance, center.z + distance)
  camera.lookAt(center)
  controls.update()
}

onMounted(async () => {
  initThree()
  try {
    await initEngine()
  } catch (e) {
    console.error('Failed to initialize CascadeEngine:', e)
    cadStore.setError(`CAD 引擎初始化失败: ${e.message}`)
  }
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  window.removeEventListener('resize', onResize)
  if (engine) engine.dispose()
  if (renderer) renderer.dispose()
})

watch(() => cadStore.meshData, (data) => {
  renderMeshData(data)
}, { deep: true })

defineExpose({
  engine,
  fitCamera
})
</script>

<style scoped>
.cascade-host {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #1a1a1a;
}

.overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
  pointer-events: none;
  z-index: 10;
}

.overlay.error {
  background: rgba(120, 30, 30, 0.85);
  max-width: 80%;
  text-align: center;
  white-space: pre-wrap;
}
</style>
