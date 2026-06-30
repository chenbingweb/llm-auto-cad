<template>
  <div class="app">
    <div class="viewport">
      <CascadeHost />
    </div>
    <NLInput />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useCadStore } from './cad/cadStore'
import { createSession } from './cad/api'
import CascadeHost from './cad/CascadeHost.vue'
import NLInput from './cad/NLInput.vue'

const cadStore = useCadStore()

onMounted(async () => {
  try {
    const sessionId = await createSession()
    cadStore.setSessionId(sessionId)
  } catch (error) {
    console.error('Failed to create session:', error)
    cadStore.setError('无法创建会话')
  }
})
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

.viewport {
  flex: 1;
  height: 100%;
  overflow: hidden;
}
</style>
