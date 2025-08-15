import { useEffect, useState } from 'react'
import DashboardLayout from './components/dashboard-layout'
import LoginPage from './components/login-page'
import { getAccessToken, getRefreshToken, getUser } from '@/lib/auth-storage'
import { refreshAccessToken } from '@/lib/services/auth'
import { Toaster } from 'sonner'
import { getGeneralSettings } from '@/lib/services/common'
import { useI18n } from '@/i18n'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom' // <- solo Routes/Route/Navigate

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const { lang } = useI18n()
  const navigate = useNavigate()

  // Rehydrate auth state on app load.
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const access = getAccessToken()
        const user = getUser()
        const refresh = getRefreshToken()

        // DEBUG (borra en producción)
        // eslint-disable-next-line no-console
        console.log('[rehydrate] access:', !!access, 'user:', !!user, 'refresh:', !!refresh)

        if (access && user) {
          if (!mounted) return
          setIsLoggedIn(true)
          setHydrated(true)
          return
        }

        if (!access && refresh) {
          // eslint-disable-next-line no-console
          console.log('[rehydrate] trying silent refresh...')
          const refreshed = await refreshAccessToken()
          if (!mounted) return
          setIsLoggedIn(!!refreshed)
          setHydrated(true)
          return
        }

        if (mounted) {
          setIsLoggedIn(false)
          setHydrated(true)
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[rehydrate] error while checking auth:', err)
        if (mounted) {
          setIsLoggedIn(false)
          setHydrated(true)
        }
      }
    })()
    return () => { mounted = false }
  }, [])

  // Load app settings (title, description)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { app_name, app_description } = await getGeneralSettings()
        if (!mounted) return
        if (app_name) document.title = app_name
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
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [lang])

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
    // Navegación simple: al iniciar sesión vamos a /dashboard
    navigate('/dashboard')
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    navigate('/login')
  }

  if (!hydrated) return <div className="app" />

  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />

        <Route
          path="/dashboard/*"
          element={
            isLoggedIn ? <DashboardLayout onLogout={handleLogout} /> : <Navigate to="/login" replace />
          }
        />

        <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster richColors position="top-right" closeButton />
    </div>
  )
}

export default App
