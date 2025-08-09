// src/App.tsx
import { useState } from 'react'
import DashboardLayout from './components/dashboard-layout'
import LoginPage from './components/login-page'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
  }

  return (
    <div className="app">
      {isLoggedIn ? (
        <DashboardLayout />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  )
}

export default App
