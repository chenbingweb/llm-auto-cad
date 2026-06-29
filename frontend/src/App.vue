<template>
  <div class="app">
    <div class="sidebar">
      <ChatPanel />
    </div>

    <div class="main-area">
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="app-title">Text-to-3D</span>
        </div>
        <div class="toolbar-right">
          <button @click="undo" :disabled="!sceneStore.canUndo" title="撤销 (Ctrl+Z)">
            ↶
          </button>
          <button @click="redo" :disabled="!sceneStore.canRedo" title="重做 (Ctrl+Shift+Z)">
            ↷
          </button>
          <button @click="showExport = true" title="导出">
            ↓
          </button>
        </div>
      </div>

      <div class="workspace">
        <div class="canvas-area">
          <Canvas3D />
          <TransformControls
            v-if="sceneStore.selectedObject"
            class="transform-panel"
          />
        </div>

        <div class="object-panel">
          <ObjectList />
        </div>
      </div>
    </div>

    <ExportDialog :show="showExport" @close="showExport = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useSceneStore } from './stores/scene'
import { createSession, getScene } from './services/api'

import ChatPanel from './components/ChatPanel.vue'
import Canvas3D from './components/Canvas3D.vue'
import ObjectList from './components/ObjectList.vue'
import TransformControls from './components/TransformControls.vue'
import ExportDialog from './components/ExportDialog.vue'

const sceneStore = useSceneStore()
const showExport = ref(false)

onMounted(async () => {
  await initSession()
  setupKeyboardShortcuts()
})

async function initSession() {
  try {
    const sessionId = await createSession()
    sceneStore.setSessionId(sessionId)

    const sceneData = await getScene(sessionId)
    if (sceneData && sceneData.objects) {
      sceneStore.loadScene(sceneData)
    }
  } catch (error) {
    console.error('Failed to initialize session:', error)
  }
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', handleKeydown)
}

function handleKeydown(e) {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault()
      redo()
    }
  }

  if (e.key === 'Delete' && sceneStore.selectedObjectId) {
    sceneStore.removeObject(sceneStore.selectedObjectId)
  }
}

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function undo() {
  sceneStore.undo()
}

function redo() {
  sceneStore.redo()
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>

<style scoped>
.app {
  display: flex;
  width: 100%;
  height: 100%;
}

.sidebar {
  width: 320px;
  height: 100%;
  border-right: 1px solid #333;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.toolbar-right {
  display: flex;
  gap: 4px;
}

.toolbar-right button {
  width: 32px;
  height: 32px;
  font-size: 16px;
  background: transparent;
  border: 1px solid transparent;
  color: #888;
  border-radius: 6px;
  cursor: pointer;
}

.toolbar-right button:hover:not(:disabled) {
  background: #333;
  color: #fff;
}

.toolbar-right button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.transform-panel {
  position: absolute;
  top: 12px;
  left: 12px;
  width: 200px;
}

.object-panel {
  width: 220px;
  height: 100%;
  border-left: 1px solid #333;
}
</style>