import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AppProvider } from './context/AppContext'
import { PublicHandoverPage } from './components/traceability/PublicHandoverPage'
import { I18nProvider } from './i18n/I18nContext'

const handoverRoute = window.location.pathname.match(/^\/verify\/([^/]+)\/?$/)
const application = handoverRoute
  ? <PublicHandoverPage handoverId={decodeURIComponent(handoverRoute[1])} />
  : <I18nProvider><AppProvider><App /></AppProvider></I18nProvider>

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {application}
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Offline app shell is unavailable:', error)); });
}
