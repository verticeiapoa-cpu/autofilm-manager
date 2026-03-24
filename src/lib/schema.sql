CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE clientes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  cpf TEXT,
  data_cadastro DATE DEFAULT CURRENT_DATE,
  origem TEXT DEFAULT 'direto',
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE veiculos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano INTEGER,
  cor TEXT,
  placa TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE estoque (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('solar', 'ppf')),
  marca TEXT NOT NULL,
  serie TEXT,
  largura_cm DECIMAL(6,2) DEFAULT 152,
  metros_totais DECIMAL(8,2) NOT NULL,
  metros_usados DECIMAL(8,2) DEFAULT 0,
  metros_restantes DECIMAL(8,2) GENERATED ALWAYS AS (metros_totais - metros_usados) STORED,
  alerta_metros DECIMAL(6,2) DEFAULT 2.0,
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'esgotada', 'reservada')),
  data_compra DATE,
  custo_total DECIMAL(10,2),
  fornecedor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE servicos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  veiculo_id UUID REFERENCES veiculos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('solar', 'ppf', 'ambos')),
  status TEXT DEFAULT 'agendado' CHECK (status IN ('agendado', 'em_execucao', 'concluido', 'cancelado')),
  data_agendamento TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  valor_total DECIMAL(10,2),
  observacoes_tecnicas TEXT,
  garantia_meses INTEGER DEFAULT 12,
  garantia_validade DATE,
  certificado_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE itens_servico (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  servico_id UUID REFERENCES servicos(id) ON DELETE CASCADE,
  peca TEXT NOT NULL,
  tipo_aplicacao TEXT NOT NULL CHECK (tipo_aplicacao IN ('solar', 'ppf')),
  bobina_id UUID REFERENCES estoque(id),
  metros_gastos DECIMAL(6,3),
  marca_pelicula TEXT,
  serie_pelicula TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE checklists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  servico_id UUID REFERENCES servicos(id) ON DELETE CASCADE,
  data_checkin TIMESTAMPTZ DEFAULT NOW(),
  km_entrada INTEGER,
  nivel_combustivel INTEGER CHECK (nivel_combustivel BETWEEN 0 AND 100),
  estado_borrachas TEXT DEFAULT 'bom' CHECK (estado_borrachas IN ('bom', 'regular', 'ruim')),
  estado_vidros TEXT DEFAULT 'bom' CHECK (estado_vidros IN ('bom', 'trincado', 'arranhado')),
  micro_riscos_pintura TEXT DEFAULT 'nenhum' CHECK (micro_riscos_pintura IN ('nenhum', 'leve', 'moderado', 'severo')),
  observacoes_gerais TEXT,
  fotos JSONB DEFAULT '[]',
  assinatura_cliente TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agendamentos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id),
  veiculo_id UUID REFERENCES veiculos(id),
  nome_cliente TEXT,
  whatsapp_cliente TEXT,
  modelo_veiculo TEXT,
  servico_interesse TEXT CHECK (servico_interesse IN ('solar', 'ppf', 'ambos', 'consulta')),
  data_solicitada DATE,
  hora_preferencial TIME,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'reagendado', 'cancelado')),
  origem TEXT DEFAULT 'portal' CHECK (origem IN ('portal', 'whatsapp', 'telefone', 'app')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
