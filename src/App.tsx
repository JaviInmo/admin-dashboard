// src/App.tsx
import { useEffect, useState } from 'react'
import DashboardLayout from './components/dashboard-layout'
import LoginPage from './components/login-page'
import { getAccessToken, getRefreshToken, getUser } from '@/lib/auth-storage'
import { refreshAccessToken } from '@/lib/services/auth'
import { Toaster } from 'sonner'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hydrated, setHydrated] = useState(false)

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
