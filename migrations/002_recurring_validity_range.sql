-- Migration 002: Segmentos de validade para recorrentes
--
-- Problema resolvido: entradas e despesas recorrentes eram registros únicos
-- lidos para todos os meses. Ao editar, o valor mudava em todo o histórico.
--
-- Solução: colunas de intervalo de validade (valid_from / valid_until).
-- O frontend filtra a recorrente apenas nos meses dentro do intervalo.
--
-- Fluxo de edição no app (entradas recorrentes):
--   "Todos os meses"       → atualiza o registro base normalmente
--   "Deste mês em diante"  → fecha atual (valid_until = mês anterior),
--                            cria novo registro a partir do mês selecionado
--   "Só este mês"          → fecha atual, cria avulso para o mês,
--                            cria novo recorrente com valores originais no próximo mês
--   "Encerrar deste mês"   → fecha atual (valid_until = mês anterior)

alter table incomes
  add column if not exists valid_from_month  integer,
  add column if not exists valid_from_year   integer,
  add column if not exists valid_until_month integer,
  add column if not exists valid_until_year  integer;

alter table expenses
  add column if not exists valid_until_month integer,
  add column if not exists valid_until_year  integer;
