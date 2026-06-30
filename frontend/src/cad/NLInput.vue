<template>
  <div class="nl-input-panel">
    <div class="messages" ref="messagesContainer">
      <div
        v-for="msg in cadStore.messages"
        :key="msg.id"
        :class="['message', msg.role]"
      >
        <div class="message-content">{{ msg.content }}</div>
        <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
      </div>
      <div v-if="cadStore.isLoading" class="message assistant loading">
        <div class="message-content">AI 正在生成模型代码...</div>
      </div>
    </div>

    <div class="code-preview" v-if="cadStore.generatedCode">
      <div class="code-header">
        <span>生成的代码</span>
        <button @click="rerunCode" :disabled="!canRun">重新运行</button>
      </div>
      <textarea v-model="cadStore.generatedCode" rows="8" spellcheck="false" />
    </div>

    <div class="input-area">
      <textarea
        v-model="inputText"
        @keydown.enter.exact.prevent="sendMessage"
        placeholder="描述你想要创建的3D模型，例如：画一台台灯..."
        rows="2"
      />
      <button @click="sendMessage" :disabled="!inputText.trim() || cadStore.isLoading || !canRun">
        发送
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useCadStore } from './cadStore'
import { sendChat } from './api'

const cadStore = useCadStore()
const inputText = ref('')
const messagesContainer = ref(null)

const canRun = computed(() => {
  return cadStore.engine && cadStore.engine.isReady
})

watch(() => cadStore.messages, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}, { deep: true })

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function runGeneratedCode(code) {
  if (!cadStore.engine || !cadStore.engine.isReady) {
    cadStore.setError('CAD 引擎尚未准备好')
    return
  }

  cadStore.setLoading(true)
  try {
    const result = await cadStore.engine.evaluate(code)
    if (result.meshData) {
      cadStore.setMeshData(result.meshData)
    }
  } catch (error) {
    console.error('Code execution failed:', error)
    cadStore.setError(`代码执行失败: ${error.message || error}`)
  } finally {
    cadStore.setLoading(false)
  }
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || cadStore.isLoading || !canRun.value) return

  cadStore.addMessage('user', text)
  inputText.value = ''
  cadStore.setLoading(true)

  try {
    const result = await sendChat(text, cadStore.getSceneContext(), cadStore.sessionId, 'cascade')

    if (result.code) {
      cadStore.setGeneratedCode(result.code)
      cadStore.addMessage('assistant', result.description || '已生成建模代码')
      await runGeneratedCode(result.code)
    } else if (result.commands && result.commands.length > 0) {
      cadStore.addMessage('assistant', result.description || '后端返回了旧格式命令，当前 UI 不支持渲染')
    } else {
      cadStore.addMessage('assistant', result.description || '无法理解您的描述，请尝试更具体的描述')
    }
  } catch (error) {
    console.error('Chat failed:', error)
    cadStore.setError(`请求失败: ${error.message || error}`)
    cadStore.addMessage('assistant', `错误: ${error.message || error}`)
  } finally {
    cadStore.setLoading(false)
  }
}

async function rerunCode() {
  if (!cadStore.generatedCode) return
  await runGeneratedCode(cadStore.generatedCode)
}
</script>

<style scoped>
.nl-input-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #fff;
  width: 360px;
  border-left: 1px solid #333;
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

.code-preview {
  border-top: 1px solid #333;
  padding: 12px;
  display: flex;
  flex-direction: column;
  max-height: 240px;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #aaa;
}

.code-header button {
  padding: 4px 10px;
  font-size: 12px;
  background: #4a90d9;
  border: none;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
}

.code-header button:disabled {
  background: #444;
  cursor: not-allowed;
}

.code-preview textarea {
  flex: 1;
  background: #111;
  color: #d4d4d4;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 10px;
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 12px;
  resize: none;
  outline: none;
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 12px;
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
