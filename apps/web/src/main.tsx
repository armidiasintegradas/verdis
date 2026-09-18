import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/ui/styles/tokens.css'
import '@/ui/styles/globals.css'
import '@/features/m1/m1-pages.css'
import { App } from './app/app'
import { Providers } from './app/providers'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element #root was not found')
}

createRoot(root).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`
    navigator.serviceWorker.register(swUrl).catch(() => {})
  })
}
