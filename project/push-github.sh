#!/bin/bash
# Autenticador GitHub via credenciais do Git
# Execute este script e siga as instruções

echo "🔐 AUTENTICADOR GITHUB - COPILOTO FOCCO"
echo "========================================"
echo ""

# Verificar se tem commits pendentes
COMMITS_PENDENTES=$(git log origin/V4_12_09_25..V4_12_09_25 --oneline 2>/dev/null | wc -l)
echo "✓ Commits pendentes: $COMMITS_PENDENTES"
echo "✓ Branch: V4_12_09_25"
echo "✓ Remoto: https://github.com/danielbgcarneiro/copiloto_focco.git"
echo ""

# Configurar credential helper
echo "📝 Configurando armazenamento de credenciais..."
git config --global credential.helper store

# Criar o comando para adicionar credenciais via stdin
echo ""
echo "🔑 Digite seu Token do GitHub:"
echo "   (Será armazenado em ~/.git-credentials)"
echo ""

# Tentar push de forma interativa
echo "Tentando fazer push..."
git push -u origin V4_12_09_25

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ PUSH REALIZADO COM SUCESSO!"
    echo ""
    echo "Seu token foi armazenado em: ~/.git-credentials"
    echo "Para futuras operações, não será necessário autenticar novamente."
else
    echo ""
    echo "❌ Erro ao fazer push"
    echo ""
    echo "Se receber erro 403:"
    echo "  - Verifique se o token tem permissão para 'repo' (push)"
    echo "  - Verifique se o token não expirou"
    echo "  - Tente criar um novo token no GitHub"
    echo ""
    echo "Tentar novamente?"
    echo "  git push -u origin V4_12_09_25"
fi
