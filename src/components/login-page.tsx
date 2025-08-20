"use client" // Asegúrate de que esta línea esté al principio del archivo

import { useState, type FormEvent } from 'react' // Importa useState y tipos
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import { login as authLogin } from '@/lib/services/auth'
import { useI18n } from '@/i18n'

// Define las props para el componente LoginPage
interface LoginPageProps {
  onLoginSuccess: () => void;
}

// Actualiza la definición del componente para aceptar las props
export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { TEXT } = useI18n()

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault() // Previene el comportamiento por defecto del formulario
    setLoading(true)
    setError(null)

    try {
      // El backend requiere `username`.
      await authLogin({ username, password })
      onLoginSuccess()
    } catch (e) {
      // Intenta mostrar el mensaje del servidor si existe
      let message: string = TEXT.login.errorDefault as string
      try {
        const anyErr = e as any
        const data = anyErr?.response?.data
        if (data) {
          if (typeof data === 'string') message = data
          else if (typeof data.detail === 'string') message = data.detail
          else if (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) message = data.non_field_errors[0]
          else if (Array.isArray(data.username) && data.username[0]) message = data.username[0]
          else if (Array.isArray(data.password) && data.password[0]) message = data.password[0]
        }
      } catch {}
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">{TEXT.login.title}</CardTitle>
          <CardDescription>{TEXT.login.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleLogin}> {/* Envuelve los inputs en un formulario y añade onSubmit */}
            <div className="grid gap-2 mb-4"> {/* Añade un margen inferior para separar */}
              <Label htmlFor="username">{TEXT.login.usernameLabel}</Label>
              <Input
                id="username"
                type="text"
                placeholder={TEXT.login.usernamePlaceholder}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{TEXT.login.passwordLabel}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  </span>
                </Button>
              </div>
            </div>
            {/* El botón ahora está dentro del formulario */}
            <Button type="submit" className="w-full mt-6" disabled={loading}> {/* Añade mt-6 para el margen superior */}
              {loading ? TEXT.login.submitting : TEXT.login.submit}
            </Button>
            {error ? (
              <p className="text-sm text-red-600 mt-2" role="alert">{error}</p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
