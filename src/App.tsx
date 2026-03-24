import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAppStore } from './store'
import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { AgendamentosPage } from './pages/AgendamentosPage'
import { NovoAgendamentoPage } from './pages/NovoAgendamentoPage'
import { ChecklistPage } from './pages/ChecklistPage'
import { ExecucaoServicoPage } from './pages/ExecucaoServicoPage'
import { ClientesPage } from './pages/ClientesPage'
import { ClienteDetailPage } from './pages/ClienteDetailPage'
import { EstoquePage } from './pages/EstoquePage'
import { CertificadoPage } from './pages/CertificadoPage'
import { PortalClientePage } from './pages/PortalClientePage'
import { ConfiguracoesPage } from './pages/ConfiguracoesPage'
import { TabelaPrecosPage } from './pages/TabelaPrecosPage'
import { RelatoriosPage } from './pages/RelatoriosPage'
import { GarantiasPage } from './pages/GarantiasPage'

export default function App() {
  const setSession = useAppStore((s) => s.setSession)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [setSession])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/agendar/:slug" element={<PortalClientePage />} />

        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/agendamentos" element={<AgendamentosPage />} />
          <Route path="/agendamentos/novo" element={<NovoAgendamentoPage />} />
          <Route path="/checklist/:servicoId" element={<ChecklistPage />} />
          <Route path="/servico/:servicoId" element={<ExecucaoServicoPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/:clienteId" element={<ClienteDetailPage />} />
          <Route path="/estoque" element={<EstoquePage />} />
          <Route path="/certificado/:servicoId" element={<CertificadoPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/precos" element={<TabelaPrecosPage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
          <Route path="/garantias" element={<GarantiasPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
