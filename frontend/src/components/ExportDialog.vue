<template>
  <div class="export-dialog" v-if="show">
    <div class="dialog-backdrop" @click="close"></div>
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>导出模型</h3>
        <button @click="close" class="btn-close">×</button>
      </div>

      <div class="dialog-body">
        <div class="format-list">
          <div
            v-for="fmt in formats"
            :key="fmt.id"
            :class="['format-item', { selected: selectedFormat === fmt.id }]"
            @click="selectedFormat = fmt.id"
          >
            <span class="format-icon">{{ fmt.icon }}</span>
            <span class="format-name">{{ fmt.name }}</span>
            <span class="format-desc">{{ fmt.desc }}</span>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button @click="close" class="btn-cancel">取消</button>
        <button @click="exportModel" class="btn-export" :disabled="!selectedFormat">
          导出
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSceneStore } from '../stores/scene'
import { exportManager } from '../services/ExportManager'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])

const sceneStore = useSceneStore()
const selectedFormat = ref(null)

const formats = [
  { id: 'stl', name: 'STL', icon: '◰', desc: '二进制/ASCII STL 格式' },
  { id: 'step', name: 'STEP', icon: '◇', desc: 'STEP Part 21 格式' },
  { id: 'ifc', name: 'IFC', icon: '⬡', desc: 'IFC4 建筑信息模型' },
  { id: 'pdf', name: 'PDF', icon: '▤', desc: '2D 投影矢量图' }
]

function close() {
  emit('close')
}

async function exportModel() {
  if (!selectedFormat.value) return

  const objects = sceneStore.objects
  if (objects.length === 0) {
    alert('场景中没有物体')
    return
  }

  try {
    for (const obj of objects) {
      const mesh = {
        shape: obj.shape,
        params: obj.params,
        transform: obj.transform,
        material: obj.material,
        geometry: obj
      }

      let content, filename, mimeType

      switch (selectedFormat.value) {
        case 'stl':
          content = await exportManager.exportSTL(mesh, { binary: true })
          filename = `${obj.shape || 'model'}.stl`
          mimeType = 'application/octet-stream'
          break
        case 'step':
          content = await exportManager.exportSTEP(mesh)
          filename = `${obj.shape || 'model'}.step`
          mimeType = 'application/step'
          break
        case 'ifc':
          content = await exportManager.exportIFC(mesh)
          filename = `${obj.shape || 'model'}.ifc`
          mimeType = 'application/ifc'
          break
        case 'pdf':
          content = await exportManager.exportPDF(mesh)
          filename = `${obj.shape || 'model'}.pdf`
          mimeType = 'application/pdf'
          break
      }

      exportManager.downloadFile(content, filename, mimeType)
    }

    close()
  } catch (error) {
    alert(`导出失败: ${error.message}`)
  }
}
</script>

<style scoped>
.export-dialog {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
}

.dialog-content {
  position: relative;
  width: 400px;
  background: #252525;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.dialog-header h3 {
  font-size: 16px;
  font-weight: 500;
  color: #fff;
}

.btn-close {
  width: 28px;
  height: 28px;
  font-size: 18px;
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

.dialog-body {
  padding: 16px 20px;
}

.format-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.format-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #1a1a1a;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.format-item:hover {
  border-color: #444;
}

.format-item.selected {
  border-color: #4a90d9;
}

.format-icon {
  font-size: 20px;
  width: 28px;
  text-align: center;
}

.format-name {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  width: 50px;
}

.format-desc {
  font-size: 12px;
  color: #888;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #333;
}

.btn-cancel,
.btn-export {
  padding: 8px 20px;
  font-size: 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-cancel {
  background: #444;
  color: #fff;
}

.btn-cancel:hover {
  background: #555;
}

.btn-export {
  background: #4a90d9;
  color: #fff;
}

.btn-export:disabled {
  background: #444;
  cursor: not-allowed;
}

.btn-export:hover:not(:disabled) {
  background: #3a7bc8;
}
</style>