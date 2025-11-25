import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import Audience from './pages/Audience'
import Admin from './pages/Admin'
import './index.css'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/dj', element: <Dashboard /> },
  { path: '/s/:slug', element: <Audience /> },
  { path: '/admin', element: <Admin /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
