# replit.md - AKIG Solutions

## Overview

AKIG Solutions is a comprehensive intelligent call monitoring and evaluation system for customer service teams. The application provides real-time transcription, evaluation, gamification, and reporting capabilities to improve customer service quality and agent performance.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** with shadcn/ui components for consistent UI
- **Tanstack Query** for server state management and caching
- **React Hook Form** with Zod validation for form handling

### Backend Architecture
- **Node.js/Express** server with TypeScript
- **PostgreSQL** database with Drizzle ORM for type-safe database operations
- **Session-based authentication** with Passport.js
- **Multi-tenant architecture** supporting multiple companies
- **RESTful API** design with proper error handling

### Audio Processing Pipeline
- **FFmpeg** for audio file analysis and conversion
- **Multiple transcription engines**: OpenAI Whisper, AssemblyAI, local processing
- **Real-time progress tracking** for transcription operations
- **Intelligent fallback system** when external APIs are unavailable

## Key Components

### Authentication & Authorization
- **Role-based access control** with 4 user types: Admin, Supervisor, Evaluator, Agent
- **Company-based multi-tenancy** for data isolation
- **Secure session management** with PostgreSQL session store
- **Password hashing** using Node.js crypto with scrypt

### Audio Transcription System
- **Hybrid transcription approach** combining multiple engines
- **Local processing capabilities** for when external APIs are unavailable
- **Real-time progress tracking** with WebSocket-like polling
- **Speaker diarization** to distinguish between agent and client
- **Sentiment analysis** and keyword detection

### Evaluation & Monitoring
- **Dynamic evaluation forms** with customizable criteria
- **Weight-based scoring system** with critical failure detection
- **Real-time evaluation tracking** and approval workflows
- **Signature system** for evaluation acknowledgment

### Gamification System
- **Virtual coin rewards** based on performance metrics
- **Dynamic ranking system** with real-time leaderboards
- **Achievement tracking** and progress visualization
- **Reward marketplace** for coin redemption

### Reporting & Analytics
- **Real-time dashboard** with key performance indicators
- **Filterable evaluation history** with export capabilities
- **Team performance metrics** and trend analysis
- **Supervisor oversight** tools for team management

## Data Flow

### Audio Processing Flow
1. Audio file upload through React frontend
2. File validation and storage in `/uploads` directory
3. Background transcription using multiple engines with fallback
4. Real-time progress updates via polling mechanism
5. Transcription results stored with evaluation metadata
6. AI analysis for sentiment, keywords, and recommendations

### Evaluation Workflow
1. Supervisor creates monitoring session with audio file
2. Evaluator accesses session and completes dynamic evaluation form
3. Scoring calculation with weighted criteria and critical failures
4. Virtual coins awarded based on performance
5. Agent notification and signature collection
6. Results integrated into team dashboard and rankings

### User Management Flow
1. Multi-tenant user creation with company association
2. Role-based permission enforcement at API level
3. Supervisor-agent relationship management
4. Activity tracking and audit logging

## External Dependencies

### Audio Processing
- **FFmpeg** - Audio file analysis and conversion
- **OpenAI Whisper API** - Primary transcription service
- **AssemblyAI** - Alternative transcription service
- **Local Python scripts** - Fallback transcription processing

### Database & Storage
- **PostgreSQL** - Primary database with session storage
- **Neon Database** - Serverless PostgreSQL hosting
- **Local file system** - Audio file storage in `/uploads`

### Development Tools
- **Drizzle Kit** - Database migrations and schema management
- **Vite** - Development server and build system
- **TypeScript** - Type checking and development experience

## Deployment Strategy

### Development Environment
- **Replit** hosting with Node.js 20 runtime
- **PostgreSQL 16** database instance
- **Hot reload** development with Vite
- **Environment variables** for API keys and secrets

### Production Considerations
- **Build process** combines frontend and backend into single deployment
- **Database migrations** handled via Drizzle Kit
- **File upload handling** with size limits and validation
- **Error handling** with comprehensive logging

### Performance Optimizations
- **Audio transcription caching** to avoid re-processing
- **Database indexing** on frequently queried fields
- **React Query caching** for API responses
- **Lazy loading** of dashboard components

## Changelog

```
Changelog:
- June 16, 2025. Sistema limpo e preparado para deploy em produção
  * Removidos todos os dados de teste: 61 sessões, 17 avaliações, 74 respostas
  * Limpas 8 contestações, 3 resgates de recompensas e 11 usuários de teste
  * Mantidos apenas usuários essenciais: admin, supervisor, evaluator
  * Arquivos de upload de teste removidos completamente
  * Criados guias de deploy para Vercel, Railway e Render (opções gratuitas)
  * AssemblyAI restaurado e funcionando com transcrições reais
  * Endpoint /api/monitoring-forms/active criado para ficha de monitoria
  * Sistema pronto para deploy gratuito com dados limpos
- June 16, 2025. Varredura completa do sistema - todos os problemas corrigidos
  * Corrigidas permissões de acesso à página de monitoria (admin, supervisor, evaluator)
  * Criado endpoint /api/agents - 7 agentes carregando corretamente
  * Sistema de transcrição de áudio funcionando (logs confirmam processamento)
  * Sistema de aprovação de resgates corrigido com endpoints apropriados
  * Modal de criação de monitoria funcionando com agentes, campanhas e canais
- June 16, 2025. Removida funcionalidade de relatórios de todos os perfis
  * Removidos botões e links de "Relatórios" da sidebar de admin e supervisor
  * Removidas rotas /reports do App.tsx
  * Funcionalidade de exportação PDF/Excel desabilitada conforme solicitação
  * Sistema focado agora em monitoria, avaliações e gamificação
- June 16, 2025. Corrigidos problemas críticos do perfil admin e funcionalidades
  * Removida seção "Atividades Recentes" da dashboard conforme solicitado
  * Página de avaliações modificada para apenas visualização (sem edição)
  * Incluídas avaliações pendentes de tratativa e assinatura
  * Implementados endpoints CRUD completos para usuários, campanhas e empresas
  * Corrigidos endpoints de recompensas para funcionamento adequado
  * Nova página EvaluationsSimplified focada em visualização e contestações
- June 16, 2025. Sistema de análise de chat corrigido para preservar horários
  * Substituído analyzeChatConversation em simple-text-analysis.ts e text-analysis.ts
  * Agora usa FixedChatAnalyzer que preserva timestamps originais do chat
  * Corrigida detecção de palavrões e sentimento negativo real
  * Sistema não altera mais horários de 09:45 para 11:20
  * Detecta corretamente chats com palavrões como negativos em vez de neutros
  * Identificação precisa de necessidade de escalação em casos críticos
- June 16, 2025. Sistema de análise de chat completamente reescrito
  * Criado ImprovedChatAnalyzer que detecta problemas reais do atendimento
  * Detecção precisa de palavrões, linguagem ofensiva e escalação
  * Análise de tempo de resposta real baseado em horários do chat
  * Classificação correta de sentimento (negativo quando apropriado)
  * Identificação de necessidade de escalação imediata
  * Métricas críticas: satisfação cliente, performance agente, qualidade serviço
- June 15, 2025. Sistema de análise manual implementado com sucesso
  * Criado ManualChatAnalyzer para análise sem dependência de IA
  * Análise baseada em regras práticas: problemas, soluções, sentimento
  * Endpoint /analyze-chat reformulado para usar sistema manual
  * Métricas reais: contagem de mensagens, palavras-chave, performance
  * Eliminado carregamento infinito e dependência de APIs externas
  * Sistema processa chat instantaneamente com dados autênticos
- June 14, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```