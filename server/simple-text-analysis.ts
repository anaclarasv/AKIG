export interface ChatAnalysis {
  responseTime: number;
  professionalism: number;
  clarity: number;
  empathy: number;
  problemResolution: number;
  overallScore: number;
  criticalMoments: Array<{
    timestamp: string;
    type: 'long_response' | 'inappropriate_language' | 'missed_opportunity' | 'excellent_response';
    description: string;
    severity: 'low' | 'medium' | 'high';
    speaker: 'agent' | 'client';
  }>;
  recommendations: string[];
  keyTopics: string[];
  sentiment: number;
  conversationFlow: Array<{
    timestamp: string;
    speaker: 'agent' | 'client';
    message: string;
    sentiment: number;
    responseTime?: number;
  }>;
  speakerAnalysis: {
    agent: {
      messageCount: number;
      avgResponseTime: number;
      sentimentScore: number;
      professionalismScore: number;
    };
    client: {
      messageCount: number;
      sentimentScore: number;
      satisfactionLevel: number;
    };
  };
}

export interface EmailAnalysis {
  professionalism: number;
  grammar: number;
  clarity: number;
  responsiveness: number;
  completeness: number;
  overallScore: number;
  criticalMoments: Array<{
    section: string;
    type: 'grammar_error' | 'unprofessional_tone' | 'incomplete_response' | 'excellent_communication';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  recommendations: string[];
  keyTopics: string[];
  sentiment: number;
}

function extractKeywords(text: string): string[] {
  const commonWords = [
    'pedido', 'produto', 'entrega', 'pagamento', 'dúvida', 'problema',
    'suporte', 'atendimento', 'cliente', 'serviço', 'solução', 'ajuda',
    'reembolso', 'cancelar', 'wifi', 'internet', 'lentidão', 'configuração'
  ];
  
  const lowerText = text.toLowerCase();
  return commonWords.filter(word => lowerText.includes(word));
}

function identifySpeaker(message: string, index: number): 'agent' | 'client' {
  const lowerMessage = message.toLowerCase();
  
  // Padrões de atendente
  const agentPatterns = [
    'bom dia!', 'boa tarde!', 'como posso ajudar', 'vou verificar',
    'localizei seu pedido', 'vou providenciar', 'será processado',
    'compreendo sua', 'de nada!', 'mais alguma dúvida', 'pode fazer',
    'fala com ela', 'devido a uma falha'
  ];

  // Padrões de cliente
  const clientPatterns = [
    'olá', 'preciso de ajuda', 'meu pedido', 'não chegou',
    'inaceitável', 'quero cancelar', 'quanto tempo', 'tá bom',
    'obrigado', 'peguei uma cliente', 'belezaaa', 'entendiiiii'
  ];

  // Verifica padrões específicos
  if (agentPatterns.some(pattern => lowerMessage.includes(pattern))) {
    return 'agent';
  }

  if (clientPatterns.some(pattern => lowerMessage.includes(pattern))) {
    return 'client';
  }

  // Alternância baseada em posição
  return index % 2 === 0 ? 'client' : 'agent';
}

function parseConversationFlow(content: string): {
  flow: Array<{
    timestamp: string;
    speaker: 'agent' | 'client';
    message: string;
    sentiment: number;
    responseTime?: number;
  }>;
  analysis: {
    agent: {
      messageCount: number;
      avgResponseTime: number;
      sentimentScore: number;
      professionalismScore: number;
    };
    client: {
      messageCount: number;
      sentimentScore: number;
      satisfactionLevel: number;
    };
  };
} {
  const lines = content.split('\n').filter(line => line.trim());
  const flow: any[] = [];
  let agentMessageCount = 0;
  let clientMessageCount = 0;
  let totalAgentSentiment = 0;
  let totalClientSentiment = 0;

  lines.forEach((line, index) => {
    if (!line.trim()) return;

    const timestamp = `${String(9 + Math.floor(index / 4)).padStart(2, '0')}:${String((index * 2) % 60).padStart(2, '0')}`;
    const speaker = identifySpeaker(line, index);
    const message = line.trim();
    
    // Análise simples de sentimento
    const positiveWords = ['obrigado', 'beleza', 'ótimo', 'perfeito', 'pode fazer'];
    const negativeWords = ['problema', 'lentidão', 'inaceitável', 'reclamação'];
    const lowerMsg = message.toLowerCase();
    
    let sentiment = 0.6; // neutro
    if (positiveWords.some(word => lowerMsg.includes(word))) sentiment = 0.8;
    if (negativeWords.some(word => lowerMsg.includes(word))) sentiment = 0.3;
    
    if (speaker === 'agent') {
      agentMessageCount++;
      totalAgentSentiment += sentiment;
    } else {
      clientMessageCount++;
      totalClientSentiment += sentiment;
    }

    flow.push({
      timestamp,
      speaker,
      message,
      sentiment,
      responseTime: speaker === 'agent' ? 30 + Math.floor(Math.random() * 120) : undefined
    });
  });

  return {
    flow,
    analysis: {
      agent: {
        messageCount: agentMessageCount,
        avgResponseTime: 75,
        sentimentScore: agentMessageCount > 0 ? totalAgentSentiment / agentMessageCount : 0.7,
        professionalismScore: 8
      },
      client: {
        messageCount: clientMessageCount,
        sentimentScore: clientMessageCount > 0 ? totalClientSentiment / clientMessageCount : 0.6,
        satisfactionLevel: 7
      }
    }
  };
}

export async function analyzeChatConversation(chatContent: string): Promise<ChatAnalysis> {
  console.log('=== USANDO SISTEMA CORRIGIDO - PRESERVA HORÁRIOS ===');
  
  // Import e usar o analisador corrigido
  const { FixedChatAnalyzer } = await import('./fixed-chat-analyzer');
  const analysis = FixedChatAnalyzer.analyzeChatContent(chatContent);
  
  console.log('Análise corrigida:', {
    sentiment: analysis.analysis.overallSentiment,
    swearWords: analysis.metrics.totalSwearWords,
    maxResponseTime: analysis.metrics.maxResponseTime,
    escalation: analysis.analysis.requiresEscalation
  });
  
  const messages = chatContent.split('\n').filter(line => line.trim());
  const parsedConversation = parseConversationFlow(chatContent);
  
  // Métricas básicas
  const totalMessages = messages.length;
  const agentMessages = parsedConversation.analysis.agent.messageCount;
  const avgMessageLength = messages.reduce((sum, msg) => sum + msg.length, 0) / totalMessages;
  
  // Verificações de qualidade
  const hasCourtesy = messages.some(msg => 
    msg.toLowerCase().includes('obrigado') || 
    msg.toLowerCase().includes('por favor') ||
    msg.toLowerCase().includes('bom dia') ||
    msg.toLowerCase().includes('boa tarde')
  );
  
  const hasResolution = messages.some(msg =>
    msg.toLowerCase().includes('resolvido') ||
    msg.toLowerCase().includes('beleza') ||
    msg.toLowerCase().includes('pode fazer') ||
    msg.toLowerCase().includes('vou fazer')
  );
  
  return {
    responseTime: analysis.metrics.averageResponseTime,
    professionalism: analysis.metrics.totalSwearWords > 0 ? 3 : 8,
    clarity: 7,
    empathy: analysis.analysis.overallSentiment === 'negative' ? 3 : 7,
    problemResolution: analysis.analysis.requiresEscalation ? 2 : 7,
    overallScore: analysis.analysis.serviceQuality === 'critical' ? 2 :
                 analysis.analysis.serviceQuality === 'poor' ? 4 :
                 analysis.analysis.serviceQuality === 'average' ? 6 : 8,
    criticalMoments: analysis.analysis.criticalIssues.map((issue, index) => ({
      timestamp: index * 60,
      description: issue,
      severity: 'high' as const
    })),
    recommendations: analysis.analysis.requiresEscalation ? 
      ['Escalação imediata necessária', 'Treinamento em atendimento'] :
      ['Manter qualidade do atendimento'],
    keyTopics: analysis.analysis.criticalIssues.length > 0 ? 
               analysis.analysis.criticalIssues : extractKeywords(chatContent),
    sentiment: analysis.analysis.overallSentiment === 'positive' ? 0.8 : 
              analysis.analysis.overallSentiment === 'negative' ? 0.2 : 0.5,
    conversationFlow: analysis.conversationFlow.map(msg => ({
      timestamp: msg.originalTimestamp,
      speaker: msg.speaker,
      message: msg.text,
      sentiment: msg.sentiment === 'positive' ? 0.8 : 
                msg.sentiment === 'negative' ? 0.1 : 0.5,
      responseTime: undefined
    })),
    speakerAnalysis: {
      agent: {
        messageCount: analysis.metrics.agentMessages,
        avgResponseTime: analysis.metrics.averageResponseTime,
        sentimentScore: analysis.analysis.agentPerformance === 'excellent' ? 0.9 :
                       analysis.analysis.agentPerformance === 'poor' ? 0.3 : 0.7,
        professionalismScore: analysis.metrics.totalSwearWords > 0 ? 0.3 : 0.9
      },
      client: {
        messageCount: analysis.metrics.clientMessages,
        sentimentScore: analysis.analysis.overallSentiment === 'positive' ? 0.8 : 
                       analysis.analysis.overallSentiment === 'negative' ? 0.1 : 0.5,
        satisfactionLevel: analysis.analysis.customerSatisfaction === 'high' ? 9 :
                          analysis.analysis.customerSatisfaction === 'low' ? 3 : 6
      }
    }
  };
}

export async function analyzeEmailThread(emailContent: any): Promise<EmailAnalysis> {
  console.log('Analisando email com métricas básicas...');
  
  const emailText = typeof emailContent === 'string' ? emailContent : JSON.stringify(emailContent);
  const wordCount = emailText.split(' ').length;
  
  // Verificações básicas
  const hasGreeting = emailText.toLowerCase().includes('prezado') || 
                     emailText.toLowerCase().includes('olá') ||
                     emailText.toLowerCase().includes('bom dia');
  const hasClosing = emailText.toLowerCase().includes('atenciosamente') || 
                    emailText.toLowerCase().includes('cordialmente') ||
                    emailText.toLowerCase().includes('obrigado');
  const hasQuestion = emailText.includes('?');
  const hasSolution = emailText.toLowerCase().includes('solução') ||
                     emailText.toLowerCase().includes('resolver') ||
                     emailText.toLowerCase().includes('providenciar');
  
  return {
    professionalism: hasGreeting && hasClosing ? 9 : 6,
    grammar: emailText.length > 50 ? 8 : 6,
    clarity: wordCount > 20 && wordCount < 200 ? 8 : 6,
    responsiveness: hasQuestion || hasSolution ? 8 : 6,
    completeness: hasSolution && hasClosing ? 8 : 6,
    overallScore: Math.round((
      (hasGreeting && hasClosing ? 9 : 6) +
      (wordCount > 20 && wordCount < 200 ? 8 : 6) +
      (hasSolution ? 8 : 6)
    ) / 3),
    criticalMoments: [],
    recommendations: [
      hasGreeting ? "Comunicação formal adequada" : "Incluir saudação profissional",
      hasSolution ? "Resposta objetiva e solutiva" : "Verificar se ofereceu solução clara"
    ],
    keyTopics: extractKeywords(emailText),
    sentiment: hasGreeting && hasSolution ? 0.8 : 0.6
  };
}

export function extractChatMetrics(chatContent: string) {
  const lines = chatContent.split('\n').filter(line => line.trim());
  const agentMessages = lines.filter((_, index) => index % 2 === 1);
  const clientMessages = lines.filter((_, index) => index % 2 === 0);
  
  return {
    totalMessages: lines.length,
    agentMessages: agentMessages.length,
    clientMessages: clientMessages.length,
    avgResponseTime: agentMessages.length > 0 ? Math.floor(60 + Math.random() * 120) : 0,
    duration: Math.floor(lines.length * 2)
  };
}

export function extractEmailMetrics(emailContent: any) {
  const emailText = typeof emailContent === 'string' ? emailContent : JSON.stringify(emailContent);
  const lines = emailText.split('\n').filter(line => line.trim());
  
  return {
    totalEmails: Math.ceil(lines.length / 5),
    avgResponseTime: 3600 * 2,
    wordCount: emailText.split(' ').length,
    complexity: emailText.length > 500 ? 'high' : emailText.length > 200 ? 'medium' : 'low'
  };
}