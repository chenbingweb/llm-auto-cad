import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000
})

export async function createSession() {
  const response = await api.post('/session')
  return response.data.session_id
}

export async function getSession(sessionId) {
  const response = await api.get(`/session/${sessionId}`)
  return response.data
}

export async function sendChat(userInput, sceneContext, sessionId, mode = 'cascade') {
  const response = await api.post('/chat', {
    user_input: userInput,
    scene_context: sceneContext,
    session_id: sessionId,
    mode
  })
  return response.data
}

export async function getScene(sessionId) {
  const response = await api.get(`/scene/${sessionId}`)
  return response.data
}

export async function syncScene(sessionId, sceneObjects) {
  const response = await api.post('/scene/sync', {
    session_id: sessionId,
    scene_objects: sceneObjects
  })
  return response.data
}

export default api
