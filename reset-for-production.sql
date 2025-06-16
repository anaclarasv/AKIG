-- Script para resetar sistema AKIG Solutions para produção
-- Execute este script antes do deploy para limpar dados de teste

-- 1. Limpar dados transacionais
DELETE FROM evaluation_contests;
DELETE FROM reward_purchases;
DELETE FROM evaluation_responses;
DELETE FROM monitoring_evaluations;
DELETE FROM evaluations;
DELETE FROM monitoring_sessions;

-- 2. Resetar moedas virtuais
UPDATE users SET virtual_coins = 0;

-- 3. Manter apenas usuários essenciais para demo
DELETE FROM users WHERE username NOT IN ('admin', 'supervisor', 'evaluator');

-- 4. Verificar limpeza
SELECT 
  'monitoring_sessions' as tabela, COUNT(*) as registros FROM monitoring_sessions
UNION ALL
SELECT 
  'evaluations' as tabela, COUNT(*) as registros FROM evaluations
UNION ALL
SELECT 
  'monitoring_evaluations' as tabela, COUNT(*) as registros FROM monitoring_evaluations
UNION ALL
SELECT 
  'users' as tabela, COUNT(*) as registros FROM users;

-- Status: Sistema limpo e pronto para produção