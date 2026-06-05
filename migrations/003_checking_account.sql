-- Migration 003: Conta Corrente
--
-- Três tabelas para suportar a tela de Conta Corrente:
--   1. recurring_payments  → marca gastos fixos como pagos por mês
--   2. checking_simulations → lançamentos simulados por mês
--   3. user_settings        → configurações do usuário (ex: saldo inicial)

-- 1. Pagamentos de gastos fixos por mês
create table if not exists recurring_payments (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  expense_id uuid references expenses(id)   on delete cascade not null,
  month      integer not null,
  year       integer not null,
  created_at timestamptz default now(),
  unique(user_id, expense_id, month, year)
);

-- 2. Simulações de lançamentos por mês
create table if not exists checking_simulations (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  month       integer not null,
  year        integer not null,
  day         integer not null,
  description text not null,
  amount      numeric(12,2) not null,
  is_income   boolean not null default false,
  created_at  timestamptz default now()
);

-- 3. Configurações do usuário (chave-valor)
create table if not exists user_settings (
  user_id uuid references auth.users(id) on delete cascade not null,
  key     text not null,
  value   text not null,
  primary key (user_id, key)
);

-- RLS
alter table recurring_payments    enable row level security;
alter table checking_simulations  enable row level security;
alter table user_settings         enable row level security;

create policy "users own recurring_payments"   on recurring_payments   for all using (auth.uid() = user_id);
create policy "users own checking_simulations" on checking_simulations for all using (auth.uid() = user_id);
create policy "users own user_settings"        on user_settings        for all using (auth.uid() = user_id);
