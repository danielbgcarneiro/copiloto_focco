#!/bin/bash

echo "=== Diagnóstico do Servidor Vite ==="
echo "Data: $(date)"
echo ""

# Verifica a versão do Node.js
echo "1. Versão do Node.js:"
node --version
echo ""

# Verifica a memória disponível
echo "2. Memória do sistema:"
free -h
echo ""

# Verifica espaço em disco
echo "3. Espaço em disco:"
df -h .
echo ""

# Verifica processos Node.js em execução
echo "4. Processos Node.js em execução:"
ps aux | grep node | grep -v grep
echo ""

# Verifica limites de watchers
echo "5. Limite de watchers do sistema:"
cat /proc/sys/fs/inotify/max_user_watches
echo ""

# Verifica se há erros no npm
echo "6. Verificando integridade do npm:"
npm cache verify
echo ""

# Limpa o cache do Vite
echo "7. Limpando cache do Vite..."
rm -rf node_modules/.vite
echo "Cache limpo!"
echo ""

# Verifica se há conflitos de porta
echo "8. Verificando porta 3000:"
lsof -i :3000 2>/dev/null || echo "Porta 3000 livre"
echo ""

echo "=== Iniciando monitoramento por 1 minuto ==="
echo "O servidor será iniciado e monitorado por 60 segundos"
echo ""

# Função para monitorar o servidor
monitor_server() {
    local start_time=$(date +%s)
    local pid=$1
    
    while [ $(($(date +%s) - start_time)) -lt 60 ]; do
        if ! ps -p $pid > /dev/null 2>&1; then
            echo ""
            echo "⚠️  SERVIDOR FECHOU em $(date '+%Y-%m-%d %H:%M:%S')"
            echo "Tempo de execução: $(($(date +%s) - start_time)) segundos"
            echo ""
            echo "=== Últimas linhas do log ==="
            tail -20 vite-debug.log
            return 1
        fi
        
        # Verifica se a porta ainda está aberta
        if ! lsof -i :3000 > /dev/null 2>&1; then
            echo ""
            echo "⚠️  PORTA 3000 FECHOU em $(date '+%Y-%m-%d %H:%M:%S')"
            echo ""
        fi
        
        sleep 1
    done
    
    echo ""
    echo "✅ Servidor ainda está rodando após 60 segundos"
    echo "PID: $pid"
    return 0
}

# Inicia o Vite com debug habilitado em background
echo "Iniciando servidor Vite..."
DEBUG=vite:* npm run dev 2>&1 | tee vite-debug.log &
VITE_PID=$!

# Aguarda o servidor iniciar
sleep 3

# Pega o PID real do processo node
NODE_PID=$(pgrep -f "node.*vite" | head -1)

if [ -z "$NODE_PID" ]; then
    echo "❌ Falha ao iniciar o servidor"
    exit 1
fi

echo "Servidor iniciado com PID: $NODE_PID"
echo "Monitorando por 60 segundos..."

# Monitora o servidor
monitor_server $NODE_PID

# Mata o processo se ainda estiver rodando
if ps -p $NODE_PID > /dev/null 2>&1; then
    echo ""
    echo "Parando o servidor..."
    kill $NODE_PID 2>/dev/null
    kill $VITE_PID 2>/dev/null
fi