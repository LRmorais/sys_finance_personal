# Migrations

Arquivos SQL ordenados por número. Execute no Supabase em **SQL Editor → New query**.

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `001_initial_schema.sql` | Schema completo: tabelas, RLS, policies | Executar na criação do projeto |
| `002_recurring_validity_range.sql` | Colunas `valid_from` / `valid_until` para recorrentes | Executar após a 001 |
| `003_checking_account.sql` | `recurring_payments`, `checking_simulations`, `user_settings` para Conta Corrente | Executar após a 002 |

## Como aplicar

1. Acesse o painel do Supabase → **SQL Editor**
2. Clique em **New query**
3. Cole o conteúdo do arquivo
4. Clique em **Run**

## Convenção de nomenclatura

```
NNN_descricao_curta.sql
```

- `NNN` → número sequencial com 3 dígitos (`001`, `002`, ...)
- Nunca edite uma migration já executada; crie uma nova
