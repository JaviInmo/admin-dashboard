
import './App.css'

"use client" // Asegúrate de que esta línea esté al principio del archivo

import { useState } from 'react' // Importa useState
import DashboardLayout from "../src/components/Dashboard/dashboard-content"
import LoginPage from "../src/components/login-page"

export default function Page() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
  }

  return (
    <div>
      {isLoggedIn ? (
        <DashboardLayout />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  )
}
