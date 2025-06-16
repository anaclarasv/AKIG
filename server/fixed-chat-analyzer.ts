/**
 * Sistema de análise de chat corrigido - detecta problemas reais preservando horários
 */

export interface FixedChatAnalysis {
  conversationFlow: Array<{
    speaker: 'agent' | 'client';
    text: string;
    originalTimestamp: string;
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

export class FixedChatAnalyzer {
  private static swearWords = [
    'merda', 'pqp', 'porra', 'caralho', 'bosta', 'filho da puta', 'fdp',
    'desgraça', 'peste', 'droga', 'inferno', 'diabos', 'burro', 'idiota',
    'imbecil', 'estúpido', 'incompetente', 'inútil', 'lixo'
  ];

  private static urgencyIndicators = [
    'urgente', 'rápido', 'imediato', 'agora', 'já', 'demora', 'demorado',
    'esperando', 'aguardando', 'tempo', 'minutos', 'horas', 'cancelar'
  ];

  private static problemKeywords = [
    'problema', 'erro', 'falha', 'bug', 'não funciona', 'quebrado',
    'ruim', 'péssimo', 'horrível', 'terrível', 'decepcionado', 'irritado'
  ];

  private static escalationWords = [
    'supervisor', 'gerente', 'responsável', 'chefe', 'escalação',
    'reclamação', 'cancelar', 'sair', 'trocar de empresa'
  ];

  static analyzeChatContent(content: string): FixedChatAnalysis {
    const lines = content.split('\n').filter(line => line.trim());
    const flow = this.parseConversationPreservingTime(lines);
    const timeline = this.calculateRealTimeline(flow);
    const metrics = this.calculateAccurateMetrics(flow, timeline);
    const analysis = this.performCriticalAnalysis(flow, metrics);

    return {
      conversationFlow: flow,
      metrics,
      timeline,
      analysis
    };
  }

  private static parseConversationPreservingTime(lines: string[]) {
    return lines.map((line) => {
      // Extrai horário REAL preservando formato original
      const timeMatch = line.match(/(\d{1,2}:\d{2})/);
      const originalTime = timeMatch ? timeMatch[1] : line;
      
      // Identifica speaker pelos indicadores
      let speaker: 'agent' | 'client' = 'client';
      if (line.includes('🔵') || line.includes('Atendente') || 
          line.toLowerCase().includes('agente') || 
          line.toLowerCase().includes('suporte')) {
        speaker = 'agent';
      }
      
      // Preserva texto original completo
      const fullText = line.replace(/🟢|🔵/g, '').trim();
      
      const sentiment = this.detectRealSentiment(fullText);
      const hasSwearing = this.detectSwearing(fullText);
      const hasUrgency = this.detectUrgency(fullText);
      const hasProblem = this.detectProblem(fullText);
      const hasSolution = this.detectSolution(fullText);

      return {
        speaker,
        text: fullText,
        originalTimestamp: originalTime,
        wordCount: fullText.split(' ').length,
        sentiment,
        hasSwearing,
        hasUrgency,
        hasProblem,
        hasSolution
      };
    });
  }

  private static detectRealSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const lowerText = text.toLowerCase();
    
    // Detecção precisa de sentimento negativo
    const hasSwearing = this.swearWords.some(word => lowerText.includes(word));
    const negativeCount = ['ruim', 'péssimo', 'horrível', 'terrível', 'odeio', 'irritado', 'problema', 'erro'].filter(word => lowerText.includes(word)).length;
    const positiveCount = ['obrigado', 'bom', 'ótimo', 'excelente', 'parabéns', 'satisfeito'].filter(word => lowerText.includes(word)).length;
    
    if (hasSwearing || negativeCount > 0) return 'negative';
    if (positiveCount > 0) return 'positive';
    return 'neutral';
  }

  private static detectSwearing(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.swearWords.some(word => lowerText.includes(word));
  }

  private static detectUrgency(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.urgencyIndicators.some(word => lowerText.includes(word));
  }

  private static detectProblem(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.problemKeywords.some(word => lowerText.includes(word));
  }

  private static detectSolution(text: string): boolean {
    const lowerText = text.toLowerCase();
    return ['resolvido', 'solucionado', 'corrigido', 'arrumado', 'funcionando'].some(word => lowerText.includes(word));
  }

  private static calculateRealTimeline(flow: any[]) {
    const timestamps = flow.filter(msg => msg.originalTimestamp.includes(':')).map(msg => msg.originalTimestamp);
    const responseDelays: Array<{ delay: number; severity: 'acceptable' | 'concerning' | 'unacceptable' }> = [];
    
    // Calcula delays reais entre mensagens
    for (let i = 1; i < flow.length; i++) {
      const prev = flow[i-1];
      const current = flow[i];
      
      if (prev.originalTimestamp.includes(':') && current.originalTimestamp.includes(':')) {
        const delay = this.calculateMinutesDifference(prev.originalTimestamp, current.originalTimestamp);
        const severity = delay > 30 ? 'unacceptable' : delay > 10 ? 'concerning' : 'acceptable';
        responseDelays.push({ delay, severity });
      }
    }

    return {
      firstMessage: timestamps[0] || 'N/A',
      lastMessage: timestamps[timestamps.length - 1] || 'N/A',
      conversationDuration: timestamps.length > 1 ? 
        this.calculateMinutesDifference(timestamps[0], timestamps[timestamps.length - 1]) : 0,
      responseDelays
    };
  }

  private static calculateMinutesDifference(time1: string, time2: string): number {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    
    const minutes1 = h1 * 60 + m1;
    const minutes2 = h2 * 60 + m2;
    
    return Math.abs(minutes2 - minutes1);
  }

  private static calculateAccurateMetrics(flow: any[], timeline: any) {
    const agentMessages = flow.filter(msg => msg.speaker === 'agent').length;
    const clientMessages = flow.filter(msg => msg.speaker === 'client').length;
    const totalSwearWords = flow.filter(msg => msg.hasSwearing).length;
    
    // Calcula escalação baseada em progressão do cliente
    let escalationLevel = 0;
    flow.forEach((msg) => {
      if (msg.speaker === 'client') {
        if (msg.sentiment === 'negative') escalationLevel += 2;
        if (msg.hasSwearing) escalationLevel += 3;
        if (msg.hasUrgency) escalationLevel += 1;
      }
    });

    const maxResponseTime = timeline.responseDelays.length > 0 ? 
      Math.max(...timeline.responseDelays.map((d: any) => d.delay)) : 0;
    const avgResponseTime = timeline.responseDelays.length > 0 ? 
      timeline.responseDelays.reduce((sum: number, d: any) => sum + d.delay, 0) / timeline.responseDelays.length : 0;

    // Determina severidade real do problema
    let problemSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (totalSwearWords >= 3 && maxResponseTime > 30) problemSeverity = 'critical';
    else if (totalSwearWords >= 2 || maxResponseTime > 20) problemSeverity = 'high';
    else if (escalationLevel > 3 || maxResponseTime > 10) problemSeverity = 'medium';

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

  private static performCriticalAnalysis(flow: any[], metrics: any) {
    // Análise precisa do sentimento geral
    const negativeMessages = flow.filter(msg => msg.sentiment === 'negative').length;
    const swearingMessages = flow.filter(msg => msg.hasSwearing).length;
    
    let overallSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (swearingMessages > 0 || negativeMessages >= 2) {
      overallSentiment = 'negative';
    }

    // Avaliação da satisfação do cliente
    let customerSatisfaction: 'high' | 'medium' | 'low' | 'very_low' = 'medium';
    if (metrics.totalSwearWords >= 2 && metrics.maxResponseTime > 30) {
      customerSatisfaction = 'very_low';
    } else if (metrics.totalSwearWords >= 1 || metrics.maxResponseTime > 20) {
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
    const requiresEscalation = 
      metrics.totalSwearWords >= 2 || 
      metrics.maxResponseTime > 30 || 
      metrics.escalationLevel > 5;

    // Issues críticas identificadas
    const criticalIssues: string[] = [];
    if (metrics.totalSwearWords >= 2) criticalIssues.push('Múltiplos palavrões detectados');
    if (metrics.maxResponseTime > 30) criticalIssues.push(`Tempo de resposta excessivo: ${metrics.maxResponseTime} minutos`);
    if (metrics.escalationLevel > 5) criticalIssues.push('Cliente extremamente irritado');
    if (overallSentiment === 'negative') criticalIssues.push('Sentimento geral negativo');

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