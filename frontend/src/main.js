import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { commandEngine } from './services/CommandEngine'

async function bootstrap() {
  // Initialize OpenCASCADE.js
  await commandEngine.init()

  const app = createApp(App)
  app.use(createPinia())
  app.mount('#app')
}

bootstrap().catch(console.error)