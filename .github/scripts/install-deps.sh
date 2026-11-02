#!/usr/bin/env bash
# Instala as dependências mesmo quando o package-lock.json sumiu ou ficou desatualizado.
# O AI Studio exporta o projeto com bun.lock e pode apagar ou não atualizar o lockfile do npm;
# sem isto, `npm ci` e o cache do setup-node derrubam o CI e a publicação.
set -uo pipefail

if [ -f package-lock.json ]; then
  if npm ci --no-audit --no-fund; then
    echo "Dependências instaladas pelo package-lock.json (versões fixas)."
    exit 0
  fi
  echo "::warning::npm ci falhou: o package-lock.json está desatualizado em relação ao package.json. Instalando com npm install."
else
  echo "::warning::package-lock.json não encontrado. Instalando com npm install (as versões podem variar entre execuções)."
fi

npm install --no-audit --no-fund
