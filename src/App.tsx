// src/App.tsx
import { useEffect, useState } from 'react'
import DashboardLayout from './components/dashboard-layout'
import LoginPage from './components/login-page'
import { getAccessToken, getRefreshToken, getUser } from '@/lib/auth-storage'
import { refreshAccessToken } from '@/lib/services/auth'
import { Toaster } from 'sonner'
import { getGeneralSettings } from '@/lib/services/common'
import { useI18n } from '@/i18n'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const { lang } = useI18n()

  // Rehydrate auth state on app load. If we have an access token or user in storage,
  // consider the user logged in. If only a refresh token exists, try a silent refresh.
  useEffect(() => {
    const hasAccess = !!getAccessToken()
    const hasUser = !!getUser()
    const hasRefresh = !!getRefreshToken()

    if (hasAccess || hasUser) {
      setIsLoggedIn(true)
      setHydrated(true)
      return
    }

    if (!hasAccess && hasRefresh) {
      ;(async () => {
        const refreshed = await refreshAccessToken()
        setIsLoggedIn(!!refreshed)
        setHydrated(true)
      })()
    } else {
      setHydrated(true)
    }
  }, [])

  // Load general settings (app_name, app_description) to set document title and meta description
  // Re-run when language changes so metadata reflects the selected locale
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { app_name, app_description } = await getGeneralSettings()
        if (!mounted) return
        if (app_name) {
          document.title = app_name
        }
        if (app_description) {
          let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
          if (!meta) {
            meta = document.createElement('meta')
            meta.setAttribute('name', 'description')
            document.head.appendChild(meta)
          }
          meta.setAttribute('content', app_description)
        }
      } catch (err) {
        // Non-blocking; ignore errors loading settings
        // console.warn('Failed to load general settings', err)
      }
    })()
    return () => { mounted = false }
  }, [lang])

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
  }

  // Avoid flashing login screen before we rehydrate
  if (!hydrated) return <div className="app" />

  return (
    <div className="app">
      {isLoggedIn ? (
        <DashboardLayout onLogout={handleLogout} />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
      <Toaster richColors position="top-right" closeButton />
    </div>
  )
}

export default App
