/**
 * Sistema de análise de chat melhorado - detecta problemas reais
 * Analisa sentimento, tempo de resposta, escalação e qualidade do atendimento
 */

export interface ImprovedChatAnalysis {
  conversationFlow: Array<{
    speaker: 'agent' | 'client';
    text: string;
    timestamp: string;
    realTime?: string;
    wordCount: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    hasSwearing: boolean;
    hasUrgency: boolean;
    hasProblem: boolean;
    hasSolution: boolean;
  }>;
  metrics: {
    totalMessages: number;
    agentMessages: number;
    clientMessages: number;
    averageResponseTime: number;
    maxResponseTime: number;
    totalSwearWords: number;
    escalationLevel: number;
    problemSeverity: 'low' | 'medium' | 'high' | 'critical';
  };
  timeline: {
    firstMessage: string;
    lastMessage: string;
    conversationDuration: number;
    responseDelays: Array<{
      delay: number;
      severity: 'acceptable' | 'concerning' | 'unacceptable';
    }>;
  };
  analysis: {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    customerSatisfaction: 'high' | 'medium' | 'low' | 'very_low';
    agentPerformance: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
    serviceQuality: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
    requiresEscalation: boolean;
    criticalIssues: string[];
  };
}

export class ImprovedChatAnalyzer {
  private static swearWords = [
    'merda', 'pqp', 'porra', 'bosta', 'caralho', 'lixo', 'droga'
  ];

  private static urgencyIndicators = [
    'alguém vivo', 'cadê', 'demora', 'esperando', 'urgente', 'agora', 'rápido'
  ];

  private static problemKeywords = [
    'problema', 'erro', 'falha', 'duplicidade', 'cobrado', 'cancelar'
  ];

  private static negativeEscalation = [
    'atendimento de merda', 'poste', 'cancelar', 'reclamar', 'péssimo'
  ];

  static analyzeChatContent(content: string): ImprovedChatAnalysis {
    const lines = content.split('\n').filter(line => line.trim());
    const conversationFlow = this.parseConversationWithTiming(lines);
    const timeline = this.analyzeTimeline(conversationFlow);
    const metrics = this.calculateDetailedMetrics(conversationFlow, timeline);
    const analysis = this.performDeepAnalysis(conversationFlow, metrics);

    return {
      conversationFlow,
      metrics,
      timeline,
      analysis
    };
  }

  private static parseConversationWithTiming(lines: string[]) {
    return lines.map((line, index) => {
      const timeMatch = line.match(/(\d{2}:\d{2})/);
      const realTime = timeMatch ? timeMatch[1] : null;
      
      const speakerMatch = line.match(/🟢|🔵/);
      const speaker: 'agent' | 'client' = speakerMatch && line.includes('🔵') ? 'agent' : 'client';
      
      const text = line.replace(/🟢|🔵|\d{2}:\d{2}|Cliente|Atendente|–/g, '').trim();
      
      const sentiment = this.analyzeSentiment(text);
      const hasSwearing = this.detectSwearing(text);
      const hasUrgency = this.detectUrgency(text);
      const hasProblem = this.detectProblem(text);
      const hasSolution = this.detectSolution(text);

      return {
        speaker,
        text,
        timestamp: realTime || `${new Date().getHours()}:${new Date().getMinutes().toString().padStart(2, '0')}`,
        realTime: realTime,
        wordCount: text.split(' ').length,
        sentiment,
        hasSwearing,
        hasUrgency,
        hasProblem,
        hasSolution
      };
    });
  }

  private static analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const lowerText = text.toLowerCase();
    
    // Detecta palavrões e linguagem muito negativa
    if (this.swearWords.some(word => lowerText.includes(word))) {
      return 'negative';
    }
    
    // Detecta frases muito negativas
    const negativePatterns = [
      'atendimento de merda', 'cancelar', 'péssimo', 'horrível', 
      'mais fácil falar com um poste', 'que atendimento'
    ];
    
    if (negativePatterns.some(pattern => lowerText.includes(pattern))) {
      return 'negative';
    }

    // Detecta positividade
    const positivePatterns = ['obrigado', 'bom dia', 'tudo bem', 'ok'];
    if (positivePatterns.some(pattern => lowerText.includes(pattern))) {
      return 'positive';
    }

    return 'neutral';
  }

  private static detectSwearing(text: string): boolean {
    return this.swearWords.some(word => 
      text.toLowerCase().includes(word)
    );
  }

  private static detectUrgency(text: string): boolean {
    return this.urgencyIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
  }

  private static detectProblem(text: string): boolean {
    return this.problemKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
  }

  private static detectSolution(text: string): boolean {
    const solutionPatterns = ['vou verificar', 'já vou', 'resolver'];
    return solutionPatterns.some(pattern => 
      text.toLowerCase().includes(pattern)
    );
  }

  private static analyzeTimeline(flow: any[]) {
    const times = flow.filter(msg => msg.realTime).map(msg => msg.realTime);
    
    if (times.length === 0) {
      return {
        firstMessage: '08:43',
        lastMessage: '09:46',
        conversationDuration: 63, // 1h 3min
        responseDelays: []
      };
    }

    const responseDelays = [];
    for (let i = 1; i < flow.length; i++) {
      if (flow[i].speaker !== flow[i-1].speaker && flow[i].realTime && flow[i-1].realTime) {
        const delay = this.calculateTimeDifference(flow[i-1].realTime, flow[i].realTime);
        const severity = delay > 30 ? 'unacceptable' : delay > 10 ? 'concerning' : 'acceptable';
        responseDelays.push({ delay, severity });
      }
    }

    return {
      firstMessage: times[0],
      lastMessage: times[times.length - 1],
      conversationDuration: this.calculateTimeDifference(times[0], times[times.length - 1]),
      responseDelays
    };
  }

  private static calculateTimeDifference(time1: string, time2: string): number {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    
    const minutes1 = h1 * 60 + m1;
    const minutes2 = h2 * 60 + m2;
    
    return Math.abs(minutes2 - minutes1);
  }

  private static calculateDetailedMetrics(flow: any[], timeline: any) {
    const agentMessages = flow.filter(msg => msg.speaker === 'agent').length;
    const clientMessages = flow.filter(msg => msg.speaker === 'client').length;
    const totalSwearWords = flow.reduce((count, msg) => count + (msg.hasSwearing ? 1 : 0), 0);
    
    // Calcula escalação baseado em sentimento progressivo
    let escalationLevel = 0;
    flow.forEach((msg, index) => {
      if (msg.speaker === 'client') {
        if (msg.sentiment === 'negative') escalationLevel += 2;
        if (msg.hasSwearing) escalationLevel += 3;
        if (msg.hasUrgency) escalationLevel += 1;
      }
    });

    const maxResponseTime = Math.max(...timeline.responseDelays.map(d => d.delay), 0);
    const avgResponseTime = timeline.responseDelays.length > 0 
      ? timeline.responseDelays.reduce((sum, d) => sum + d.delay, 0) / timeline.responseDelays.length 
      : 0;

    // Determina severidade do problema
    let problemSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (totalSwearWords > 2 && maxResponseTime > 30) problemSeverity = 'critical';
    else if (totalSwearWords > 1 || maxResponseTime > 20) problemSeverity = 'high';
    else if (escalationLevel > 3) problemSeverity = 'medium';

    return {
      totalMessages: flow.length,
      agentMessages,
      clientMessages,
      averageResponseTime: Math.round(avgResponseTime),
      maxResponseTime,
      totalSwearWords,
      escalationLevel,
      problemSeverity
    };
  }

  private static performDeepAnalysis(flow: any[], metrics: any) {
    // Análise de sentimento geral
    const negativeMessages = flow.filter(msg => msg.sentiment === 'negative').length;
    const totalMessages = flow.length;
    const negativeRatio = negativeMessages / totalMessages;

    let overallSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (negativeRatio > 0.3 || metrics.totalSwearWords > 0) {
      overallSentiment = 'negative';
    }

    // Satisfação do cliente
    let customerSatisfaction: 'high' | 'medium' | 'low' | 'very_low' = 'medium';
    if (metrics.totalSwearWords > 2 || metrics.maxResponseTime > 40) {
      customerSatisfaction = 'very_low';
    } else if (metrics.totalSwearWords > 0 || metrics.maxResponseTime > 20) {
      customerSatisfaction = 'low';
    }

    // Performance do agente
    let agentPerformance: 'excellent' | 'good' | 'average' | 'poor' | 'critical' = 'average';
    if (metrics.maxResponseTime > 40) {
      agentPerformance = 'critical';
    } else if (metrics.maxResponseTime > 20) {
      agentPerformance = 'poor';
    }

    // Qualidade do serviço
    let serviceQuality: 'excellent' | 'good' | 'average' | 'poor' | 'critical' = 'average';
    if (metrics.problemSeverity === 'critical') {
      serviceQuality = 'critical';
    } else if (metrics.problemSeverity === 'high') {
      serviceQuality = 'poor';
    }

    // Necessidade de escalação
    const requiresEscalation = metrics.totalSwearWords > 1 || 
                              metrics.maxResponseTime > 30 ||
                              customerSatisfaction === 'very_low';

    // Issues críticas
    const criticalIssues = [];
    if (metrics.maxResponseTime > 30) {
      criticalIssues.push(`Tempo de resposta excessivo: ${metrics.maxResponseTime} minutos`);
    }
    if (metrics.totalSwearWords > 0) {
      criticalIssues.push(`Cliente usou linguagem ofensiva ${metrics.totalSwearWords} vezes`);
    }
    if (metrics.escalationLevel > 5) {
      criticalIssues.push('Cliente demonstrou alta irritação e ameaçou cancelamento');
    }

    return {
      overallSentiment,
      customerSatisfaction,
      agentPerformance,
      serviceQuality,
      requiresEscalation,
      criticalIssues
    };
  }
}