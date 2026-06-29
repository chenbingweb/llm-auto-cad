<template>
  <div class="chat-panel">
    <div class="chat-header">
      <h3>AI 对话</h3>
      <button @click="clearChat" class="btn-clear">清空</button>
    </div>

    <div class="messages" ref="messagesContainer">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['message', msg.role]"
      >
        <div class="message-content">{{ msg.content }}</div>
        <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
      </div>

      <div v-if="isLoading" class="message assistant loading">
        <div class="message-content">思考中...</div>
      </div>
    </div>

    <div class="input-area">
      <textarea
        v-model="inputText"
        @keydown.enter.exact.prevent="sendMessage"
        placeholder="描述你想要创建的3D模型..."
        rows="2"
      ></textarea>
      <button @click="sendMessage" :disabled="!inputText.trim() || isLoading">
        发送
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useSceneStore } from '../stores/scene'
import { sendChat } from '../services/api'
import { commandEngine } from '../services/CommandEngine'

const sceneStore = useSceneStore()
const inputText = ref('')
const messagesContainer = ref(null)

const messages = computed(() => sceneStore.messages)
const isLoading = computed(() => sceneStore.isLoading)

watch(messages, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  }, { deep: true })
})

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isLoading.value) return

  sceneStore.addMessage({ role: 'user', content: text })
  inputText.value = ''
  sceneStore.isLoading = true

  try {
    const sceneContext = sceneStore.getSceneContext()
    const result = await sendChat(text, sceneContext, sceneStore.sessionId)

    if (result.command) {
      const mesh = commandEngine.execute(result.command, (m) => {
        sceneStore.addObject({
          type: m.shape,
          shape: m.shape,
          params: m.params,
          transform: m.transform,
          material: m.material,
          description: m.description
        })
      })

      sceneStore.addMessage({
        role: 'assistant',
        content: result.description || `已创建 ${result.command.shape}`
      })
    } else {
      sceneStore.addMessage({
        role: 'assistant',
        content: result.description || '无法理解您的描述，请尝试更具体的描述'
      })
    }
  } catch (error) {
    sceneStore.addMessage({
      role: 'assistant',
      content: `错误: ${error.message}`
    })
  } finally {
    sceneStore.isLoading = false
  }
}

function clearChat() {
  sceneStore.messages = []
}
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #fff;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.chat-header h3 {
  font-size: 14px;
  font-weight: 500;
}

.btn-clear {
  padding: 4px 12px;
  font-size: 12px;
  background: #333;
  border: none;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
}

.btn-clear:hover {
  background: #444;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message {
  margin-bottom: 16px;
  max-width: 85%;
}

.message.user {
  margin-left: auto;
}

.message.assistant {
  margin-right: auto;
}

.message-content {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.message.user .message-content {
  background: #4a90d9;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-content {
  background: #2d2d2d;
  color: #fff;
  border-bottom-left-radius: 4px;
}

.message-time {
  font-size: 10px;
  color: #666;
  margin-top: 4px;
}

.message.user .message-time {
  text-align: right;
}

.message.loading .message-content {
  background: #2d2d2d;
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #333;
}

.input-area textarea {
  flex: 1;
  padding: 10px 12px;
  font-size: 14px;
  background: #2d2d2d;
  border: 1px solid #444;
  color: #fff;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
}

.input-area textarea:focus {
  outline: none;
  border-color: #4a90d9;
}

.input-area button {
  padding: 10px 20px;
  font-size: 14px;
  background: #4a90d9;
  border: none;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  align-self: flex-end;
}

.input-area button:disabled {
  background: #444;
  cursor: not-allowed;
}

.input-area button:hover:not(:disabled) {
  background: #3a7bc8;
}
</style>