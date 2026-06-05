-- Migration 001: Schema inicial
-- Criação de todas as tabelas, RLS e policies

-- Habilitar UUID
create extension if not exists "uuid-ossp";

-- Entradas de renda
create table incomes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  amount numeric(12,2) not null,
  day_of_month integer not null,
  month integer,
  year integer,
  is_recurring boolean not null default false,
  notes text,
  created_at timestamptz default now()
);

-- Cartões de crédito
create table credit_cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  last_digits char(4),
  closing_day integer not null,
  due_day integer not null,
  color text not null default '#6366f1',
  card_limit numeric(12,2),
  created_at timestamptz default now()
);

-- Gastos / transações
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  parent_id uuid references expenses(id) on delete cascade,
  description text not null,
  total_amount numeric(12,2) not null,
  card_id uuid references credit_cards(id) on delete set null,
  category text not null default 'outros',
  type text not null check (type in ('cash', 'installment', 'recurring')),
  total_installments integer,
  current_installment integer,
  installment_amount numeric(12,2),
  recurring_day integer,
  purchase_date date not null,
  billing_month integer not null,
  billing_year integer not null,
  is_shared boolean default false,
  shared_with text,
  shared_amount numeric(12,2),
  is_simulation boolean default false,
  is_paid boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- Metas de poupança
create table savings_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0,
  target_date date,
  color text not null default '#10b981',
  icon text,
  created_at timestamptz default now()
);

-- Histórico de depósitos nas metas
create table savings_deposits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_id uuid references savings_goals(id) on delete cascade not null,
  amount numeric(12,2) not null,
  note text,
  deposited_at timestamptz default now()
);

-- Faturas pagas por mês
create table card_invoices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  card_id uuid references credit_cards(id) on delete cascade not null,
  month integer not null,
  year integer not null,
  is_paid boolean default false,
  paid_at timestamptz,
  unique(card_id, month, year)
);

-- Row Level Security
alter table incomes enable row level security;
alter table credit_cards enable row level security;
alter table expenses enable row level security;
alter table savings_goals enable row level security;
alter table savings_deposits enable row level security;
alter table card_invoices enable row level security;

create policy "users own incomes"         on incomes         for all using (auth.uid() = user_id);
create policy "users own cards"           on credit_cards    for all using (auth.uid() = user_id);
create policy "users own expenses"        on expenses        for all using (auth.uid() = user_id);
create policy "users own savings_goals"   on savings_goals   for all using (auth.uid() = user_id);
create policy "users own savings_deposits" on savings_deposits for all using (auth.uid() = user_id);
create policy "users own card_invoices"   on card_invoices   for all using (auth.uid() = user_id);
