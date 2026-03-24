import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Agendamento, Configuracoes, Estoque, Servico } from '../types'

// ─────────────────────────────────────────────
// Auth slice
// ─────────────────────────────────────────────
interface AuthSlice {
  session: Session | null
  user: User | null
  authLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setSession: (session: Session | null) => void
}

// ─────────────────────────────────────────────
// Global slice
// ─────────────────────────────────────────────
interface GlobalSlice {
  agendamentosHoje: Agendamento[]
  loadingAgendamentos: boolean
  estoqueAlertas: Estoque[]
  servicoEmAndamento: Servico | null
  configuracoes: Configuracoes | null
  fetchAgendamentosHoje: () => Promise<void>
  fetchEstoqueAlertas: () => Promise<void>
  setServicoEmAndamento: (servico: Servico | null) => void
  fetchConfiguracoes: () => Promise<void>
}

type AppStore = AuthSlice & GlobalSlice

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────
export const useAppStore = create<AppStore>((set) => ({
  // ── Auth ──────────────────────────────────
  session: null,
  user: null,
  authLoading: true,

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    set({ session: data.session, user: data.user })
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null })
  },

  setSession: (session) => {
    set({ session, user: session?.user ?? null, authLoading: false })
  },

  // ── Global ────────────────────────────────
  agendamentosHoje: [],
  loadingAgendamentos: false,
  estoqueAlertas: [],
  servicoEmAndamento: null,
  configuracoes: null,

  fetchAgendamentosHoje: async () => {
    set({ loadingAgendamentos: true })
    try {
      const hoje = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('data_solicitada', hoje)
        .order('hora_preferencial', { ascending: true })
      if (error) throw error
      set({ agendamentosHoje: (data ?? []) as Agendamento[] })
    } finally {
      set({ loadingAgendamentos: false })
    }
  },

  fetchEstoqueAlertas: async () => {
    // Busca bobinas ativas e filtra client-side onde metros_restantes <= alerta_metros
    // (PostgREST não suporta comparação coluna-a-coluna via JS client)
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .eq('status', 'ativa')
      .order('metros_restantes', { ascending: true })
    if (error) return
    const alertas = (data ?? [] as Estoque[]).filter(
      (b) => b.metros_restantes <= b.alerta_metros
    )
    set({ estoqueAlertas: alertas })
  },

  setServicoEmAndamento: (servico) => {
    set({ servicoEmAndamento: servico })
  },

  fetchConfiguracoes: async () => {
    const { data } = await supabase
      .from('configuracoes')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (data) set({ configuracoes: data as Configuracoes })
  },
}))

// ─────────────────────────────────────────────
// Selectors (evitam re-renders desnecessários)
// ─────────────────────────────────────────────
export const selectUser               = (s: AppStore) => s.user
export const selectSession            = (s: AppStore) => s.session
export const selectAuthLoading        = (s: AppStore) => s.authLoading
export const selectAgendamentosHoje   = (s: AppStore) => s.agendamentosHoje
export const selectLoadingAgendamentos = (s: AppStore) => s.loadingAgendamentos
export const selectEstoqueAlertas     = (s: AppStore) => s.estoqueAlertas
export const selectServicoEmAndamento  = (s: AppStore) => s.servicoEmAndamento
export const selectConfiguracoes       = (s: AppStore) => s.configuracoes
