#!/bin/bash

# Script para iniciar o servidor Vite em background de forma persistente

echo "Iniciando servidor Vite em background..."

# Mata qualquer instância anterior
pkill -f "vite" 2>/dev/null

# Inicia o servidor com nohup para desvinculá-lo do terminal
nohup npm run dev > vite.log 2>&1 &

# Captura o PID
echo $! > vite.pid

sleep 2

# Verifica se o servidor iniciou
if ps -p $(cat vite.pid) > /dev/null; then
    echo "✅ Servidor Vite iniciado com sucesso!"
    echo "PID: $(cat vite.pid)"
    echo "Logs em: vite.log"
    echo ""
    echo "Para parar o servidor: ./stop-dev.sh"
    echo "Para ver os logs: tail -f vite.log"
else
    echo "❌ Falha ao iniciar o servidor"
    tail -10 vite.log
fi