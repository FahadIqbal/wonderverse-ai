import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startSessionPersistence } from './features/session'

// Restore saved progress (if any) before the first render, then keep saving. Guest data stays in this browser.
startSessionPersistence()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
