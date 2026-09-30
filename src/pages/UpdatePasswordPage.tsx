import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { supabase } from '../lib/supabase'

export function UpdatePasswordPage() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) setReady(Boolean(data.session))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirmation) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Não foi possível atualizar a senha. Solicite um novo link de recuperação e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div aria-hidden className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[480px] h-[480px] rounded-full bg-brand-gold/5 blur-[120px]" />
      </div>
      <section className="relative w-full max-w-sm">
        <header className="text-center mb-8">
          <h1 className="font-heading font-bold text-3xl tracking-[0.18em] uppercase text-brand-gold">AutoFilm Manager</h1>
          <p className="text-brand-muted text-sm mt-2 font-sora">Gestão Profissional de Películas</p>
        </header>
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-8">
          <h2 className="font-heading font-semibold text-xl text-brand-text">Criar nova senha</h2>
          {!ready ? (
            <div className="mt-4 space-y-5">
              <p className="text-sm text-brand-muted font-sora">
                O link expirou ou já foi usado. Solicite outro para continuar.
              </p>
              <Link to="/recuperar-senha" className="inline-flex items-center gap-2 text-sm text-brand-gold hover:underline font-sora">
                <ArrowLeft size={15} /> Solicitar novo link
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-brand-muted font-sora">Escolha uma senha com pelo menos 8 caracteres.</p>
              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
                <Input
                  label="Nova senha"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  icon={<Lock size={15} />}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <Input
                  label="Confirmar nova senha"
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  icon={<Lock size={15} />}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                {error && <p className="text-xs text-red-400 font-sora" role="alert">{error}</p>}
                <Button type="submit" size="lg" loading={loading} className="w-full">
                  Salvar nova senha
                </Button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-brand-muted/50 text-xs font-sora mt-6">
          Alisson Películas e Envelopamentos · Porto Alegre
        </p>
      </section>
    </main>
  )
}
