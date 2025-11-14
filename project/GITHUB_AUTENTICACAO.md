# 🔐 Guia de Autenticação GitHub com Token Pessoal

## Status Atual
- **Branch:** V4_12_09_25
- **Commits pendentes:** 1
- **Remoto:** https://github.com/danielbgcarneiro/copiloto_focco.git

## ✅ Opção 1: Autenticar via Terminal (Recomendado)

### Passo 1: Abra um terminal neste diretório
```bash
cd /home/linux_daniel/copiloto.v3/project
```

### Passo 2: Configure o Git para armazenar credenciais
```bash
git config --global credential.helper store
```

### Passo 3: Faça o push
```bash
git push -u origin V4_12_09_25
```

### Passo 4: Quando pedir credenciais
1. **Username:** `danielbgcarneiro`
2. **Password:** Cole seu **Personal Access Token (PAT)** do GitHub

⚠️ **IMPORTANTE:** Use o Token, não sua senha!

### Resultado
```
Enumerating objects: 3, done.
Counting objects: 100% (3/3), done.
Delta compression using up to 8 threads
Compressing objects: 100% (2/2), done.
Writing objects: 100% (2/2), 267 bytes, done.
Total 2 (delta 1), reused 0 (delta 0), reused pack 0
remote: Resolving deltas: 100% (1/1), done.
To https://github.com/danielbgcarneiro/copiloto_focco.git
   abcd1234..6df9d76 V4_12_09_25 -> V4_12_09_25
Branch 'V4_12_09_25' set up to track remote branch 'V4_12_09_25' from 'origin'.
```

---

## 🔑 Onde Obter seu Personal Access Token (PAT)

1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token"** → **"Generate new token (classic)"**
3. Configure:
   - **Name:** Copiloto Focco
   - **Expiration:** 90 days (ou conforme sua política)
   - **Scopes:** Marque ✅ **repo** (full control of private repositories)
4. Clique em **"Generate token"**
5. **Copie o token** (ele só aparece uma vez!)

---

## 🚀 Alternativa 2: Script Automático (Mais Fácil)

Se preferir um script que faz tudo:

```bash
cd /home/linux_daniel/copiloto.v3/project
bash push-github.sh
```

Ele vai:
1. Verificar status
2. Configurar credential helper
3. Pedir seu token
4. Fazer push automaticamente

---

## 🔒 Alternativa 3: SSH (Mais Seguro)

Se preferir não armazenar o token (mais seguro):

### Gerar chave SSH (uma única vez)
```bash
ssh-keygen -t ed25519 -C "seu@email.com"
# Pressione Enter em todas as opções (ou defina uma senha)
```

### Adicionar a chave ao GitHub
1. Copie sua chave pública:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

2. No GitHub: **Settings** → **SSH and GPG keys** → **New SSH key**
3. Cole a chave e salve

### Mudar remoto para SSH
```bash
git remote set-url origin git@github.com:danielbgcarneiro/copiloto_focco.git
```

### Agora fazer push sem autenticação
```bash
git push -u origin V4_12_09_25
```

---

## 🐛 Troubleshooting

### Erro 403: Permission denied
**Causa:** Token expirado ou sem permissões
**Solução:** Crie um novo token com escopo `repo`

### Erro: The requested URL returned error: 403
**Causa:** Credenciais inválidas
**Solução:** 
1. Limpe cache de credenciais:
   ```bash
   git credential-cache exit
   ```
2. Tente novamente com novo token

### Erro: Host key verification failed (SSH)
**Causa:** Primeira conexão via SSH
**Solução:**
```bash
ssh -T git@github.com
# Responda 'yes' quando pedir confirmação
```

---

## ✨ Verificar se Funcionou

Após fazer push, verifique:

```bash
# Ver status local
git status
# Deve mostrar: "Your branch is up to date with 'origin/V4_12_09_25'."

# Verificar no GitHub
# Acesse: https://github.com/danielbgcarneiro/copiloto_focco/tree/V4_12_09_25
# Seu commit deve estar lá!
```

---

## 🎯 Resumo Rápido

| Método | Comando | Segurança | Facilidade |
|--------|---------|-----------|-----------|
| **HTTPS + Token** | `git push` | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **SSH** | `git push` | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Script** | `bash push-github.sh` | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Recomendação:** Use **HTTPS + Token** para começar (mais fácil), depois considere **SSH** para mais segurança.

---

## 📞 Precisa de ajuda?

Se ainda tiver problemas, execute:
```bash
bash autenticar-github.sh
```

Ele mostrará um diagnóstico completo do status.
