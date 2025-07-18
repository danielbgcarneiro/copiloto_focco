#!/bin/bash

# Script para parar o servidor Vite

if [ -f vite.pid ]; then
    PID=$(cat vite.pid)
    if ps -p $PID > /dev/null; then
        kill $PID
        echo "✅ Servidor Vite parado (PID: $PID)"
    else
        echo "⚠️  Servidor não está rodando"
    fi
    rm -f vite.pid
else
    # Tenta encontrar e matar qualquer processo Vite
    pkill -f "vite" 2>/dev/null && echo "✅ Processos Vite terminados" || echo "⚠️  Nenhum servidor Vite encontrado"
fi