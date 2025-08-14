// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from './i18n'
import { Providers } from './providers'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <Providers>
          <App />
        </Providers>
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>
)
