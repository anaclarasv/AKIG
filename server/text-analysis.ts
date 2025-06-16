import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// Função auxiliar para extração de palavras-chave
function extractKeywords(text: string): string[] {
  const commonWords = [
    'pedido', 'produto', 'entrega', 'pagamento', 'dúvida', 'problema',
    'suporte', 'atendimento', 'cliente', 'serviço', 'solução', 'ajuda'
  ];
  
  const lowerText = text.toLowerCase();
  return commonWords.filter(word => lowerText.includes(word));
}

function generateSimpleChatAnalysis(chatContent: string): ChatAnalysis {
  const messages = chatContent.split('\n').filter(line => line.trim());
  const parsedConversation = parseConversationFlow(chatContent);
  
  // Métricas básicas sem IA
  const totalMessages = messages.length;
  const agentMessages = parsedConversation.analysis.agent.messageCount;
  const clientMessages = parsedConversation.analysis.client.messageCount;
  
  // Análise básica de qualidade
  const avgMessageLength = messages.reduce((sum, msg) => sum + msg.length, 0) / totalMessages;
  const hasCourtesy = messages.some(msg => 
    msg.toLowerCase().includes('obrigado') || 
    msg.toLowerCase().includes('por favor') ||
    msg.toLowerCase().includes('bom dia') ||
    msg.toLowerCase().includes('boa tarde')
  );
  
  const hasResolution = messages.some(msg =>
    msg.toLowerCase().includes('resolvido') ||
    msg.toLowerCase().includes('solucionado') ||
    msg.toLowerCase().includes('pronto') ||
    msg.toLowerCase().includes('beleza')
  );
  
  return {
    responseTime: agentMessages > 0 ? Math.round(75 + Math.random() * 30) : 0,
    professionalism: hasCourtesy ? 8 : 6,
    clarity: avgMessageLength > 10 ? 8 : 6,
    empathy: hasCourtesy ? 7 : 5,
    problemResolution: hasResolution ? 8 : 6,
    overallScore: Math.round((
      (hasCourtesy ? 8 : 6) + 
      (avgMessageLength > 10 ? 8 : 6) + 
      (hasResolution ? 8 : 6)
    ) / 3),
    criticalMoments: [],
    recommendations: [
      hasCourtesy ? "Boa comunicação interpessoal" : "Pode melhorar a cortesia",
      hasResolution ? "Problema resolvido adequadamente" : "Verificar se houve resolução"
    ],
    keyTopics: extractKeywords(chatContent),
    sentiment: hasCourtesy && hasResolution ? 0.8 : 0.6,
    conversationFlow: parsedConversation.flow,
    speakerAnalysis: parsedConversation.analysis
  };
}

function generateSimpleEmailAnalysis(emailContent: any): EmailAnalysis {
  const emailText = typeof emailContent === 'string' ? emailContent : JSON.stringify(emailContent);
  const lines = emailText.split('\n').filter(line => line.trim());
  
  // Métricas básicas sem IA
  const wordCount = emailText.split(' ').length;
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
               analysis.analysis.criticalIssues : ['atendimento', 'suporte'],
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
  // Análise simples e direta sem IA
  console.log('Analisando email com métricas básicas...');
  return generateSimpleEmailAnalysis(emailContent);
}



export function extractChatMetrics(chatContent: string) {
  const lines = chatContent.split('\n').filter(line => line.trim());
  const agentMessages = lines.filter((_, index) => index % 2 === 1); // Atendente nas posições ímpares
  const clientMessages = lines.filter((_, index) => index % 2 === 0); // Cliente nas posições pares
  
  const avgResponseTime = agentMessages.length > 0 ? Math.floor(60 + Math.random() * 120) : 0;
  
  return {
    totalMessages: lines.length,
    agentMessages: agentMessages.length,
    clientMessages: clientMessages.length,
    avgResponseTime,
    duration: Math.floor(lines.length * 2) // Estimar 2 minutos por exchange
  };
}

export function extractEmailMetrics(emailContent: any) {
  const emailText = typeof emailContent === 'string' ? emailContent : JSON.stringify(emailContent);
  const lines = emailText.split('\n').filter(line => line.trim());
  
  return {
    totalEmails: Math.ceil(lines.length / 5), // Estimar emails baseado no conteúdo
    avgResponseTime: 3600 * 2, // 2 horas média para email
    wordCount: emailText.split(' ').length,
    complexity: emailText.length > 500 ? 'high' : emailText.length > 200 ? 'medium' : 'low'
  };
}

// Função para identificar automaticamente atendente vs cliente
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
    
    // Identifica automaticamente o speaker baseado em padrões
    const speaker = identifySpeaker(line, index);
    const message = cleanMessage(line);
    const sentiment = analyzeSentiment(message);
    
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

// Identifica automaticamente quem é atendente vs cliente
function identifySpeaker(message: string, index: number): 'agent' | 'client' {
  const lowerMessage = message.toLowerCase();
  
  // Padrões típicos de atendente (mais específicos)
  const agentPatterns = [
    'bom dia!',
    'boa tarde!',
    'como posso ajudar',
    'em que posso ajudá-lo',
    'vou verificar',
    'localizei seu pedido',
    'vou providenciar',
    'será processado',
    'compreendo sua',
    'de nada!',
    'mais alguma dúvida'
  ];

  // Padrões típicos de cliente (mais específicos)
  const clientPatterns = [
    'olá',
    'preciso de ajuda',
    'meu pedido',
    'não chegou',
    'inaceitável',
    'quero cancelar',
    'quanto tempo',
    'tá bom',
    'obrigado'
  ];

  // Verifica padrões específicos primeiro
  if (agentPatterns.some(pattern => lowerMessage.includes(pattern))) {
    return 'agent';
  }

  if (clientPatterns.some(pattern => lowerMessage.includes(pattern))) {
    return 'client';
  }

  // Heurística melhorada: tom profissional vs informal
  const professionalIndicators = [
    'sistema', 'protocolo', 'providenciar', 'verificar', 'processado',
    'compreendo', 'localizado', 'transportadora', 'reembolso'
  ];
  
  const informalIndicators = [
    'meu', 'não', 'quero', 'isso é', 'tá bom'
  ];
  
  const professionalScore = professionalIndicators.filter(word => lowerMessage.includes(word)).length;
  const informalScore = informalIndicators.filter(word => lowerMessage.includes(word)).length;

  if (professionalScore > informalScore && professionalScore > 0) {
    return 'agent';
  }
  
  if (informalScore > professionalScore && informalScore > 0) {
    return 'client';
  }

  // Padrão alternado inteligente: primeira mensagem é cliente iniciando conversa
  return index % 2 === 0 ? 'client' : 'agent';
}

function cleanMessage(message: string): string {
  return message.replace(/^\d{2}:\d{2}\s*-?\s*/, '')
                .replace(/^\[.*?\]\s*:?\s*/, '')
                .trim();
}

function analyzeSentiment(message: string): number {
  const positiveWords = ['obrigado', 'agradeco', 'excelente', 'ótimo', 'perfeito', 'satisfeito'];
  const negativeWords = ['problema', 'defeito', 'ruim', 'péssimo', 'insatisfeito', 'reclamação'];
  
  const lowerMessage = message.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
  
  if (positiveCount > negativeCount) return 0.8;
  if (negativeCount > positiveCount) return 0.3;
  return 0.6;
}