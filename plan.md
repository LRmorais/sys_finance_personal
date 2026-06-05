# Sistema de Finanças Pessoais — Prompt para Claude Code

## Objetivo

Crie um sistema completo de controle de finanças pessoais usando **React + Vite + TypeScript**, com autenticação e persistência de dados via **Supabase**.

---

## Pré-requisito: Setup do Supabase (fazer ANTES de rodar este prompt)

### 1. Criar conta e projeto

1. Acesse [supabase.com](https://supabase.com) e clique em **Start your project**
2. Faça login com GitHub ou e-mail
3. Clique em **New project**
4. Preencha:
    - **Name**: `financas-pessoais` (ou qualquer nome)
    - **Database Password**: crie uma senha forte e **anote ela**
    - **Region**: escolha `South America (São Paulo)`
5. Clique em **Create new project** e aguarde ~2 minutos

### 2. Criar as tabelas (SQL Editor)

No painel do Supabase, vá em **SQL Editor → New query** e execute o seguinte SQL:

```sql
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

-- Faturas pagas por mês (controle de pagamento de fatura)
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

-- Row Level Security: cada usuário acessa apenas seus próprios dados
alter table incomes enable row level security;
alter table credit_cards enable row level security;
alter table expenses enable row level security;
alter table savings_goals enable row level security;
alter table savings_deposits enable row level security;
alter table card_invoices enable row level security;

create policy "users own incomes" on incomes for all using (auth.uid() = user_id);
create policy "users own cards" on credit_cards for all using (auth.uid() = user_id);
create policy "users own expenses" on expenses for all using (auth.uid() = user_id);
create policy "users own savings_goals" on savings_goals for all using (auth.uid() = user_id);
create policy "users own savings_deposits" on savings_deposits for all using (auth.uid() = user_id);
create policy "users own card_invoices" on card_invoices for all using (auth.uid() = user_id);
```

### 3. Criar seu usuário

1. No painel do Supabase, vá em **Authentication → Users**
2. Clique em **Add user → Create new user**
3. Informe seu e-mail e uma senha forte
4. Clique em **Create user**

> Este será o único usuário do sistema. Não é necessário tela de registro.

### 4. Pegar as credenciais

1. No painel, vá em **Project Settings → API**
2. Copie:
    - **Project URL** (ex: `https://xyzxyz.supabase.co`)
    - **anon public key** (começa com `eyJ...`)

### 5. Criar o arquivo `.env`

Na raiz do projeto, crie um arquivo `.env` com:

```env
VITE_SUPABASE_URL=cole_aqui_o_project_url
VITE_SUPABASE_ANON_KEY=cole_aqui_a_anon_key
```

---

## Stack Técnica

- **Framework**: React 18 + Vite
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **Backend/DB**: Supabase (PostgreSQL + Auth)
- **Cliente Supabase**: `@supabase/supabase-js`
- **Gerenciamento de estado**: React Context + useReducer
- **Datas**: date-fns

Instale todas as dependências necessárias.

---

## Design e Estética

Crie uma interface com as seguintes diretrizes:

- Tema **dark** como padrão, sofisticado e moderno
- Paleta de cores: fundo escuro (`#0f0f13`), cards com `#1a1a24`, acentos em **verde-esmeralda** (`#10b981`) para valores positivos e **vermelho suave** (`#f43f5e`) para negativos
- Fonte display: **DM Serif Display** (Google Fonts) para títulos e valores monetários grandes
- Fonte corpo: **DM Sans** para textos, labels e inputs
- Sidebar de navegação lateral (colapsável em mobile)
- Cards com `border: 1px solid rgba(255,255,255,0.06)` e `backdrop-filter: blur`
- Animações suaves de entrada nos cards (CSS transition, sem libs externas)
- Totalmente responsivo (mobile-first)
- Valores monetários formatados em **BRL (R$)**

---

## Autenticação

### Tela de Login (`/login`)

- Exibida quando o usuário não está autenticado
- Campos: e-mail e senha
- Botão "Entrar"
- Não deve ter tela de cadastro (usuário já foi criado manualmente no Supabase)
- Mensagem de erro amigável para credenciais inválidas
- Após login bem-sucedido, redirecionar para `/`
- Estilo alinhado com o design dark do app — não usar layout genérico

### Sessão

- Usar `supabase.auth.getSession()` para restaurar sessão ao carregar o app
- Usar `supabase.auth.onAuthStateChange()` para reagir a login/logout
- Botão de **logout** no rodapé da sidebar
- Todas as rotas (exceto `/login`) devem ser protegidas: redirecionar para `/login` se não autenticado

---

## Cliente Supabase

Criar o arquivo `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## Modelo de Dados (TypeScript)

### Entidade: `Income` (Entrada)

```ts
interface Income {
  id: string;
  userId: string;
  name: string;           // ex: "Salário Empresa X", "MEI", "Freela"
  amount: number;
  dayOfMonth: number;     // dia do mês que cai (ex: 5)
  month: number | null;   // null se recorrente
  year: number | null;    // null se recorrente
  isRecurring: boolean;
  notes?: string;
  createdAt: string;
}
```

### Entidade: `CreditCard` (Cartão de Crédito)

```ts
interface CreditCard {
  id: string;
  userId: string;
  name: string;
  lastDigits: string;
  closingDay: number;
  dueDay: number;
  color: string;
  limit?: number;
  createdAt: string;
}
```

### Entidade: `Expense` (Gasto / Transação)

```ts
interface Expense {
  id: string;
  userId: string;
  parentId?: string | null;   // para agrupar parcelas
  description: string;
  totalAmount: number;
  cardId: string | null;
  category: ExpenseCategory;
  type: 'cash' | 'installment' | 'recurring';
  totalInstallments?: number;
  currentInstallment?: number;
  installmentAmount?: number;
  recurringDay?: number;
  purchaseDate: string;
  billingMonth: number;
  billingYear: number;
  isShared?: boolean;
  sharedWith?: string;
  sharedAmount?: number;
  isSimulation?: boolean;
  isPaid?: boolean;
  notes?: string;
  createdAt: string;
}
```

### Entidade: `SavingsGoal` (Meta de Poupança)

```ts
interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  color: string;
  icon?: string;
  createdAt: string;
}
```

### Entidade: `SavingsDeposit`

```ts
interface SavingsDeposit {
  id: string;
  userId: string;
  goalId: string;
  amount: number;
  note?: string;
  depositedAt: string;
}
```

### Entidade: `CardInvoice`

```ts
interface CardInvoice {
  id: string;
  userId: string;
  cardId: string;
  month: number;
  year: number;
  isPaid: boolean;
  paidAt?: string;
}
```

### Tipos auxiliares

```ts
type ExpenseCategory =
  | 'moradia'
  | 'alimentacao'
  | 'transporte'
  | 'saude'
  | 'educacao'
  | 'lazer'
  | 'vestuario'
  | 'viagem'
  | 'servicos'
  | 'familiar'
  | 'outros';
```

---

## Camada de Serviços (Data Layer)

Criar `src/services/` com um arquivo por entidade. Cada serviço faz as chamadas ao Supabase e converte snake_case → camelCase. Exemplo de estrutura:

```ts
// src/services/expenses.ts
import { supabase } from '../lib/supabase'

export async function fetchExpenses(userId: string): Promise<Expense[]> { ... }
export async function createExpense(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> { ... }
export async function updateExpense(id: string, data: Partial<Expense>): Promise<Expense> { ... }
export async function deleteExpense(id: string): Promise<void> { ... }
```

Criar serviços para: `incomes`, `creditCards`, `expenses`, `savingsGoals`, `savingsDeposits`, `cardInvoices`.

**Conversão de nomes**: o banco usa `snake_case` (ex: `billing_month`), o TypeScript usa `camelCase` (ex: `billingMonth`). A conversão deve acontecer nos serviços, transparente para o resto do app.

---

## Estado Global

Use React Context + useReducer. O estado deve ser carregado do Supabase ao autenticar.

```ts
interface AppState {
  user: User | null;
  incomes: Income[];
  cards: CreditCard[];
  expenses: Expense[];
  savingsGoals: SavingsGoal[];
  cardInvoices: CardInvoice[];
  selectedMonth: number;
  selectedYear: number;
  simulationMode: boolean;
  loading: boolean;
  error: string | null;
}
```

**Fluxo de inicialização:**
1. App carrega → checa sessão Supabase
2. Se autenticado → busca todos os dados do usuário em paralelo (`Promise.all`)
3. Popula o estado global
4. Se não autenticado → redireciona para `/login`

**Loading state:** exibir tela de loading elegante enquanto os dados carregam (spinner ou skeleton screens nos cards).

**Otimismo nas escritas:** ao criar/editar/deletar, atualizar o estado local imediatamente e depois confirmar com o Supabase (ou reverter em caso de erro).

---

## Páginas e Funcionalidades

### 1. Dashboard (`/`)

Visão geral do mês atual. Deve conter:

- **Header do mês** com navegação anterior/próximo (setas)
- **Cards de resumo** no topo:
    - Total de Entradas do mês
    - Total de Faturas a pagar (soma das faturas que vencem neste mês)
    - Saldo Disponível (entradas - faturas - gastos débito)
    - Total Poupado (soma de todos os SavingsGoals)
- **Gráfico de barras** (Recharts): Entradas vs Gastos dos últimos 6 meses
- **Gráfico de rosca** (Recharts): Distribuição de gastos por categoria no mês atual
- **Lista de próximos vencimentos** (próximos 15 dias): faturas de cartão e gastos recorrentes
- **Banner de Modo Simulação** (se ativo): destaque visual amarelo/âmbar

---

### 2. Entradas (`/incomes`)

- Lista de todas as entradas do mês selecionado
- Entradas recorrentes aparecem automaticamente em todos os meses (filtradas no frontend)
- Botão "Adicionar Entrada"
- Form com campos: nome, valor, dia do mês, se é recorrente, notas
- Total das entradas do mês em destaque no topo

---

### 3. Cartões (`/cards`)

- Grid de cartões visuais (estilo mini-card com gradiente usando a `color` do cartão)
- Cada card mostra: nome, últimos 4 dígitos, dia de fechamento, dia de vencimento, fatura do mês atual
- Ao clicar: modal com extrato do mês separado por tipo (Parceladas, Recorrentes, À vista, Empréstimos)
- **Indicador de fatura**: status (Aberta / Fechada / Paga) + botão "Marcar como Paga"
- Marcar como paga cria/atualiza um registro em `card_invoices`

---

### 4. Gastos (`/expenses`)

- Tabela/lista com filtros por: mês, cartão, categoria, tipo, simulação
- **Formulário de novo gasto**:
    - Se parcelado: total de parcelas, valor total → calcula parcela; cria todos os registros de uma vez no Supabase (insert em batch)
    - Se recorrente: escolhe dia de cobrança
    - Toggle "Emprestei para familiar" → campos de nome e valor a receber
    - Toggle "É uma simulação"
- Ações: editar, excluir, duplicar
- Excluir parcelado: pergunta se quer deletar "só esta parcela" ou "todas as parcelas"
- Badge visual para simulações (borda tracejada)

---

### 5. Poupança (`/savings`)

- Cards com barra de progresso visual
- Modal de detalhes com histórico de depósitos (tabela `savings_deposits`)
- Ação "Depositar": cria registro em `savings_deposits` e atualiza `current_amount` na meta
- Cálculo: "faltam R$ X", "% concluído", "precisa poupar R$ X/mês"

---

### 6. Projeções (`/projections`)

- **Timeline dos próximos 12 meses** em cards horizontais
- Para cada mês: entradas esperadas, faturas a vencer, gastos estimados, saldo projetado
- **Gráfico de linha** com evolução do saldo projetado
- **Painel de Simulação**:
    - Toggle global "Modo Simulação Ativo"
    - Lista de gastos simulados com botões "Efetivar" e "Remover"
    - Efetivar: faz `update` no Supabase removendo `is_simulation = true`
    - Duas linhas no gráfico: com e sem simulações
- Filtro de cenários: Otimista / Realista / Pessimista

---

### 7. Configurações (`/settings`)

- Informações da conta (e-mail do usuário logado)
- Exportar todos os dados como JSON (busca tudo do Supabase e faz download)
- Importar dados de um JSON exportado anteriormente
- Botão de logout
- Sobre o app

---

## Lógica de Negócio Crítica

### Cálculo de fatura do cartão

```
Se purchaseDate.day <= closingDay → billingMonth = mês da compra
Se purchaseDate.day > closingDay  → billingMonth = mês seguinte
```

Implementar `calculateBillingMonth(purchaseDate: Date, closingDay: number): { month: number, year: number }`.

### Parcelamentos

Ao criar gasto parcelado (ex: 12x R$500 em março, cartão fecha dia 10):
1. Calcular `billingMonth` da 1ª parcela
2. Gerar array com 12 objetos, cada um com `currentInstallment` 1–12 e `billingMonth` incrementando mês a mês
3. Fazer `insert` em batch no Supabase (uma única chamada com array)
4. Todos os registros compartilham o `parentId` (id do primeiro registro inserido)

### Gastos recorrentes

- **Não criar N registros** no banco; existe apenas 1 registro com `type = 'recurring'`
- Ao renderizar qualquer mês, o frontend inclui os recorrentes automaticamente na listagem
- O `billingMonth` do recorrente armazena o mês de início; ele aparece em todos os meses a partir daí

### Modo Simulação

- `isSimulation = true` no banco
- Visual diferenciado no frontend (borda tracejada, badge "Simulação")
- "Efetivar": `update expenses set is_simulation = false where id = ?`
- "Remover": `delete from expenses where id = ?` (ou `parent_id = ?` se parcelado)

---

## Seed de Dados (Opcional)

Criar `src/utils/seed.ts` com uma função `seedDemoData(userId: string)` que pode ser chamada em Configurações com um botão "Carregar dados de exemplo". Deve inserir:

- 3 entradas recorrentes
- 3 cartões de crédito
- Gastos variados: à vista, 6x, 12x, 2 recorrentes, 1 empréstimo familiar
- 2 metas de poupança
- Dados cobrindo últimos 2 meses + atual + próximos 2 meses

---

## Estrutura de Arquivos

```
src/
  lib/
    supabase.ts
  services/
    incomes.ts
    creditCards.ts
    expenses.ts
    savingsGoals.ts
    savingsDeposits.ts
    cardInvoices.ts
  components/
    layout/
      Sidebar.tsx
      Header.tsx
      Layout.tsx
    ui/
      Card.tsx
      Button.tsx
      Modal.tsx
      Badge.tsx
      ProgressBar.tsx
      MonthNavigator.tsx
      CurrencyInput.tsx
      LoadingScreen.tsx
      Toast.tsx
    charts/
      IncomeExpenseBar.tsx
      CategoryDonut.tsx
      ProjectionLine.tsx
  pages/
    Login.tsx
    Dashboard.tsx
    Incomes.tsx
    Cards.tsx
    Expenses.tsx
    Savings.tsx
    Projections.tsx
    Settings.tsx
  context/
    AppContext.tsx
    AppReducer.ts
    AppActions.ts
    AuthContext.tsx
  hooks/
    useAuth.ts
    useFinanceData.ts
    useProjections.ts
    useSimulation.ts
  utils/
    currency.ts
    dates.ts
    calculations.ts
    seed.ts
  types/
    index.ts
  App.tsx
  main.tsx
  index.css
```

---

## Qualidade e Detalhes Finais

- Todo valor monetário: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- Inputs monetários com máscara natural (digitar `1500` → `R$ 1.500,00`)
- Meses em português (`Janeiro 2025`)
- Estados de vazio amigáveis em cada lista
- Confirmação antes de deletar
- Toasts de sucesso/erro em todas as operações
- Tratamento de erro nas chamadas Supabase (exibir mensagem, não quebrar o app)
- Loading states individuais por operação (botão com spinner ao salvar)
- O `.env` nunca deve ser commitado (adicionar ao `.gitignore`)

---

## Entregável

Um projeto Vite + React + TypeScript completamente funcional, com todos os arquivos criados e dependências instaladas (`npm install`), pronto para rodar com `npm run dev` após configurar o `.env` com as credenciais do Supabase.
