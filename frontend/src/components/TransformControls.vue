<template>
  <div class="transform-controls" v-if="selectedObject">
    <div class="controls-header">
      <h3>变换控制</h3>
      <button @click="close" class="btn-close">×</button>
    </div>

    <div class="control-group">
      <label>位置</label>
      <div class="input-row">
        <input
          type="number"
          v-model.number="position[0]"
          @change="updateTransform"
          step="0.1"
        />
        <input
          type="number"
          v-model.number="position[1]"
          @change="updateTransform"
          step="0.1"
        />
        <input
          type="number"
          v-model.number="position[2]"
          @change="updateTransform"
          step="0.1"
        />
      </div>
    </div>

    <div class="control-group">
      <label>旋转 (°)</label>
      <div class="input-row">
        <input
          type="number"
          v-model.number="rotation[0]"
          @change="updateTransform"
          step="5"
        />
        <input
          type="number"
          v-model.number="rotation[1]"
          @change="updateTransform"
          step="5"
        />
        <input
          type="number"
          v-model.number="rotation[2]"
          @change="updateTransform"
          step="5"
        />
      </div>
    </div>

    <div class="control-group">
      <label>缩放</label>
      <div class="input-row">
        <input
          type="number"
          v-model.number="scale[0]"
          @change="updateTransform"
          step="0.1"
          min="0.1"
        />
        <input
          type="number"
          v-model.number="scale[1]"
          @change="updateTransform"
          step="0.1"
          min="0.1"
        />
        <input
          type="number"
          v-model.number="scale[2]"
          @change="updateTransform"
          step="0.1"
          min="0.1"
        />
      </div>
    </div>

    <div class="control-group">
      <label>颜色</label>
      <input
        type="color"
        v-model="color"
        @change="updateMaterial"
        class="color-picker"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSceneStore } from '../stores/scene'

const sceneStore = useSceneStore()

const selectedObject = computed(() => sceneStore.selectedObject)

const position = ref([0, 0, 0])
const rotation = ref([0, 0, 0])
const scale = ref([1, 1, 1])
const color = ref('#888888')

watch(selectedObject, (obj) => {
  if (obj) {
    position.value = [
      obj.transform?.position?.[0] || 0,
      obj.transform?.position?.[1] || 0,
      obj.transform?.position?.[2] || 0
    ]
    rotation.value = [
      (obj.transform?.rotation?.[0] || 0) * 180 / Math.PI,
      (obj.transform?.rotation?.[1] || 0) * 180 / Math.PI,
      (obj.transform?.rotation?.[2] || 0) * 180 / Math.PI
    ]
    scale.value = [
      obj.transform?.scale?.[0] || 1,
      obj.transform?.scale?.[1] || 1,
      obj.transform?.scale?.[2] || 1
    ]
    color.value = obj.material?.color || '#888888'
  }
}, { immediate: true })

function updateTransform() {
  if (!selectedObject.value) return

  sceneStore.updateObject(selectedObject.value.id, {
    transform: {
      position: [...position.value],
      rotation: [
        rotation.value[0] * Math.PI / 180,
        rotation.value[1] * Math.PI / 180,
        rotation.value[2] * Math.PI / 180
      ],
      scale: [...scale.value]
    }
  })
}

function updateMaterial() {
  if (!selectedObject.value) return

  sceneStore.updateObject(selectedObject.value.id, {
    material: {
      ...selectedObject.value.material,
      color: color.value
    }
  })
}

function close() {
  sceneStore.clearSelection()
}
</script>

<style scoped>
.transform-controls {
  background: #252525;
  color: #fff;
  padding: 12px 16px;
  border-radius: 8px;
}

.controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.controls-header h3 {
  font-size: 14px;
  font-weight: 500;
}

.btn-close {
  width: 24px;
  height: 24px;
  font-size: 16px;
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  border-radius: 4px;
}

.btn-close:hover {
  background: #444;
  color: #fff;
}

.control-group {
  margin-bottom: 12px;
}

.control-group label {
  display: block;
  font-size: 11px;
  color: #888;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.input-row {
  display: flex;
  gap: 6px;
}

.input-row input {
  flex: 1;
  padding: 6px 8px;
  font-size: 13px;
  background: #1a1a1a;
  border: 1px solid #444;
  color: #fff;
  border-radius: 4px;
  text-align: center;
}

.input-row input:focus {
  outline: none;
  border-color: #4a90d9;
}

.color-picker {
  width: 100%;
  height: 32px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>