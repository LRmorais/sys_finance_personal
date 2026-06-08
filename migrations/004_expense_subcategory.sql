-- Migration 004: Subcategoria de gastos + novas categorias de topo
--
-- Adiciona coluna subcategory em expenses.
-- As novas categorias de topo (carro, contas_casa) são apenas TypeScript —
-- a coluna category já é texto livre sem constraint, então nenhuma alteração
-- de DDL é necessária para aceitá-las.

alter table expenses add column if not exists subcategory text;
