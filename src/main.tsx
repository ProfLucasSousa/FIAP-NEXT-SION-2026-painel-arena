import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { AdminPage } from './pages/AdminPage'
import { CrystalLabPage } from './pages/CrystalLabPage'
import { DisplayPage } from './pages/DisplayPage'

const App = window.location.pathname === '/admin' ? AdminPage : window.location.pathname === '/crystal' ? CrystalLabPage : DisplayPage
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
