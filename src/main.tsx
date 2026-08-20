import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { AdminPage } from './pages/AdminPage'
import { DisplayPage } from './pages/DisplayPage'

const App = window.location.pathname === '/admin' ? AdminPage : DisplayPage
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
