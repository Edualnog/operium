#!/bin/bash

# Script de validação rápida para sistema de observers
# Execute: chmod +x validate.sh && ./validate.sh

echo "🔍 Validando instalação do Sistema de Observers..."
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Carregar .env.local se existir
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Verificar se DATABASE_URL está definido
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não definido em .env.local${NC}"
    exit 1
fi

echo "1️⃣ Verificando tabelas criadas..."
TABLES_COUNT=$(psql $DATABASE_URL -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('derived_event_types', 'observer_execution_log', 'observer_state');")

if [ "$TABLES_COUNT" -eq "3" ]; then
    echo -e "${GREEN}✓ 3 tabelas criadas${NC}"
else
    echo -e "${RED}✗ Esperado 3 tabelas, encontrado $TABLES_COUNT${NC}"
fi

echo ""
echo "2️⃣ Verificando eventos derivados cadastrados..."
EVENTS_COUNT=$(psql $DATABASE_URL -tAc "SELECT COUNT(*) FROM derived_event_types WHERE enabled = true;")

if [ "$EVENTS_COUNT" -eq "4" ]; then
    echo -e "${GREEN}✓ 4 tipos de eventos derivados${NC}"
    psql $DATABASE_URL -c "SELECT event_type, observer_version FROM derived_event_types ORDER BY event_type;" | head -6
else
    echo -e "${RED}✗ Esperado 4 tipos, encontrado $EVENTS_COUNT${NC}"
fi

echo ""
echo "3️⃣ Verificando funções de observer..."
FUNCTIONS_COUNT=$(psql $DATABASE_URL -tAc "SELECT COUNT(*) FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND proname LIKE 'fn_observe_%';")

if [ "$FUNCTIONS_COUNT" -eq "4" ]; then
    echo -e "${GREEN}✓ 4 funções de observer criadas${NC}"
else
    echo -e "${YELLOW}⚠ Esperado 4 funções, encontrado $FUNCTIONS_COUNT${NC}"
fi

echo ""
echo "4️⃣ Verificando view de saúde..."
VIEW_EXISTS=$(psql $DATABASE_URL -tAc "SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_observer_health';")

if [ "$VIEW_EXISTS" -eq "1" ]; then
    echo -e "${GREEN}✓ View v_observer_health criada${NC}"
else
    echo -e "${RED}✗ View v_observer_health não encontrada${NC}"
fi

echo ""
echo "5️⃣ Teste rápido: buscar um profile_id..."
PROFILE_ID=$(psql $DATABASE_URL -tAc "SELECT id FROM profiles LIMIT 1;")

if [ -n "$PROFILE_ID" ]; then
    echo -e "${GREEN}✓ Profile encontrado: $PROFILE_ID${NC}"
    echo ""
    echo "📝 Para testar os observers manualmente, execute:"
    echo ""
    echo -e "${YELLOW}psql \$DATABASE_URL -c \"SELECT fn_run_all_observers('$PROFILE_ID');\"${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠ Nenhum profile encontrado (crie um usuário primeiro)${NC}"
fi

echo ""
echo "========================================="
echo "✅ Validação completa!"
echo "========================================="
echo ""
echo "Próximos passos:"
echo "1. Testar observers: psql \$DATABASE_URL < tests/test_derived_events_observers.sql"
echo "2. Ver saúde: psql \$DATABASE_URL -c 'SELECT * FROM v_observer_health;'"
echo "3. Deploy para produção: git push origin main"
echo ""
