import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { OpenGeometry } from 'opengeometry'
import App from './App.vue'

async function bootstrap() {
  await OpenGeometry.create({
    wasmURL: '/opengeometry_bg.wasm'
  })

  const app = createApp(App)
  app.use(createPinia())
  app.mount('#app')
}

bootstrap()