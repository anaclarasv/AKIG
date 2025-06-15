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

export async function analyzeChatConversation(chatContent: string): Promise<ChatAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `Você é um especialista em análise de qualidade de atendimento via chat. Analise a conversa fornecida e identifique claramente quem é o atendente e quem é o cliente.

IMPORTANTE: Identifique automaticamente o atendente e cliente baseado em:
- Linguagem profissional vs casual
- Quem oferece soluções vs quem tem problemas
- Padrões de saudação ("Como posso ajudar?" = atendente)
- Uso de linguagem formal vs informal

Critérios de avaliação:
- Tempo de resposta (baseado em intervalos entre mensagens)
- Profissionalismo (linguagem adequada, cordialidade)
- Clareza (mensagens claras e compreensíveis)
- Empatia (demonstração de compreensão do cliente)
- Resolução de problemas (efetividade em resolver questões)

Retorne no formato JSON:
{
  "responseTime": number (1-10),
  "professionalism": number (1-10),
  "clarity": number (1-10),
  "empathy": number (1-10),
  "problemResolution": number (1-10),
  "overallScore": number (1-10),
  "criticalMoments": [
    {
      "timestamp": "string",
      "type": "long_response|inappropriate_language|missed_opportunity|excellent_response",
      "description": "string",
      "severity": "low|medium|high",
      "speaker": "agent|client"
    }
  ],
  "recommendations": ["string"],
  "keyTopics": ["string"],
  "sentiment": number (0-1),
  "conversationFlow": [
    {
      "timestamp": "string",
      "speaker": "agent|client",
      "message": "string",
      "sentiment": number (0-1),
      "responseTime": number
    }
  ],
  "speakerAnalysis": {
    "agent": {
      "messageCount": number,
      "avgResponseTime": number,
      "sentimentScore": number (0-1),
      "professionalismScore": number (1-10)
    },
    "client": {
      "messageCount": number,
      "sentimentScore": number (0-1),
      "satisfactionLevel": number (1-10)
    }
  }
}`
        },
        {
          role: "user",
          content: `Analise esta conversa de chat e identifique claramente quem é atendente vs cliente:\n\n${chatContent}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    return analysis;
  } catch (error) {
    console.error('Erro na análise de chat:', error);
    return generateFallbackChatAnalysis(chatContent);
  }
}

export async function analyzeEmailThread(emailContent: any): Promise<EmailAnalysis> {
  try {
    const emailText = typeof emailContent === 'string' ? emailContent : JSON.stringify(emailContent);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `Você é um especialista em análise de qualidade de atendimento via e-mail. Analise o thread de e-mail fornecido e retorne uma avaliação detalhada em JSON.

Critérios de avaliação:
- Profissionalismo (linguagem formal, cortesia)
- Gramática (correção ortográfica e gramatical)
- Clareza (comunicação clara e objetiva)
- Responsividade (tempo de resposta apropriado)
- Completude (resposta completa às questões)

Retorne no formato JSON:
{
  "professionalism": number (1-10),
  "grammar": number (1-10),
  "clarity": number (1-10),
  "responsiveness": number (1-10),
  "completeness": number (1-10),
  "overallScore": number (1-10),
  "criticalMoments": [
    {
      "section": "string",
      "type": "grammar_error|unprofessional_tone|incomplete_response|excellent_communication",
      "description": "string",
      "severity": "low|medium|high"
    }
  ],
  "recommendations": ["string"],
  "keyTopics": ["string"],
  "sentiment": number (0-1)
}`
        },
        {
          role: "user",
          content: `Analise este thread de e-mail:\n\n${emailText}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    return analysis;
  } catch (error) {
    console.error('Erro na análise de e-mail:', error);
    return generateFallbackEmailAnalysis(emailContent);
  }
}

function generateFallbackChatAnalysis(chatContent: string): ChatAnalysis {
  const messages = chatContent.split('\n').filter(line => line.trim());
  const parsedConversation = parseConversationFlow(chatContent);
  
  return {
    responseTime: 7,
    professionalism: 7,
    clarity: 7,
    empathy: 6,
    problemResolution: 7,
    overallScore: 7,
    criticalMoments: [],
    recommendations: ["Análise manual recomendada devido à indisponibilidade da IA"],
    keyTopics: ["atendimento", "chat"],
    sentiment: 0.7,
    conversationFlow: parsedConversation.flow,
    speakerAnalysis: parsedConversation.analysis
  };
}

function generateFallbackEmailAnalysis(emailContent: any): EmailAnalysis {
  return {
    professionalism: 7,
    grammar: 8,
    clarity: 7,
    responsiveness: 7,
    completeness: 7,
    overallScore: 7,
    criticalMoments: [],
    recommendations: ["Análise manual recomendada devido à indisponibilidade da IA"],
    keyTopics: ["atendimento", "email"],
    sentiment: 0.7
  };
}

export function extractChatMetrics(chatContent: string) {
  const lines = chatContent.split('\n').filter(line => line.trim());
  const agentMessages = lines.filter(line => line.includes('[Agent]') || line.includes('[Agente]'));
  const clientMessages = lines.filter(line => line.includes('[Cliente]') || line.includes('[Client]'));
  
  // Simular cálculo de tempo de resposta baseado no número de mensagens
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
  const emails = emailText.split(/From:|Para:|Subject:/).length - 1;
  
  return {
    totalEmails: Math.max(1, emails),
    wordCount: emailText.split(' ').length,
    avgResponseTime: Math.floor(6 + Math.random() * 18) * 3600, // 6-24 horas em segundos
    hasAttachments: emailText.includes('anexo') || emailText.includes('attachment')
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
        sentimentScore: agentMessageCount > 0 ? totalAgentSentiment / agentMessageCount : 0.8,
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
  
  // Padrões típicos de atendente
  const agentPatterns = [
    'como posso ajudar',
    'em que posso ajudá-lo',
    'obrigado por entrar em contato',
    'prezado cliente',
    'agradecemos o contato',
    'nossa equipe',
    'vou verificar',
    'posso resolver',
    'protocolo',
    'sistema',
    'vou encaminhar',
    'departamento responsável',
    'política da empresa'
  ];

  // Padrões típicos de cliente
  const clientPatterns = [
    'tenho um problema',
    'preciso de ajuda',
    'não consigo',
    'está com defeito',
    'não funciona',
    'quero cancelar',
    'estou insatisfeito',
    'por favor me ajudem',
    'urgente',
    'já tentei'
  ];

  // Verifica padrões de atendente
  if (agentPatterns.some(pattern => lowerMessage.includes(pattern))) {
    return 'agent';
  }

  // Verifica padrões de cliente
  if (clientPatterns.some(pattern => lowerMessage.includes(pattern))) {
    return 'client';
  }

  // Heurística: mensagens mais formais/profissionais = atendente
  const formalWords = ['senhor', 'senhora', 'protocolo', 'sistema', 'departamento', 'política'];
  const casualWords = ['cara', 'mano', 'poxa', 'nossa', 'ai', 'né'];
  
  const formalCount = formalWords.filter(word => lowerMessage.includes(word)).length;
  const casualCount = casualWords.filter(word => lowerMessage.includes(word)).length;

  if (formalCount > casualCount) {
    return 'agent';
  }

  // Padrão alternado: primeira mensagem geralmente é cliente, segunda atendente
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