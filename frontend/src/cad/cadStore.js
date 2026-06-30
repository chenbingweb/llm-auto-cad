import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCadStore = defineStore('cad', () => {
  const sessionId = ref(null)
  const meshData = ref(null)
  const generatedCode = ref('')
  const messages = ref([])
  const isLoading = ref(false)
  const lastError = ref('')

  const engine = ref(null)

  const hasMesh = computed(() => {
    const data = meshData.value
    return data && data.faces && data.faces.length > 0
  })

  function setSessionId(id) {
    sessionId.value = id
  }

  function setEngine(engineInstance) {
    engine.value = engineInstance
  }

  function setMeshData(data) {
    meshData.value = data
    lastError.value = ''
  }

  function setGeneratedCode(code) {
    generatedCode.value = code
  }

  function addMessage(role, content) {
    messages.value.push({
      id: Date.now() + Math.random().toString(36).slice(2, 7),
      role,
      content,
      timestamp: new Date().toISOString()
    })
  }

  function setLoading(loading) {
    isLoading.value = loading
  }

  function setError(error) {
    lastError.value = error
    isLoading.value = false
  }

  function clearChat() {
    messages.value = []
  }

  function getSceneContext() {
    // Simple context for now; can be extended with scene object descriptions
    return []
  }

  return {
    sessionId,
    meshData,
    generatedCode,
    messages,
    isLoading,
    lastError,
    engine,
    hasMesh,
    setSessionId,
    setEngine,
    setMeshData,
    setGeneratedCode,
    addMessage,
    setLoading,
    setError,
    clearChat,
    getSceneContext
  }
})
