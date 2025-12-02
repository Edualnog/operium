#!/bin/bash
# Script para fazer push do código para o repositório remoto

echo "🚀 Preparando push para o repositório..."

# Verifica se o remote já existe
if git remote | grep -q "origin"; then
    echo "✅ Remote 'origin' já configurado"
    git remote -v
else
    echo "⚠️  Remote 'origin' não encontrado"
    echo ""
    echo "Para adicionar o remote, execute:"
    echo "  git remote add origin <URL_DO_SEU_REPOSITORIO>"
    echo ""
    echo "Exemplo:"
    echo "  git remote add origin https://github.com/seu-usuario/erp-almox-facil.git"
    echo ""
    read -p "Deseja adicionar o remote agora? (s/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        read -p "Digite a URL do repositório: " repo_url
        git remote add origin "$repo_url"
        echo "✅ Remote adicionado!"
    else
        echo "❌ Push cancelado. Adicione o remote manualmente."
        exit 1
    fi
fi

echo ""
echo "📤 Fazendo push para o repositório..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Push realizado com sucesso!"
    echo "🎉 Seu código está no repositório remoto!"
else
    echo ""
    echo "❌ Erro ao fazer push. Verifique:"
    echo "  1. Se você tem permissão no repositório"
    echo "  2. Se a URL do remote está correta"
    echo "  3. Se você está autenticado (git config --global user.name e user.email)"
fi

