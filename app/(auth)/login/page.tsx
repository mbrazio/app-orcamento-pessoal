'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wallet } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Insira um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    setErrorMsg(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        if (error.status === 401 || error.status === 403 || error.message.includes('credentials')) {
          setErrorMsg('E-mail ou senha incorretos.')
        } else {
          setErrorMsg('Falha na autenticação. Verifique suas credenciais.')
        }
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setErrorMsg('Ocorreu um erro ao tentar entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-violet-950/20 via-background to-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/65 p-8 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground select-none">FinanceFlow</h1>
          <p className="text-sm text-muted-foreground select-none">
            Entre na sua conta para gerenciar seu orçamento pessoal.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            placeholder="seuemail@exemplo.com"
            disabled={loading}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            disabled={loading}
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" className="w-full" loading={loading}>
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground select-none">
          Não tem uma conta?{' '}
          <Link href="/cadastro" className="font-semibold text-primary hover:underline">
            Cadastre-se grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
