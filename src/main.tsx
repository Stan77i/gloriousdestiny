import './lib/compat'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { suivreSysteme } from './features/theme/theme'
import './index.css'

const racine = document.getElementById('root')
if (!racine) throw new Error('Élément #root introuvable dans index.html')

// Préférence « système » : suit le passage clair / sombre de l'appareil en direct.
suivreSysteme()

// Le site démarre : index.html n'affichera pas le message « navigateur trop ancien ».
const page = window as Window & { gdPret?: boolean; gdDemarre?: () => void }
page.gdPret = true
page.gdDemarre?.()

createRoot(racine).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
