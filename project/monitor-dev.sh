#!/bin/bash

echo "Iniciando servidor Vite com monitoramento..."
echo "Pressione Ctrl+C para parar"

# Função para lidar com o sinal de interrupção
cleanup() {
    echo -e "\nServidor interrompido"
    exit 0
}

trap cleanup INT

# Executa o servidor e monitora
npm run dev 2>&1 | while IFS= read -r line; do
    echo "[$(date '+%H:%M:%S')] $line"
    
    # Verifica se há mensagens de erro
    if [[ $line == *"error"* ]] || [[ $line == *"Error"* ]] || [[ $line == *"failed"* ]]; then
        echo "⚠️  ERRO DETECTADO: $line"
    fi
done

echo "Servidor fechou inesperadamente"