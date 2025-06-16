# Guia de Deploy - AKIG Solutions

## Opções de Deploy Gratuitas

### 1. Vercel (Recomendado) - 100% Gratuito
- **Frontend**: Deploy automático do React/Vite
- **Backend**: Serverless functions (Node.js)
- **Banco**: Neon PostgreSQL (gratuito até 512MB)
- **Limites**: 100GB bandwidth/mês, execuções ilimitadas

### 2. Railway - Gratuito com Limitações
- **Full-stack**: Deploy completo Node.js + PostgreSQL
- **Limites**: $5 crédito/mês (suficiente para desenvolvimento)
- **Vantagem**: Deploy mais simples, um só lugar

### 3. Render - Parcialmente Gratuito
- **Frontend**: Gratuito ilimitado
- **Backend**: 750 horas/mês gratuitas
- **Banco**: PostgreSQL gratuito (90 dias, depois $7/mês)

### 4. Netlify + Supabase - Gratuito
- **Frontend**: Netlify (gratuito)
- **Backend**: Netlify Functions
- **Banco**: Supabase PostgreSQL (500MB gratuito)

## Preparação do Código

### Configurações Necessárias

1. **Variáveis de Ambiente**:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `ASSEMBLYAI_API_KEY` (opcional)
   - `OPENAI_API_KEY` (opcional)

2. **Build Scripts**:
   - Frontend: `npm run build`
   - Backend: Já configurado para produção

3. **Migrações**:
   - Comando: `npm run db:push`
   - Executar após deploy do banco

## Estrutura de Deploy

### Opção 1: Vercel (Mais Simples)
```
Frontend (Vercel) → Backend API (Vercel Functions) → Database (Neon)
```

### Opção 2: Railway (Monolítico)
```
Aplicação Completa (Railway) → Database (Railway PostgreSQL)
```

## Custos Estimados

### Desenvolvimento/Teste (0-100 usuários):
- **Vercel + Neon**: R$ 0,00/mês
- **Railway**: R$ 0,00-25,00/mês
- **Render**: R$ 0,00-35,00/mês

### Produção (100-1000 usuários):
- **Vercel Pro + Neon**: R$ 100-200/mês
- **Railway**: R$ 25-150/mês
- **Render**: R$ 35-200/mês

## Recomendação

**Para começar**: Vercel + Neon (100% gratuito)
**Para crescer**: Railway (mais simples de gerenciar)

O sistema está pronto para deploy imediato!