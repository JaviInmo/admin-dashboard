// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import { LanguageProvider } from './i18n'
import { Providers } from './providers'
import { router } from './routes/AppRouter'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <Providers>
        <RouterProvider router={router} />
        <App />
      </Providers>
    </LanguageProvider>
  </React.StrictMode>
)
