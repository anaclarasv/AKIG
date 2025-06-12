# AKIG Solutions - Guia de Deploy

## Pré-requisitos
- Domínio e email já configurados ✅
- Hospedagem com suporte a Node.js e PostgreSQL
- Acesso FTP/SSH ao servidor

## Estrutura do Sistema
```
akig-solutions/
├── client/          # Frontend React
├── server/          # Backend Node.js
├── shared/          # Schemas compartilhados
├── migrations/      # Migrações do banco
└── uploads/         # Arquivos de áudio
```

## Configuração do Banco de Dados

### 1. PostgreSQL
Crie um banco PostgreSQL e execute as migrações:

```sql
-- Criar banco
CREATE DATABASE akig_solutions;

-- Executar migrações
npm run db:migrate
```

### 2. Variáveis de Ambiente (.env)
```env
# Database
DATABASE_URL=postgresql://usuario:senha@host:5432/akig_solutions

# Autenticação
SESSION_SECRET=seu-session-secret-seguro-aqui

# APIs Externas
OPENAI_API_KEY=sua-chave-openai
ASSEMBLYAI_API_KEY=sua-chave-assemblyai

# Produção
NODE_ENV=production
PORT=5000
```

## Deploy Frontend + Backend Integrado

### Opção 1: Servidor VPS (Recomendado)
```bash
# 1. Clonar código no servidor
git clone [repositorio] /var/www/akig-solutions
cd /var/www/akig-solutions

# 2. Instalar dependências
npm install

# 3. Build do frontend
npm run build

# 4. Configurar PM2 (processo em background)
npm install -g pm2
pm2 start npm --name "akig-solutions" -- start
pm2 startup
pm2 save

# 5. Configurar Nginx (proxy reverso)
# Ver configuração nginx.conf abaixo
```

### Opção 2: Hospedagem Tradicional
```bash
# 1. Build local
npm run build

# 2. Upload via FTP:
# - Pasta 'dist/' completa
# - Pasta 'server/' completa
# - package.json
# - .env (com suas configurações)

# 3. No servidor:
npm install --production
npm start
```

## Configuração Nginx
```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name seu-dominio.com.br;
    
    # SSL Certificates
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # Frontend estático
    location / {
        root /var/www/akig-solutions/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API Backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Upload de arquivos
    location /uploads {
        alias /var/www/akig-solutions/uploads;
    }
}
```

## Checklist de Deploy

### Antes do Deploy
- [ ] Backup do banco atual
- [ ] Testar build local (`npm run build`)
- [ ] Configurar variáveis de ambiente
- [ ] Verificar dependências de produção

### Durante o Deploy
- [ ] Upload dos arquivos
- [ ] Instalar dependências no servidor
- [ ] Executar migrações do banco
- [ ] Configurar SSL/HTTPS
- [ ] Testar todas as funcionalidades

### Após o Deploy
- [ ] Monitorar logs de erro
- [ ] Verificar performance
- [ ] Testar upload de áudio
- [ ] Confirmar backup automático

## Comandos Úteis

```bash
# Verificar status
pm2 status

# Ver logs
pm2 logs akig-solutions

# Reiniciar aplicação
pm2 restart akig-solutions

# Backup do banco
pg_dump akig_solutions > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql akig_solutions < backup_20241212.sql
```

## Suporte
- Todas as funcionalidades testadas: ✅
- Sistema de ranking: ✅
- Upload de áudio: ✅
- Autenticação: ✅
- Dashboard supervisor: ✅

Credenciais padrão:
- Admin: admin / admin123
- Supervisor: supervisor / 123456