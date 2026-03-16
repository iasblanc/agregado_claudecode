# CHANGELOG — Agregado Pro

All notable changes to this project are documented in this file.
This project follows the [Engineering Versioning & Checkpoint Playbook](./PLAYBOOK.md).

---

## v0.4.0 — Checkpoint: Marketplace & Vagas

**Date:** 2026-03-16

### Features
- Marketplace completo de vagas para agregados
- Criação, edição, duplicação e pausa de vagas pela transportadora
- Candidaturas: envio, visualização e gestão de status
- Contratos de motorista (contratos_motorista) com timeline e ocorrências
- Equipe da transportadora (equipe_transportadora) com roles e status
- Simulação financeira no detalhe da vaga (estimativa mensal de receita)
- Portal público de vagas ativas (/vagas/[id])
- Logo no footer público
- Seed de demonstração com vagas e membros de equipe

### Database Migrations
- `supabase/migrations/20260316_vagas_v2.sql`
  - Novos campos em vagas (uf_origem, uf_destino, tipo_carga, vagas_abertas, etc.)
  - Status "pausada" para vagas
  - Tabela equipe_transportadora com RLS
  - Tabela contratos_motorista com RLS
  - Atualização de constraint de status das candidaturas

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Rollback
- Revert to tag `v0.3.0`
- Restore schema snapshot before migrations in `supabase/migrations/20260316_vagas_v2.sql`

---

## v0.3.0 — Checkpoint: Dashboard Working

**Date:** 2026-02-01

### Features
- Dashboard do agregado (motorista/dono de frota)
- Dashboard da transportadora
- Dashboard administrativo
- Calculadora de custo por km (custo-km)
- Gestão de negócio (gestao-negocio)
- Cadastro de veículos, equipamentos e motoristas
- Calculadora admin com benchmarks de veículos (calc_veiculos, calc_constantes)
- Minhas candidaturas para agregados
- Avaliações entre agregados e transportadoras
- Gestão de conta da transportadora

### Database Migrations
- `supabase/migrations/20260101_initial_schema.sql`
  - Tabelas: custo_km_config, transacoes, contratos, avaliacoes
  - Tabelas calculadora: calc_veiculos, calc_constantes com RLS

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Rollback
- Revert to tag `v0.2.0`

---

## v0.2.0 — Checkpoint: Authentication Stable

**Date:** 2026-01-15

### Features
- Sistema de login (/auth/login)
- Registro de usuários (/auth/register) com tipo: agregado | transportadora
- Callback OAuth (/auth/callback)
- Middleware de proteção de rotas
- Auto-criação de perfil via trigger `handle_new_user`
- Row Level Security em todas as tabelas

### Database Migrations
- `supabase/migrations/20260101_initial_schema.sql`
  - Tabela profiles (extende auth.users)
  - Tabela transportadoras
  - Tabela agregados
  - Tabela veiculos
  - Tabela equipamentos
  - Tabela motoristas
  - RLS policies para todas as tabelas
  - Trigger on_auth_user_created

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Rollback
- Revert to tag `v0.1.0`

---

## v0.1.0 — Checkpoint: Foundation

**Date:** 2026-01-01

### Features
- Setup Next.js 16 com App Router
- Configuração TypeScript 5.9.3
- Tailwind CSS v4
- Integração Supabase (@supabase/supabase-js, @supabase/ssr)
- Estrutura de diretórios: /app, /components/ui, /lib
- Componentes UI base: Button, Card, Input, Badge, Modal
- Utilitários: supabase.ts, supabase-server.ts, types.ts
- Configuração do projeto (next.config.ts, tsconfig.json)

### Database Migrations
- `supabase/migrations/20260101_initial_schema.sql` (schema base)

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Rollback
- Estado inicial do projeto — não há versão anterior
