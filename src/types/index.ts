export interface Cliente {
  id: string
  nome: string
  whatsapp: string
  email?: string
  cpf?: string
  data_cadastro: string
  origem: string
  slug?: string
  created_at: string
}

export interface Veiculo {
  id: string
  cliente_id: string
  marca: string
  modelo: string
  ano?: number
  cor?: string
  placa?: string
  created_at: string
}

export type TipoEstoque = 'solar' | 'ppf'
export type StatusEstoque = 'ativa' | 'esgotada' | 'reservada'

export interface Estoque {
  id: string
  nome: string
  tipo: TipoEstoque
  marca: string
  serie?: string
  largura_cm: number
  metros_totais: number
  metros_usados: number
  metros_restantes: number
  alerta_metros: number
  status: StatusEstoque
  data_compra?: string
  custo_total?: number
  fornecedor?: string
  created_at: string
}

export type TipoServico = 'solar' | 'ppf' | 'ambos'
export type StatusServico = 'agendado' | 'em_execucao' | 'concluido' | 'cancelado'

export interface Servico {
  id: string
  veiculo_id: string
  tipo: TipoServico
  status: StatusServico
  data_agendamento?: string
  data_conclusao?: string
  valor_total?: number
  observacoes_tecnicas?: string
  garantia_meses: number
  garantia_validade?: string
  certificado_url?: string
  created_at: string
}

export type TipoAplicacao = 'solar' | 'ppf'

export interface ItemServico {
  id: string
  servico_id: string
  peca: string
  tipo_aplicacao: TipoAplicacao
  bobina_id?: string
  metros_gastos?: number
  marca_pelicula?: string
  serie_pelicula?: string
  created_at: string
}

export type EstadoBorrachas = 'bom' | 'regular' | 'ruim'
export type EstadoVidros = 'bom' | 'trincado' | 'arranhado'
export type MicroRiscos = 'nenhum' | 'leve' | 'moderado' | 'severo'

export interface Checklist {
  id: string
  servico_id: string
  data_checkin: string
  km_entrada?: number
  nivel_combustivel?: number
  estado_borrachas: EstadoBorrachas
  estado_vidros: EstadoVidros
  micro_riscos_pintura: MicroRiscos
  observacoes_gerais?: string
  fotos: string[]
  assinatura_cliente?: string
  created_at: string
}

export type TipoPreco = 'solar' | 'ppf' | 'ambos'

export interface TabelaPreco {
  id: string
  nome: string
  tipo: TipoPreco
  peca?: string
  preco: number
  descricao?: string
  ativo: boolean
  created_at: string
}

export interface Configuracoes {
  id: string
  nome_estetica: string
  whatsapp?: string
  endereco?: string
  cnpj?: string
  logo_url?: string
  slogan?: string
  created_at: string
  updated_at: string
}

export type ServicoInteresse = 'solar' | 'ppf' | 'ambos' | 'consulta'
export type StatusAgendamento = 'pendente' | 'confirmado' | 'reagendado' | 'cancelado'
export type OrigemAgendamento = 'portal' | 'whatsapp' | 'telefone' | 'app'

export interface Agendamento {
  id: string
  cliente_id?: string
  veiculo_id?: string
  nome_cliente?: string
  whatsapp_cliente?: string
  modelo_veiculo?: string
  servico_interesse?: ServicoInteresse
  data_solicitada?: string
  hora_preferencial?: string
  status: StatusAgendamento
  origem: OrigemAgendamento
  observacoes?: string
  created_at: string
}
