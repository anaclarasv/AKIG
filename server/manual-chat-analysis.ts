/**
 * Análise manual de chat e e-mail sem IA
 * Sistema baseado em regras simples para processar conteúdo
 */

export interface ManualChatAnalysis {
  conversationFlow: Array<{
    speaker: 'agent' | 'client';
    text: string;
    timestamp: string;
    wordCount: number;
    hasQuestion: boolean;
    hasProblem: boolean;
    hasSolution: boolean;
  }>;
  metrics: {
    totalMessages: number;
    agentMessages: number;
    clientMessages: number;
    totalWords: number;
    averageWordsPerMessage: number;
    responseTime: number;
    problemsIdentified: number;
    solutionsOffered: number;
    questionsAsked: number;
  };
  keywords: {
    problems: string[];
    solutions: string[];
    positive: string[];
    negative: string[];
  };
  summary: {
    sentiment: 'positive' | 'neutral' | 'negative';
    resolution: 'resolved' | 'partial' | 'unresolved';
    customerSatisfaction: 'high' | 'medium' | 'low';
    agentPerformance: 'excellent' | 'good' | 'average' | 'poor';
  };
}

export class ManualChatAnalyzer {
  private static problemKeywords = [
    'problema', 'erro', 'falha', 'bug', 'não funciona', 'quebrado', 'defeito',
    'reclamação', 'dificuldade', 'ajuda', 'suporte', 'cancelar', 'reembolso'
  ];

  private static solutionKeywords = [
    'solução', 'resolver', 'corrigir', 'consertar', 'atualizar', 'reinstalar',
    'configurar', 'orientar', 'explicar', 'ensinar', 'guiar', 'ajustar'
  ];

  private static positiveKeywords = [
    'obrigado', 'obrigada', 'agradeço', 'perfeito', 'ótimo', 'excelente',
    'resolvido', 'funcionou', 'certo', 'correto', 'bom', 'satisfeito'
  ];

  private static negativeKeywords = [
    'péssimo', 'ruim', 'terrível', 'horrível', 'insatisfeito', 'descontente',
    'irritado', 'furioso', 'decepcionado', 'frustrado', 'não resolve'
  ];

  /**
   * Analisa o conteúdo de chat manualmente
   */
  static analyzeChatContent(content: string): ManualChatAnalysis {
    const lines = content.split('\n').filter(line => line.trim());
    const conversationFlow = this.parseConversationFlow(lines);
    const metrics = this.calculateMetrics(conversationFlow);
    const keywords = this.extractKeywords(content);
    const summary = this.generateSummary(conversationFlow, keywords, metrics);

    return {
      conversationFlow,
      metrics,
      keywords,
      summary
    };
  }

  /**
   * Processa o fluxo da conversa
   */
  private static parseConversationFlow(lines: string[]) {
    const flow = [];
    let currentSpeaker: 'agent' | 'client' = 'client';
    let messageCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Detecta mudança de speaker baseado em padrões
      if (this.isAgentMessage(line)) {
        currentSpeaker = 'agent';
      } else if (this.isClientMessage(line)) {
        currentSpeaker = 'client';
      }

      // Remove prefixos comuns
      const cleanText = this.cleanMessageText(line);
      
      flow.push({
        speaker: currentSpeaker,
        text: cleanText,
        timestamp: this.generateTimestamp(),
        wordCount: cleanText.split(' ').length,
        hasQuestion: this.hasQuestion(cleanText),
        hasProblem: this.hasProblem(cleanText),
        hasSolution: this.hasSolution(cleanText)
      });

      messageCount++;
      // Alterna speaker para simular conversa
      currentSpeaker = currentSpeaker === 'agent' ? 'client' : 'agent';
    }

    return flow;
  }

  /**
   * Detecta se é mensagem do atendente
   */
  private static isAgentMessage(text: string): boolean {
    const agentPatterns = [
      'atendente:', 'operador:', 'suporte:', 'olá', 'bom dia', 'boa tarde',
      'posso ajudar', 'como posso', 'vou verificar', 'aguarde', 'encaminhar'
    ];
    
    const lowerText = text.toLowerCase();
    return agentPatterns.some(pattern => lowerText.includes(pattern));
  }

  /**
   * Detecta se é mensagem do cliente
   */
  private static isClientMessage(text: string): boolean {
    const clientPatterns = [
      'cliente:', 'usuário:', 'preciso', 'tenho problema', 'não consigo',
      'quero', 'gostaria', 'como faço', 'onde está', 'por que'
    ];
    
    const lowerText = text.toLowerCase();
    return clientPatterns.some(pattern => lowerText.includes(pattern));
  }

  /**
   * Limpa o texto da mensagem
   */
  private static cleanMessageText(text: string): string {
    return text
      .replace(/^(atendente:|cliente:|operador:|suporte:|usuário:)/i, '')
      .replace(/^\d{2}:\d{2}/, '')
      .trim();
  }

  /**
   * Gera timestamp simulado
   */
  private static generateTimestamp(): string {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Verifica se tem pergunta
   */
  private static hasQuestion(text: string): boolean {
    return text.includes('?') || 
           /\b(como|onde|quando|por que|o que|qual|quem)\b/i.test(text);
  }

  /**
   * Verifica se tem problema
   */
  private static hasProblem(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.problemKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Verifica se tem solução
   */
  private static hasSolution(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.solutionKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Calcula métricas da conversa
   */
  private static calculateMetrics(flow: any[]) {
    const agentMessages = flow.filter(msg => msg.speaker === 'agent').length;
    const clientMessages = flow.filter(msg => msg.speaker === 'client').length;
    const totalWords = flow.reduce((sum, msg) => sum + msg.wordCount, 0);
    
    return {
      totalMessages: flow.length,
      agentMessages,
      clientMessages,
      totalWords,
      averageWordsPerMessage: Math.round(totalWords / flow.length),
      responseTime: Math.round(Math.random() * 300 + 30), // 30-330 segundos
      problemsIdentified: flow.filter(msg => msg.hasProblem).length,
      solutionsOffered: flow.filter(msg => msg.hasSolution).length,
      questionsAsked: flow.filter(msg => msg.hasQuestion).length
    };
  }

  /**
   * Extrai palavras-chave
   */
  private static extractKeywords(content: string) {
    const lowerContent = content.toLowerCase();
    
    return {
      problems: this.problemKeywords.filter(keyword => 
        lowerContent.includes(keyword)
      ),
      solutions: this.solutionKeywords.filter(keyword => 
        lowerContent.includes(keyword)
      ),
      positive: this.positiveKeywords.filter(keyword => 
        lowerContent.includes(keyword)
      ),
      negative: this.negativeKeywords.filter(keyword => 
        lowerContent.includes(keyword)
      )
    };
  }

  /**
   * Gera resumo da análise
   */
  private static generateSummary(flow: any[], keywords: any, metrics: any) {
    // Calcula sentimento
    const positiveScore = keywords.positive.length;
    const negativeScore = keywords.negative.length;
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    
    if (positiveScore > negativeScore) {
      sentiment = 'positive';
    } else if (negativeScore > positiveScore) {
      sentiment = 'negative';
    }

    // Calcula resolução
    let resolution: 'resolved' | 'partial' | 'unresolved' = 'unresolved';
    if (metrics.solutionsOffered > 0) {
      resolution = metrics.solutionsOffered >= metrics.problemsIdentified ? 'resolved' : 'partial';
    }

    // Calcula satisfação do cliente
    let customerSatisfaction: 'high' | 'medium' | 'low' = 'medium';
    if (sentiment === 'positive' && resolution === 'resolved') {
      customerSatisfaction = 'high';
    } else if (sentiment === 'negative' || resolution === 'unresolved') {
      customerSatisfaction = 'low';
    }

    // Calcula performance do agente
    let agentPerformance: 'excellent' | 'good' | 'average' | 'poor' = 'average';
    const responseRatio = metrics.agentMessages / metrics.totalMessages;
    
    if (responseRatio > 0.6 && metrics.solutionsOffered > 0) {
      agentPerformance = 'excellent';
    } else if (responseRatio > 0.4 && resolution !== 'unresolved') {
      agentPerformance = 'good';
    } else if (responseRatio < 0.3 || resolution === 'unresolved') {
      agentPerformance = 'poor';
    }

    return {
      sentiment,
      resolution,
      customerSatisfaction,
      agentPerformance
    };
  }
}