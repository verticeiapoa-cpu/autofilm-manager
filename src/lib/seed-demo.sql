-- =============================================================
-- SEED DE DEMONSTRAÇÃO — AutoFilm Manager
-- Execute no Supabase: SQL Editor → New Query → Cole e rode
-- =============================================================

-- ─── CLIENTES ─────────────────────────────────────────────────

INSERT INTO clientes (nome, whatsapp, email, cpf, origem, slug, data_cadastro) VALUES
  ('João Silva',      '51999991111', 'joao@email.com',   '123.456.789-00', 'instagram', 'joao-silva',      CURRENT_DATE - INTERVAL '30 days'),
  ('Maria Fernanda',  '51999992222', 'maria@email.com',  '987.654.321-00', 'indicacao', 'maria-fernanda',  CURRENT_DATE - INTERVAL '20 days'),
  ('Carlos Eduardo',  '51999993333', 'carlos@email.com', '456.789.123-00', 'google',    'carlos-eduardo',  CURRENT_DATE - INTERVAL '10 days');

-- ─── VEÍCULOS ─────────────────────────────────────────────────

INSERT INTO veiculos (cliente_id, marca, modelo, ano, cor, placa) VALUES
  ((SELECT id FROM clientes WHERE slug = 'joao-silva'),     'Toyota', 'Corolla', 2022, 'Prata',  'ABC-1234'),
  ((SELECT id FROM clientes WHERE slug = 'maria-fernanda'), 'Honda',  'HRV',     2023, 'Branco', 'DEF-5678'),
  ((SELECT id FROM clientes WHERE slug = 'carlos-eduardo'), 'Jeep',   'Compass', 2021, 'Preto',  'GHI-9012');

-- ─── ESTOQUE DE BOBINAS ───────────────────────────────────────
-- Nota: metros_restantes é coluna GERADA (metros_totais - metros_usados)
-- não incluir no INSERT

INSERT INTO estoque (nome, tipo, marca, serie, largura_cm, metros_totais, metros_usados, alerta_metros, status, data_compra, custo_total, fornecedor) VALUES
  ('3M FX Premium 70%',  'solar', '3M',    'FX Premium',   152, 50.00, 32.00, 3.00, 'ativa',   '2026-01-10', 1500.00, 'Distribuidora 3M'),
  ('Llumar AIR80',        'solar', 'Llumar','AIR80',        152, 30.00, 27.50, 3.00, 'ativa',   '2026-01-15',  900.00, 'Llumar Brasil'),
  ('Stek DYNOmatt PPF',  'ppf',   'Stek',  'DYNOmatt',    152, 20.00,  5.00, 2.00, 'ativa',   '2026-02-01', 2800.00, 'Stek Brasil'),
  ('Xpel Ultimate PPF',  'ppf',   'Xpel',  'Ultimate Plus',152, 25.00, 24.20, 2.00, 'ativa',   '2026-01-20', 3200.00, 'Xpel Brasil');

-- ─── SERVIÇOS ─────────────────────────────────────────────────

INSERT INTO servicos (veiculo_id, tipo, status, data_agendamento, data_conclusao, valor_total, observacoes_tecnicas, garantia_meses, garantia_validade) VALUES
  (
    (SELECT id FROM veiculos WHERE placa = 'ABC-1234'),
    'solar', 'concluido',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '4 days',
    450.00,
    'Para-brisa e laterais com película 3M FX Premium 70%. Sem bolhas. Vidros em ótimo estado.',
    12,
    (CURRENT_DATE + INTERVAL '12 months')::DATE
  ),
  (
    (SELECT id FROM veiculos WHERE placa = 'DEF-5678'),
    'ppf', 'concluido',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days',
    1800.00,
    'PPF aplicado no capô, para-brisa e triângulos dianteiros. Acabamento impecável.',
    24,
    (CURRENT_DATE + INTERVAL '24 months')::DATE
  ),
  (
    (SELECT id FROM veiculos WHERE placa = 'GHI-9012'),
    'ambos', 'em_execucao',
    NOW() - INTERVAL '2 hours',
    NULL,
    NULL,
    NULL,
    12,
    NULL
  );

-- ─── ITENS DOS SERVIÇOS CONCLUÍDOS ────────────────────────────

-- Serviço ABC-1234 (solar concluído)
INSERT INTO itens_servico (servico_id, peca, tipo_aplicacao, bobina_id, metros_gastos, marca_pelicula, serie_pelicula) VALUES
  (
    (SELECT s.id FROM servicos s JOIN veiculos v ON s.veiculo_id = v.id WHERE v.placa = 'ABC-1234' AND s.status = 'concluido'),
    'Para-brisa', 'solar',
    (SELECT id FROM estoque WHERE nome = '3M FX Premium 70%'),
    1.80, '3M', 'FX Premium'
  ),
  (
    (SELECT s.id FROM servicos s JOIN veiculos v ON s.veiculo_id = v.id WHERE v.placa = 'ABC-1234' AND s.status = 'concluido'),
    'Lateral Dir', 'solar',
    (SELECT id FROM estoque WHERE nome = '3M FX Premium 70%'),
    1.20, '3M', 'FX Premium'
  ),
  (
    (SELECT s.id FROM servicos s JOIN veiculos v ON s.veiculo_id = v.id WHERE v.placa = 'ABC-1234' AND s.status = 'concluido'),
    'Lateral Esq', 'solar',
    (SELECT id FROM estoque WHERE nome = '3M FX Premium 70%'),
    1.20, '3M', 'FX Premium'
  ),
  (
    (SELECT s.id FROM servicos s JOIN veiculos v ON s.veiculo_id = v.id WHERE v.placa = 'ABC-1234' AND s.status = 'concluido'),
    'Traseiro', 'solar',
    (SELECT id FROM estoque WHERE nome = '3M FX Premium 70%'),
    0.90, '3M', 'FX Premium'
  );

-- Serviço DEF-5678 (ppf concluído)
INSERT INTO itens_servico (servico_id, peca, tipo_aplicacao, bobina_id, metros_gastos, marca_pelicula, serie_pelicula) VALUES
  (
    (SELECT s.id FROM servicos s JOIN veiculos v ON s.veiculo_id = v.id WHERE v.placa = 'DEF-5678' AND s.status = 'concluido'),
    'Capô', 'ppf',
    (SELECT id FROM estoque WHERE nome = 'Stek DYNOmatt PPF'),
    1.60, 'Stek', 'DYNOmatt'
  ),
  (
    (SELECT s.id FROM servicos s JOIN veiculos v ON s.veiculo_id = v.id WHERE v.placa = 'DEF-5678' AND s.status = 'concluido'),
    'Para-brisa', 'ppf',
    (SELECT id FROM estoque WHERE nome = 'Stek DYNOmatt PPF'),
    1.80, 'Stek', 'DYNOmatt'
  ),
  (
    (SELECT s.id FROM servicos s JOIN veiculos v ON s.veiculo_id = v.id WHERE v.placa = 'DEF-5678' AND s.status = 'concluido'),
    'Triângulo Dir Diant', 'ppf',
    (SELECT id FROM estoque WHERE nome = 'Stek DYNOmatt PPF'),
    0.30, 'Stek', 'DYNOmatt'
  ),
  (
    (SELECT s.id FROM servicos s JOIN veiculos v ON s.veiculo_id = v.id WHERE v.placa = 'DEF-5678' AND s.status = 'concluido'),
    'Triângulo Esq Diant', 'ppf',
    (SELECT id FROM estoque WHERE nome = 'Stek DYNOmatt PPF'),
    0.30, 'Stek', 'DYNOmatt'
  );

-- ─── AGENDAMENTOS DO DIA ──────────────────────────────────────

INSERT INTO agendamentos (nome_cliente, whatsapp_cliente, modelo_veiculo, servico_interesse, data_solicitada, hora_preferencial, status, origem, observacoes) VALUES
  ('Pedro Augusto', '51999994444', 'VW Polo 2023',      'solar',  CURRENT_DATE, '09:00', 'confirmado', 'portal',    'Quero escurecer bastante os vidros laterais.'),
  ('Ana Beatriz',   '51999995555', 'Ford Bronco 2024',  'ppf',    CURRENT_DATE, '14:00', 'confirmado', 'whatsapp',  'Proteção completa do capô e para-brisa.');

-- ─── CHECKLIST DO SERVIÇO EM EXECUÇÃO ─────────────────────────

INSERT INTO checklists (servico_id, km_entrada, nivel_combustivel, estado_borrachas, estado_vidros, micro_riscos_pintura, observacoes_gerais) VALUES
  (
    (SELECT s.id FROM servicos s JOIN veiculos v ON s.veiculo_id = v.id WHERE v.placa = 'GHI-9012'),
    48320,
    75,
    'bom',
    'bom',
    'leve',
    'Micro-riscos leves no capô. Cliente ciente antes do serviço.'
  );
