#!/bin/bash
set -e

echo "🧹 Limpando ambiente..."
rm -rf node_modules .next package-lock.json

echo "🧠 Limpando cache do npm..."
npm cache clean --force

echo "📦 Instalando dependências..."
npm install --legacy-peer-deps

echo "🚀 Iniciando servidor de desenvolvimento..."
npm run dev
