import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSceneStore = defineStore('scene', () => {
  const sessionId = ref(null)
  const objects = ref([])
  const selectedObjectId = ref(null)
  const history = ref([])
  const historyIndex = ref(-1)
  const isLoading = ref(false)
  const messages = ref([])

  const selectedObject = computed(() =>
    objects.value.find(obj => obj.id === selectedObjectId.value)
  )

  const canUndo = computed(() => historyIndex.value >= 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  function setSessionId(id) {
    sessionId.value = id
  }

  function addMessage(msg) {
    messages.value.push({
      id: Date.now(),
      ...msg,
      timestamp: new Date().toISOString()
    })
  }

  function addObject(obj) {
    const newObj = {
      id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ...obj
    }
    objects.value.push(newObj)
    pushHistory()
    return newObj
  }

  function updateObject(id, updates) {
    const index = objects.value.findIndex(obj => obj.id === id)
    if (index !== -1) {
      objects.value[index] = { ...objects.value[index], ...updates }
      pushHistory()
    }
  }

  function removeObject(id) {
    const index = objects.value.findIndex(obj => obj.id === id)
    if (index !== -1) {
      objects.value.splice(index, 1)
      if (selectedObjectId.value === id) {
        selectedObjectId.value = null
      }
      pushHistory()
    }
  }

  function selectObject(id) {
    selectedObjectId.value = id
  }

  function clearSelection() {
    selectedObjectId.value = null
  }

  function pushHistory() {
    history.value = history.value.slice(0, historyIndex.value + 1)
    history.value.push(JSON.parse(JSON.stringify(objects.value)))
    historyIndex.value = history.value.length - 1
  }

  function undo() {
    if (canUndo.value) {
      historyIndex.value--
      objects.value = historyIndex.value >= 0
        ? JSON.parse(JSON.stringify(history.value[historyIndex.value]))
        : []
    }
  }

  function redo() {
    if (canRedo.value) {
      historyIndex.value++
      objects.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]))
    }
  }

  function loadScene(sceneData) {
    objects.value = sceneData.objects || []
    history.value = sceneData.history || []
    historyIndex.value = sceneData.history_index ?? -1
  }

  function getSceneContext() {
    return objects.value.map(obj => ({
      id: obj.id,
      type: obj.type,
      shape: obj.shape,
      description: obj.description || `${obj.shape} ${obj.type}`
    }))
  }

  function reset() {
    sessionId.value = null
    objects.value = []
    selectedObjectId.value = null
    history.value = []
    historyIndex.value = -1
    isLoading.value = false
    messages.value = []
  }

  return {
    sessionId,
    objects,
    selectedObjectId,
    selectedObject,
    history,
    historyIndex,
    isLoading,
    messages,
    canUndo,
    canRedo,
    setSessionId,
    addMessage,
    addObject,
    updateObject,
    removeObject,
    selectObject,
    clearSelection,
    undo,
    redo,
    loadScene,
    getSceneContext,
    reset
  }
})