#!/bin/bash

# ============================================================================
# Setup Cloudflare Workers - Telemetria Operium
# ============================================================================
# Este script configura toda a infraestrutura Cloudflare necessária.
# Execute apenas uma vez durante o setup inicial.
# ============================================================================

set -e  # Para na primeira falha

echo "🚀 Setup Cloudflare Workers - Telemetria Operium"
echo "=================================================="
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script dentro do diretório /workers"
    echo "   cd workers && bash setup-cloudflare.sh"
    exit 1
fi

# 1. Instalar dependências
echo "📦 1. Instalando dependências..."
npm install
echo "✅ Dependências instaladas"
echo ""

# 2. Login no Cloudflare
echo "🔐 2. Fazendo login no Cloudflare..."
echo "   (uma janela do browser será aberta)"
npx wrangler login
echo "✅ Login realizado"
echo ""

# 3. Criar R2 bucket
echo "🪣 3. Criando bucket R2: operium-telemetry-raw"
if npx wrangler r2 bucket create operium-telemetry-raw 2>/dev/null; then
    echo "✅ Bucket R2 criado"
else
    echo "⚠️  Bucket já existe ou erro ao criar (continuando...)"
fi
echo ""

# 4. Criar Queue
echo "📬 4. Criando Queue: telemetry-events"
if npx wrangler queues create telemetry-events 2>/dev/null; then
    echo "✅ Queue criada"
else
    echo "⚠️  Queue já existe ou erro ao criar (continuando...)"
fi
echo ""

# 5. Gerar token secreto
echo "🔑 5. Gerando token de autenticação..."
SECRET_TOKEN=$(openssl rand -hex 32)
echo "   Token gerado: $SECRET_TOKEN"
echo ""

# 6. Salvar secret no Cloudflare
echo "🔒 6. Salvando secret no Cloudflare..."
echo "$SECRET_TOKEN" | npx wrangler secret put TELEMETRY_INGEST_SECRET
echo "✅ Secret configurado"
echo ""

# 7. Deploy dos Workers
echo "🚢 7. Fazendo deploy dos Workers..."
echo "   - Ingest Worker (POST /ingest)"
echo "   - Consumer Worker (Queue → R2)"
npm run deploy
echo "✅ Workers deployados"
echo ""

# 8. Obter URL do Worker
echo "🌐 8. Obtendo URL do Worker..."
WORKER_URL=$(npx wrangler deployments list operium-telemetry-ingest --json 2>/dev/null | grep -o 'https://[^"]*' | head -1)

if [ -z "$WORKER_URL" ]; then
    # Fallback: construir URL manualmente
    ACCOUNT_SUBDOMAIN=$(npx wrangler whoami 2>/dev/null | grep "subdomain" | awk '{print $2}')
    if [ -n "$ACCOUNT_SUBDOMAIN" ]; then
        WORKER_URL="https://operium-telemetry-ingest.${ACCOUNT_SUBDOMAIN}.workers.dev"
    else
        WORKER_URL="<VERIFICAR_NO_DASHBOARD>"
    fi
fi

echo "   URL: $WORKER_URL/ingest"
echo ""

# 9. Salvar configurações em arquivo
echo "💾 9. Salvando configurações..."
cat > .env.cloudflare << EOF
# Configurações Cloudflare Workers - Telemetria
# Gerado em: $(date)

CLOUDFLARE_TELEMETRY_INGEST_URL=${WORKER_URL}/ingest
CLOUDFLARE_TELEMETRY_INGEST_SECRET=${SECRET_TOKEN}
TELEMETRY_ENABLED=true
TELEMETRY_SAMPLE_RATE=1.0
EOF

echo "✅ Configurações salvas em: workers/.env.cloudflare"
echo ""

# 10. Testar endpoint
echo "🧪 10. Testando endpoint de ingestão..."
TEST_RESPONSE=$(curl -s -X POST "${WORKER_URL}/ingest" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${SECRET_TOKEN}" \
    -d '{
        "event_id": "00000000-0000-0000-0000-000000000001",
        "ts": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
        "profile_id": "00000000-0000-0000-0000-000000000002",
        "org_id": "00000000-0000-0000-0000-000000000002",
        "entity_type": "generic",
        "event_name": "SETUP_TEST",
        "event_version": 1,
        "source": "backend",
        "context": {},
        "props": {"test": true},
        "privacy": {"contains_pii": false}
    }')

if echo "$TEST_RESPONSE" | grep -q '"accepted":1'; then
    echo "✅ Teste bem-sucedido!"
    echo "   Resposta: $TEST_RESPONSE"
else
    echo "⚠️  Teste falhou. Resposta:"
    echo "   $TEST_RESPONSE"
fi
echo ""

# Resumo final
echo "============================================================================"
echo "✅ SETUP CONCLUÍDO COM SUCESSO!"
echo "============================================================================"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Copie estas variáveis para o arquivo raiz .env.local:"
echo ""
cat .env.cloudflare
echo ""
echo "2. Ou execute automaticamente:"
echo "   cat workers/.env.cloudflare >> ../.env.local"
echo ""
echo "3. No Vercel, adicione as mesmas variáveis:"
echo "   - Vá em: Settings → Environment Variables"
echo "   - Adicione cada variável do .env.cloudflare"
echo ""
echo "4. Reinicie o servidor Next.js:"
echo "   npm run dev"
echo ""
echo "============================================================================"
echo "🔗 URLs úteis:"
echo "   - Worker Ingest: ${WORKER_URL}/ingest"
echo "   - Health Check: ${WORKER_URL}/health"
echo "   - Cloudflare Dashboard: https://dash.cloudflare.com"
echo "============================================================================"
