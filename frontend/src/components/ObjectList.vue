<template>
  <div class="object-list">
    <div class="list-header">
      <h3>场景物体</h3>
      <span class="count">{{ objects.length }}</span>
    </div>

    <div class="list-content">
      <div
        v-for="obj in objects"
        :key="obj.id"
        :class="['list-item', { selected: obj.id === selectedObjectId }]"
        @click="selectObject(obj.id)"
      >
        <span class="item-icon">{{ getShapeIcon(obj.shape) }}</span>
        <span class="item-name">{{ obj.description || obj.shape }}</span>
        <button class="btn-delete" @click.stop="deleteObject(obj.id)">×</button>
      </div>

      <div v-if="objects.length === 0" class="empty-state">
        暂无物体，请通过对话创建
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSceneStore } from '../stores/scene'

const sceneStore = useSceneStore()

const objects = computed(() => sceneStore.objects)
const selectedObjectId = computed(() => sceneStore.selectedObjectId)

function getShapeIcon(shape) {
  const icons = {
    cuboid: '▣',
    cylinder: '⬭',
    sphere: '●',
    wedge: '△',
    polygon: '⬡',
    arc: '⌒',
    curve: '〰',
    line: '—',
    polyline: '⤿',
    rectangle: '▢'
  }
  return icons[shape] || '◆'
}

function selectObject(id) {
  sceneStore.selectObject(id)
}

function deleteObject(id) {
  sceneStore.removeObject(id)
}
</script>

<style scoped>
.object-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #252525;
  color: #fff;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.list-header h3 {
  font-size: 14px;
  font-weight: 500;
}

.count {
  font-size: 12px;
  background: #444;
  padding: 2px 8px;
  border-radius: 10px;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.list-item:hover {
  background: #333;
}

.list-item.selected {
  background: #4a90d9;
}

.item-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.item-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-delete {
  width: 20px;
  height: 20px;
  font-size: 14px;
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.list-item:hover .btn-delete {
  opacity: 1;
}

.btn-delete:hover {
  background: #d9534f;
  color: #fff;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #666;
  font-size: 13px;
}
</style>