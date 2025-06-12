import OpenAI from "openai";
import fs from "fs";
import path from "path";

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function transcribeAudioWithOpenAI(audioFilePath: string): Promise<{
  text: string;
  segments: Array<{
    start: number;
    end: number;
    speaker: string;
    text: string;
    criticalWords: string[];
  }>;
  duration: number;
  confidence: number;
  transcription_engine: string;
  analysis: {
    sentiment: number;
    criticalWords: string[];
    topics: string[];
    recommendations: string[];
  };
}> {
  try {
    console.log(`Starting OpenAI Whisper transcription for: ${audioFilePath}`);
    
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    // Get file stats
    const stats = fs.statSync(audioFilePath);
    console.log(`File size: ${stats.size} bytes`);

    // Create a read stream for the audio file
    const audioStream = fs.createReadStream(audioFilePath);

    // Transcribe using OpenAI Whisper API
    // the newest OpenAI model is "whisper-1" which provides high-quality transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
      language: "pt", // Portuguese
      response_format: "verbose_json",
      timestamp_granularities: ["segment"]
    });

    console.log("OpenAI Whisper transcription completed successfully");
    console.log(`Transcribed text length: ${transcription.text.length} characters`);
    console.log(`Number of segments: ${transcription.segments?.length || 0}`);

    // Process the transcription into our format
    const processedSegments = processOpenAISegments(transcription);
    
    // Calculate duration
    const duration = transcription.duration || calculateDurationFromSegments(processedSegments);

    // Detect critical words
    const criticalWords = detectCriticalWords(transcription.text);

    // Analyze sentiment and generate recommendations
    const analysis = analyzeTranscriptionContent(transcription.text, criticalWords);

    return {
      text: transcription.text,
      segments: processedSegments,
      duration: duration,
      confidence: 0.95, // OpenAI Whisper typically has high confidence
      transcription_engine: "openai_whisper",
      analysis: analysis
    };

  } catch (error: any) {
    console.error("Error in OpenAI Whisper transcription:", error);
    throw new Error(`Failed to transcribe with OpenAI: ${error.message}`);
  }
}

function processOpenAISegments(transcription: any): Array<{
  start: number;
  end: number;
  speaker: string;
  text: string;
  criticalWords: string[];
}> {
  const segments = [];
  
  if (transcription.segments && transcription.segments.length > 0) {
    for (let i = 0; i < transcription.segments.length; i++) {
      const segment = transcription.segments[i];
      
      // Detect speaker based on content analysis
      const speaker = detectSpeaker(segment.text, i);
      
      // Detect critical words in this segment
      const criticalWords = detectCriticalWords(segment.text);
      
      segments.push({
        start: segment.start,
        end: segment.end,
        speaker: speaker,
        text: segment.text,
        criticalWords: criticalWords
      });
    }
  } else {
    // If no segments, create one segment with the full text
    segments.push({
      start: 0,
      end: transcription.duration || 60,
      speaker: "Desconhecido",
      text: transcription.text,
      criticalWords: detectCriticalWords(transcription.text)
    });
  }

  return segments;
}

function detectSpeaker(text: string, index: number): string {
  const lowerText = text.toLowerCase();
  
  // Keywords that suggest customer service agent
  const agentKeywords = [
    'bom dia', 'boa tarde', 'boa noite',
    'como posso ajudar', 'posso ajudá',
    'obrigad', 'de nada',
    'vou verificar', 'vou consultar',
    'posso oferecer', 'vamos resolver',
    'sinto muito', 'peço desculpas'
  ];
  
  // Keywords that suggest customer
  const customerKeywords = [
    'estou ligando', 'preciso de',
    'tenho um problema', 'gostaria de',
    'recebi', 'comprei',
    'não funciona', 'está quebrado',
    'quero reclamar', 'estou insatisfeit'
  ];
  
  // Check for agent keywords
  for (const keyword of agentKeywords) {
    if (lowerText.includes(keyword)) {
      return 'Atendente';
    }
  }
  
  // Keywords that suggest customer
  const customerKeywords = [
    'estou ligando', 'preciso de',
    'tenho um problema', 'gostaria de',
    'recebi', 'comprei',
    'não funciona', 'está quebrado',
    'quero reclamar', 'estou insatisfeit'
  ];
  
  // Check for customer keywords
  for (const keyword of customerKeywords) {
    if (lowerText.includes(keyword)) {
      return 'Cliente';
    }
  }
  
  // Alternate speakers if no clear indication
  return index % 2 === 0 ? 'Atendente' : 'Cliente';
}

function detectCriticalWords(text: string): string[] {
  const criticalKeywords = [
    'problema', 'problemas',
    'danificado', 'quebrado', 'defeito', 'defeituoso',
    'reclamação', 'reclamar',
    'insatisfeito', 'insatisfeita', 'insatisfação',
    'cancelar', 'cancelamento',
    'reembolso', 'devolver', 'devolução',
    'urgente', 'emergência',
    'transtorno', 'inconveniente',
    'atrasado', 'atraso',
    'errado', 'incorreto',
    'não funciona', 'não está funcionando'
  ];
  
  const foundWords = [];
  const lowerText = text.toLowerCase();
  
  for (const keyword of criticalKeywords) {
    if (lowerText.includes(keyword)) {
      foundWords.push(keyword);
    }
  }
  
  return foundWords;
}

function calculateDurationFromSegments(segments: any[]): number {
  if (segments.length === 0) return 0;
  
  const lastSegment = segments[segments.length - 1];
  return lastSegment.end || 60;
}

function analyzeTranscriptionContent(text: string, criticalWords: string[]): {
  sentiment: number;
  criticalWords: string[];
  topics: string[];
  recommendations: string[];
} {
  const lowerText = text.toLowerCase();
  
  // Sentiment analysis based on keywords
  const positiveWords = ['obrigad', 'excelente', 'ótimo', 'perfeito', 'satisfeit', 'bom'];
  const negativeWords = ['problema', 'ruim', 'péssimo', 'terrível', 'insatisfeit', 'reclamação'];
  
  let sentimentScore = 0.5; // neutral
  
  for (const word of positiveWords) {
    if (lowerText.includes(word)) sentimentScore += 0.1;
  }
  
  for (const word of negativeWords) {
    if (lowerText.includes(word)) sentimentScore -= 0.1;
  }
  
  sentimentScore = Math.max(0, Math.min(1, sentimentScore));
  
  // Extract topics
  const topics = extractTopics(text);
  
  // Generate recommendations
  const recommendations = generateRecommendations(sentimentScore, criticalWords.length);
  
  return {
    sentiment: sentimentScore,
    criticalWords: criticalWords,
    topics: topics,
    recommendations: recommendations
  };
}

function extractTopics(text: string): string[] {
  const topics = [];
  const lowerText = text.toLowerCase();
  
  const topicKeywords = {
    'produto': ['produto', 'item', 'mercadoria'],
    'entrega': ['entrega', 'entregar', 'envio', 'correios'],
    'pagamento': ['pagamento', 'cobrança', 'fatura', 'cartão'],
    'atendimento': ['atendimento', 'atender', 'suporte'],
    'devolução': ['devolução', 'devolver', 'trocar', 'troca'],
    'garantia': ['garantia', 'defeito', 'conserto']
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        topics.push(topic);
        break;
      }
    }
  }
  
  return topics;
}

function generateRecommendations(sentiment: number, criticalCount: number): string[] {
  const recommendations = [];
  
  if (sentiment < 0.4) {
    recommendations.push("Melhorar treinamento da equipe de atendimento");
    recommendations.push("Implementar follow-up proativo com clientes");
  }
  
  if (criticalCount > 2) {
    recommendations.push("Revisar processos de qualidade");
    recommendations.push("Aumentar monitoramento de produtos/serviços");
  }
  
  if (sentiment > 0.7) {
    recommendations.push("Documentar boas práticas do atendimento");
    recommendations.push("Reconhecer performance do agente");
  }
  
  return recommendations;
}