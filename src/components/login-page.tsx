"use client" // Asegúrate de que esta línea esté al principio del archivo

import { useState } from 'react' // Importa useState
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Define las props para el componente LoginPage
interface LoginPageProps {
  onLoginSuccess: () => void;
}

// Actualiza la definición del componente para aceptar las props
export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault() // Previene el comportamiento por defecto del formulario
    setLoading(true)

    // Lógica de verificación simple (puedes cambiar estas credenciales)
    if (email === "user@gmail.com" && password === "123456") {
      alert("Inicio de sesión exitoso!")
      onLoginSuccess() // Llama a la función de éxito de login
    } else {
      alert("Credenciales incorrectas. Intenta de nuevo.")
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>Enter your email and password to access your account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleLogin}> {/* Envuelve los inputs en un formulario y añade onSubmit */}
            <div className="grid gap-2 mb-4"> {/* Añade un margen inferior para separar */}
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {/* El botón ahora está dentro del formulario */}
            <Button type="submit" className="w-full mt-6" disabled={loading}> {/* Añade mt-6 para el margen superior */}
              {loading ? "Iniciando..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
