# AutoFilm Manager — Contexto do Projeto

## O que é
Sistema de gestão para estética automotiva especializada em Insulfilm, Envelopamento e PPF (Paint Protection Film). Cliente: Alisson Películas e Envelopamentos — Barão do Amazonas, 1681, Partenon, Porto Alegre. Usuário único (o próprio profissional Alisson). Existe também um Portal do Cliente — área pública sem login para agendamentos.

## Stack
- React 18 + Vite + TypeScript
- Tailwind CSS v3
- Supabase (banco de dados PostgreSQL + Auth + Storage)
- Zustand (estado global)
- React Router DOM v6
- lucide-react (ícones)
- jspdf + html2canvas (geração de PDF do certificado)
- date-fns (manipulação de datas)

## Identidade Visual — Alisson Películas
- Fundo principal: #0D0D0D (preto profundo)
- Vermelho principal: #CC0000
- Vermelho hover/destaque: #E60000
- Dourado/amarelo destaque: #D4A017
- Texto claro: #F0F0F0
- Cards e painéis: #1A1A1A
- Bordas sutis: #2A2A2A
- Estética: esportiva, agressiva, dark — inspirada em performance automotiva
- Fonte de título: Rajdhani (Google Fonts) — bold, estilo automotivo
- Fonte de corpo: Inter (Google Fonts) — legível e moderna
- Elementos visuais: usar bordas com acento vermelho à esquerda nos cards, ícones brancos, badges vermelhos
- Botão primário: fundo #CC0000, texto branco, hover #E60000
- Botão secundário: outline vermelho, texto #CC0000
- Em todos os títulos e headers usar fonte Rajdhani bold
- Cards sempre com borda esquerda vermelha (#CC0000) de 3px
- Sidebar com fundo #111111 e item ativo destacado em vermelho

## Estrutura de Rotas
- /login → LoginPage
- /dashboard → DashboardPage (protegida)
- /agendamentos → AgendamentosPage (protegida)
- /agendamentos/novo → NovoAgendamentoPage (protegida)
- /checklist/:servicoId → ChecklistPage (protegida)
- /servico/:servicoId → ExecucaoServicoPage (protegida)
- /clientes → ClientesPage (protegida)
- /clientes/:clienteId → ClienteDetailPage (protegida)
- /estoque → EstoquePage (protegida)
- /certificado/:servicoId → CertificadoPage (protegida)
- /agendar/:slug → PortalClientePage (PÚBLICA, sem login)

## Banco de Dados
Tabelas: clientes, veiculos, servicos, itens_servico, estoque, checklists, agendamentos

## Regras importantes
- SEMPRE use TypeScript com tipos definidos
- SEMPRE use Tailwind para estilização (sem CSS externo)
- Componentes reutilizáveis ficam em /src/components/ui/
- Páginas ficam em /src/pages/
- Tipos TypeScript ficam em /src/types/
- Store Zustand fica em /src/store/
- Cliente Supabase fica em /src/lib/supabase.ts
- NUNCA use any no TypeScript
