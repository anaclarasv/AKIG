# Manual do Usuário - AKIG Solutions
## Sistema Inteligente de Monitoramento de Atendimento

**Versão:** 1.0  
**Data:** Dezembro 2024

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Perfis de Usuário](#2-perfis-de-usuário)
3. [Dashboard Principal](#3-dashboard-principal)
4. [Sistema de Monitoramento](#4-sistema-de-monitoramento)
5. [Avaliações e Critérios](#5-avaliações-e-critérios)
6. [Sistema de Ranking](#6-sistema-de-ranking)
7. [Gamificação e Recompensas](#7-gamificação-e-recompensas)
8. [Relatórios Gerenciais](#8-relatórios-gerenciais)
9. [Gestão de Usuários](#9-gestão-de-usuários)
10. [Conformidade LGPD](#10-conformidade-lgpd)
11. [Guia de Demonstração](#11-guia-de-demonstração)

---

## 1. Visão Geral do Sistema

### O que é o AKIG Solutions?

O AKIG Solutions é uma plataforma completa de monitoramento e avaliação de atendimento ao cliente, que utiliza inteligência artificial para análise de chamadas e oferece ferramentas abrangentes de gestão de performance.

### Principais Recursos

- **Transcrição Automática**: IA para transcrever e analisar chamadas
- **Avaliação Estruturada**: Formulários customizáveis de monitoramento
- **Ranking Dinâmico**: Sistema de classificação em tempo real
- **Gamificação**: Moedas virtuais e sistema de recompensas
- **Dashboard Intuitivo**: Métricas e insights visuais
- **Multi-perfil**: 4 tipos de usuário com permissões específicas

---

## 2. Perfis de Usuário

### 👤 Admin
**Acesso Total ao Sistema**
- Gestão de empresas e campanhas
- Configuração de critérios de avaliação
- Administração de usuários
- Relatórios executivos
- Configurações do sistema

### 👥 Supervisor
**Gestão de Equipe**
- Dashboard com ranking da equipe
- Monitoramento de performance dos agentes
- Relatórios de evolução da equipe
- Avaliação de monitorias
- Arquivamento de sessões

### 📋 Avaliador
**Especialista em Qualidade**
- Avaliação detalhada de atendimentos
- Aprovação de resgates de recompensas
- Monitoramento de qualidade
- Acesso ao ranking geral

### 🎧 Agente
**Operador de Atendimento**
- Visualização das próprias avaliações
- Ranking pessoal e da equipe
- Loja de recompensas
- Histórico de performance

---

## 3. Dashboard Principal

### Dashboard do Admin
- **Métricas Globais**: Monitorias realizadas, pontuação média, agentes ativos
- **Visão Geral**: Gráficos de performance e tendências
- **Alertas**: Pendências e notificações importantes

### Dashboard do Supervisor
- **Ranking da Equipe**: Top performers e pontuações
- **Evolução de Performance**: Gráficos temporais da equipe
- **Métricas da Equipe**: Número de avaliações, médias e tendências
- **Gestão de Moedas**: Distribuição de recompensas virtuais

### Dashboard do Agente
- **Performance Pessoal**: Gráficos de evolução individual
- **Posição no Ranking**: Classificação atual e histórico
- **Conquistas**: Badges e marcos alcançados
- **Próximas Metas**: Objetivos a serem atingidos

---

## 4. Sistema de Monitoramento

### Criação de Monitoria

1. **Acesso**: Menu lateral > "Monitorias"
2. **Nova Monitoria**: Botão "Nova Monitoria"
3. **Dados Básicos**:
   - Agente monitorado
   - Data e horário
   - Campanha relacionada
   - Canal de atendimento

4. **Upload de Áudio**: 
   - Formatos aceitos: MP3, WAV, M4A
   - Transcrição automática via IA
   - Análise de sentimento integrada

### Funcionalidades da Transcrição

- **Transcrição Automática**: Conversão de áudio em texto
- **Análise de Sentimento**: Identificação do tom da conversa
- **Detecção de Palavras-chave**: Termos críticos do atendimento
- **Timestamps**: Marcação temporal precisa
- **Identificação de Falantes**: Separação agente/cliente

### Estados da Monitoria

- **Pendente**: Aguardando avaliação
- **Em Progresso**: Sendo avaliada
- **Concluída**: Avaliação finalizada
- **Arquivada**: Removida da visualização ativa

---

## 5. Avaliações e Critérios

### Formulário de Avaliação Dinâmico

#### Estrutura Hierárquica
- **Seções**: Agrupamentos temáticos (ex: Qualidade, Técnica)
- **Critérios**: Itens específicos de avaliação
- **Pontuação Ponderada**: Pesos diferentes por critério

#### Tipos de Critério
- **Múltipla Escolha**: Opções predefinidas com pontuações
- **Escala Numérica**: Notas de 0 a 10
- **Sim/Não**: Critérios binários
- **Texto Livre**: Comentários descritivos

### Exemplo de Avaliação

**Seção: Qualidade do Atendimento (Peso: 40%)**
- Cordialidade (0-10): 8 pontos
- Clareza na comunicação (0-10): 9 pontos
- Resolução do problema (Sim/Não): Sim

**Seção: Conhecimento Técnico (Peso: 35%)**
- Domínio do produto (0-10): 7 pontos
- Procedimentos corretos (0-10): 8 pontos

**Seção: Eficiência (Peso: 25%)**
- Tempo de atendimento (Adequado/Inadequado): Adequado
- Follow-up necessário (Sim/Não): Não

### Cálculo de Pontuação

```
Pontuação Final = (Seção1 × Peso1) + (Seção2 × Peso2) + (Seção3 × Peso3)
```

---

## 6. Sistema de Ranking

### Ranking Global
- **Classificação Geral**: Todos os agentes da empresa
- **Pontuação Média**: Baseada nas últimas avaliações
- **Moedas Virtuais**: Acumuladas por performance
- **Tendência**: Evolução recente (↑↓)

### Ranking por Equipe (Supervisor)
- **Top 3 Melhores**: Destaques da equipe
- **Piores Performance**: Agentes que precisam de atenção
- **Evolução Mensal**: Gráficos de progresso
- **Comparação**: Posições anteriores vs. atuais

### Critérios de Classificação
1. **Pontuação Média**: Peso 70%
2. **Número de Avaliações**: Peso 20%
3. **Consistência**: Peso 10%

---

## 7. Gamificação e Recompensas

### Sistema de Moedas Virtuais

#### Como Ganhar Moedas
- **Avaliação Excelente (9-10)**: 50 moedas
- **Avaliação Boa (7-8)**: 30 moedas
- **Avaliação Regular (5-6)**: 10 moedas
- **Melhoria de Performance**: Bônus variável

#### Loja de Recompensas
- **Vale Combustível**: 200 moedas
- **Vale Alimentação**: 150 moedas
- **Folga Extra**: 300 moedas
- **Brinde Corporativo**: 100 moedas

### Sistema de Aprovação
1. **Solicitação**: Agente solicita resgate
2. **Análise**: Avaliador verifica elegibilidade
3. **Aprovação/Rejeição**: Decisão com justificativa
4. **Entrega**: Processo de distribuição

### Conquistas e Badges
- **Sem Reclamações**: 30 dias sem feedback negativo
- **Top Performer**: 1º lugar no ranking mensal
- **Melhoria Contínua**: 3 meses de evolução
- **Mentor**: Ajudar novos agentes

---

## 8. Relatórios Gerenciais

### Relatórios Disponíveis

#### Para Supervisores
- **Performance da Equipe**: Métricas individuais e coletivas
- **Evolução Temporal**: Gráficos de 3, 6 ou 12 meses
- **Análise de Tendências**: Identificação de padrões
- **Comparativo Mensal**: Mês atual vs. anterior

#### Para Administradores
- **Relatório Executivo**: Visão geral da empresa
- **Análise por Campanha**: Performance por produto/serviço
- **ROI de Treinamentos**: Eficácia das capacitações
- **Previsões**: Tendências futuras baseadas em dados

### Exportação de Dados
- **Formatos**: PDF, Excel, CSV
- **Personalização**: Período, filtros, métricas
- **Automação**: Envio programado por email
- **Dashboards**: Visualizações interativas

---

## 9. Gestão de Usuários

### Criação de Usuários

#### Dados Obrigatórios
- Nome completo
- Email corporativo
- Username único
- Perfil de acesso
- Empresa vinculada

#### Configurações Específicas
- **Agentes**: Supervisor responsável
- **Supervisores**: Equipe sob gestão
- **Avaliadores**: Campanhas autorizadas
- **Admins**: Permissões especiais

### Controle de Acesso
- **Autenticação Segura**: Senhas criptografadas
- **Sessões Controladas**: Timeout automático
- **Logs de Auditoria**: Rastreamento de ações
- **Permissões Granulares**: Controle por funcionalidade

---

## 10. Conformidade LGPD

### Direitos do Titular
- **Portabilidade**: Exportação de dados pessoais
- **Exclusão**: Remoção completa do sistema
- **Retificação**: Correção de informações
- **Acesso**: Visualização dos dados armazenados

### Implementação Técnica
- **Criptografia**: Dados sensíveis protegidos
- **Minimização**: Coleta apenas do necessário
- **Consentimento**: Aceite explícito dos usuários
- **Backup Seguro**: Retenção controlada

### Relatórios de Compliance
- **Mapeamento de Dados**: Inventário completo
- **Logs de Acesso**: Quem acessou quais dados
- **Solicitações LGPD**: Histórico de requisições
- **Auditorias**: Relatórios para DPO

---

## 11. Guia de Demonstração

### Roteiro de Apresentação (30 minutos)

#### Fase 1: Introdução (5 min)
1. **Login do Sistema**
   - Credenciais: `supervisor` / `123456`
   - Apresentar interface principal

2. **Visão Geral**
   - Explicar os 4 perfis de usuário
   - Navegar pelo menu lateral

#### Fase 2: Dashboard do Supervisor (8 min)
1. **Métricas da Equipe**
   - Mostrar números atuais
   - Explicar cálculos e tendências

2. **Ranking da Equipe**
   - Top performers: Lauren (91.1), Ana (89.2), Vitória (86.2)
   - Mostrar evolução individual

3. **Gráfico de Performance**
   - Evolução mensal da equipe
   - Identificação de padrões

#### Fase 3: Sistema de Monitoramento (10 min)
1. **Lista de Monitorias**
   - Filtros por status e período
   - Estados: pendente, concluída, arquivada

2. **Nova Monitoria**
   - Upload de arquivo de áudio
   - Demonstrar transcrição automática
   - Análise de sentimento

3. **Avaliação Completa**
   - Formulário dinâmico
   - Pontuação ponderada
   - Comentários e observações

#### Fase 4: Ranking e Gamificação (5 min)
1. **Ranking Global**
   - Posições atuais dos agentes
   - Sistema de moedas virtuais

2. **Loja de Recompensas**
   - Itens disponíveis
   - Processo de resgate

3. **Sistema de Aprovação**
   - Workflow de aprovação
   - Controle de custos

#### Fase 5: Relatórios (2 min)
1. **Relatórios Gerenciais**
   - Exportação em PDF/Excel
   - Métricas personalizadas

### Scripts de Demonstração

#### Script 1: Login e Navegação
```
"Vamos acessar o sistema AKIG Solutions. Aqui temos o login do supervisor Maria, 
que gerencia uma equipe de 6 agentes. Veja como o dashboard já apresenta um 
resumo completo da performance da equipe."
```

#### Script 2: Ranking da Equipe
```
"No painel de ranking, podemos ver que Lauren está em primeiro lugar com 91.1 
pontos, seguida por Ana com 89.2. O sistema também mostra as moedas virtuais 
acumuladas por cada agente baseado na performance."
```

#### Script 3: Avaliação de Monitoria
```
"Agora vou demonstrar como funciona a avaliação. Fazemos upload do áudio da 
chamada, o sistema transcreve automaticamente e identifica o sentimento. 
Em seguida, preenchemos o formulário de avaliação com critérios ponderados."
```

### Dados de Demonstração Disponíveis

#### Usuários Ativos
- **Maria Supervisor** (supervisor): Gestora da equipe
- **6 Agentes**: Lauren, Ana, Vitória, Caio, Lucas, Ana
- **12 Avaliações**: Distribuídas entre novembro e dezembro

#### Métricas Atuais
- **Pontuação Média da Equipe**: 90.5
- **Total de Moedas Distribuídas**: 3,790
- **Avaliações Realizadas**: 12
- **Agentes Ativos**: 6

### Perguntas Frequentes na Demonstração

**P: Como é calculada a pontuação final?**
R: Utilizamos média ponderada considerando o peso de cada seção do formulário de avaliação.

**P: O sistema funciona com qualquer formato de áudio?**
R: Sim, suportamos MP3, WAV e M4A com transcrição automática via IA.

**P: Como funciona o controle de permissões?**
R: Cada perfil tem acesso específico: supervisor vê apenas sua equipe, agente vê apenas suas avaliações.

**P: Os dados são seguros?**
R: Sim, implementamos criptografia, logs de auditoria e conformidade total com a LGPD.

### Próximos Passos Após Demonstração

1. **Definição de Critérios**: Personalizar formulário de avaliação
2. **Importação de Usuários**: Cadastro da equipe atual
3. **Treinamento**: Capacitação dos supervisores e avaliadores
4. **Implementação Gradual**: Início com projeto piloto
5. **Acompanhamento**: Suporte durante primeiros 30 dias

---

## Contato e Suporte

**Equipe AKIG Solutions**  
📧 suporte@akigsolutions.com.br  
📱 (11) 9999-9999  
🌐 www.akigsolutions.com.br

**Horário de Atendimento**  
Segunda a Sexta: 8h às 18h  
Sábado: 8h às 12h

---

*Manual atualizado em Dezembro de 2024 - Versão 1.0*