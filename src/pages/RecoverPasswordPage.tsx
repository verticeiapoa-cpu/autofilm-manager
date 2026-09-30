import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { supabase } from '../lib/supabase'

export function RecoverPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      })
      if (resetError) throw resetError
      setSent(true)
    } catch {
      setError('Não foi possível solicitar o e-mail agora. Tente novamente em alguns minutos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell>
      <h2 className="font-heading font-semibold text-xl text-brand-text">Recuperar senha</h2>
      {sent ? (
        <div className="mt-4 space-y-5" role="status" aria-live="polite">
          <p className="text-sm text-brand-muted font-sora">
            Se houver uma conta com esse e-mail, enviaremos um link para criar uma nova senha. Confira também a pasta de spam.
          </p>
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-brand-gold hover:underline font-sora">
            <ArrowLeft size={15} /> Voltar ao login
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-brand-muted font-sora">
            Informe o e-mail usado no aplicativo. Enviaremos um link para você cadastrar outra senha.
          </p>
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              icon={<Mail size={15} />}
              autoComplete="email"
              required
            />
            {error && <p className="text-xs text-red-400 font-sora" role="alert">{error}</p>}
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Enviar link de recuperação
            </Button>
          </form>
          <Link to="/login" className="mt-5 inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-gold font-sora">
            <ArrowLeft size={15} /> Voltar ao login
          </Link>
        </>
      )}
    </AuthPageShell>
  )
}

function AuthPageShell({ children }: { children: React.ReactNode }) {
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
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-8">{children}</div>
        <p className="text-center text-brand-muted/50 text-xs font-sora mt-6">
          Alisson Películas e Envelopamentos · Porto Alegre
        </p>
      </section>
    </main>
  )
}
