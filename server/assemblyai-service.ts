import { AssemblyAI } from 'assemblyai';
import fs from 'fs';
import path from 'path';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!
});

export interface TranscriptionSegment {
  id: string;
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  criticalWords: string[];
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  duration: number;
  confidence: number;
  audioUrl?: string;
}

export interface AIAnalysis {
  sentiment: number;
  keyTopics: string[];
  criticalMoments: Array<{
    timestamp: number;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  recommendations: string[];
  score: number;
  silenceAnalysis: {
    totalSilenceTime: number;
    silencePeriods: Array<{
      startTime: number;
      endTime: number;
      duration: number;
    }>;
    averageSilenceDuration: number;
  };
  criticalWordsFound: Array<{
    word: string;
    count: number;
    timestamps: number[];
  }>;
  responseTimeAnalysis: {
    averageResponseTime: number;
    maxResponseTime: number;
    responseTimesBySegment: Array<{
      segmentId: string;
      responseTime: number;
    }>;
  };
}

const CRITICAL_WORDS = [
  'problema', 'reclamação', 'insatisfeito', 'cancelar', 'cancelamento',
  'resolver', 'solução', 'ajuda', 'dificuldade', 'erro', 'falha',
  'demora', 'atraso', 'urgente', 'importante', 'supervisor',
  'gerente', 'satisfeito', 'obrigado', 'excelente', 'ótimo'
];

export async function transcribeAudioWithAssemblyAI(audioFilePath: string): Promise<TranscriptionResult> {
  try {
    console.log(`Starting AssemblyAI transcription for: ${audioFilePath}`);
    
    // Upload audio file to AssemblyAI
    const audioFile = fs.readFileSync(audioFilePath);
    const uploadUrl = await client.files.upload(audioFile);
    
    console.log('Audio uploaded to AssemblyAI, starting transcription...');
    
    // Configure transcription with speaker diarization and sentiment analysis
    const config = {
      audio_url: uploadUrl,
      speaker_labels: true,
      auto_highlights: true,
      sentiment_analysis: true,
      punctuate: true,
      format_text: true,
      language_code: 'pt'
    };
    
    // Start transcription
    const transcript = await client.transcripts.transcribe(config);
    
    if (transcript.status === 'error') {
      throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
    }
    
    console.log('AssemblyAI transcription completed successfully');
    
    // Process segments with speaker diarization
    const segments: TranscriptionSegment[] = [];
    
    if (transcript.utterances) {
      transcript.utterances.forEach((utterance, index) => {
        const criticalWords = CRITICAL_WORDS.filter(word => 
          utterance.text.toLowerCase().includes(word.toLowerCase())
        );
        
        segments.push({
          id: `segment_${index}`,
          speaker: utterance.speaker === 'A' ? 'agent' : 'client',
          text: utterance.text,
          startTime: utterance.start / 1000, // Convert to seconds
          endTime: utterance.end / 1000,
          confidence: utterance.confidence,
          criticalWords
        });
      });
    } else if (transcript.words) {
      // Fallback: group words into segments if utterances not available
      const wordsPerSegment = 50;
      for (let i = 0; i < transcript.words.length; i += wordsPerSegment) {
        const segmentWords = transcript.words.slice(i, i + wordsPerSegment);
        const text = segmentWords.map(w => w.text).join(' ');
        const criticalWords = CRITICAL_WORDS.filter(word => 
          text.toLowerCase().includes(word.toLowerCase())
        );
        
        segments.push({
          id: `segment_${Math.floor(i / wordsPerSegment)}`,
          speaker: Math.floor(i / wordsPerSegment) % 2 === 0 ? 'agent' : 'client',
          text,
          startTime: segmentWords[0]?.start / 1000 || 0,
          endTime: segmentWords[segmentWords.length - 1]?.end / 1000 || 0,
          confidence: segmentWords.reduce((acc, w) => acc + w.confidence, 0) / segmentWords.length,
          criticalWords
        });
      }
    }
    
    return {
      text: transcript.text || '',
      segments,
      duration: (transcript.audio_duration || 0) / 1000,
      confidence: transcript.confidence || 0,
      audioUrl: uploadUrl
    };
    
  } catch (error) {
    console.error('AssemblyAI transcription error:', error);
    throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function analyzeTranscription(transcriptionResult: TranscriptionResult): AIAnalysis {
  const { text, segments, duration } = transcriptionResult;
  
  // Sentiment analysis
  const positiveWords = ['obrigado', 'satisfeito', 'excelente', 'ótimo', 'bom', 'perfeito'];
  const negativeWords = ['problema', 'reclamação', 'insatisfeito', 'ruim', 'péssimo', 'erro'];
  
  const positiveCount = positiveWords.filter(word => 
    text.toLowerCase().includes(word.toLowerCase())
  ).length;
  
  const negativeCount = negativeWords.filter(word => 
    text.toLowerCase().includes(word.toLowerCase())
  ).length;
  
  const sentiment = positiveCount > negativeCount ? 
    Math.min(0.8 + (positiveCount * 0.1), 1.0) : 
    Math.max(0.3 - (negativeCount * 0.1), 0.0);
  
  // Extract key topics
  const topicKeywords: { [key: string]: string[] } = {
    'atendimento': ['atendimento', 'atender', 'suporte'],
    'produto': ['produto', 'serviço', 'item'],
    'pagamento': ['pagamento', 'cobrança', 'fatura', 'boleto'],
    'entrega': ['entrega', 'envio', 'recebimento'],
    'cancelamento': ['cancelar', 'cancelamento', 'desistir']
  };
  
  const keyTopics = Object.keys(topicKeywords).filter(topic =>
    topicKeywords[topic].some((keyword: string) => 
      text.toLowerCase().includes(keyword.toLowerCase())
    )
  );
  
  // Identify critical moments
  const criticalMoments = segments
    .filter(segment => segment.criticalWords.length > 0)
    .map(segment => ({
      timestamp: segment.startTime,
      description: `Palavra-chave detectada: ${segment.criticalWords.join(', ')}`,
      severity: segment.criticalWords.some(word => 
        ['problema', 'reclamação', 'cancelar'].includes(word)
      ) ? 'high' as const : 'medium' as const
    }));
  
  // Analyze silence periods
  const silencePeriods = [];
  let totalSilenceTime = 0;
  
  for (let i = 0; i < segments.length - 1; i++) {
    const currentEnd = segments[i].endTime;
    const nextStart = segments[i + 1].startTime;
    const silenceDuration = nextStart - currentEnd;
    
    if (silenceDuration > 2) { // Silence longer than 2 seconds
      silencePeriods.push({
        startTime: currentEnd,
        endTime: nextStart,
        duration: silenceDuration
      });
      totalSilenceTime += silenceDuration;
    }
  }
  
  const averageSilenceDuration = silencePeriods.length > 0 
    ? totalSilenceTime / silencePeriods.length 
    : 0;
  
  // Analyze critical words
  const criticalWordsFound = [];
  CRITICAL_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    const matches = text.match(regex);
    if (matches) {
      const timestamps = [];
      segments.forEach(segment => {
        if (segment.text.toLowerCase().includes(word.toLowerCase())) {
          timestamps.push(segment.startTime);
        }
      });
      
      criticalWordsFound.push({
        word,
        count: matches.length,
        timestamps
      });
    }
  });
  
  // Analyze response times between speakers
  const responseTimesBySegment = [];
  let totalResponseTime = 0;
  let responseCount = 0;
  
  for (let i = 1; i < segments.length; i++) {
    const previousSpeaker = segments[i - 1].speaker;
    const currentSpeaker = segments[i].speaker;
    
    if (previousSpeaker !== currentSpeaker) {
      const responseTime = segments[i].startTime - segments[i - 1].endTime;
      responseTimesBySegment.push({
        segmentId: segments[i].id,
        responseTime
      });
      totalResponseTime += responseTime;
      responseCount++;
    }
  }
  
  const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
  const maxResponseTime = responseTimesBySegment.length > 0 
    ? Math.max(...responseTimesBySegment.map(r => r.responseTime))
    : 0;
  
  // Generate recommendations
  const recommendations = [];
  if (sentiment < 0.5) {
    recommendations.push('Revisar protocolo de atendimento para melhorar satisfação do cliente');
  }
  if (negativeCount > 2) {
    recommendations.push('Treinamento adicional em resolução de conflitos recomendado');
  }
  if (criticalMoments.length > 3) {
    recommendations.push('Supervisão mais próxima necessária para este tipo de chamada');
  }
  if (averageResponseTime > 5) {
    recommendations.push('Reduzir tempo de resposta entre falas');
  }
  if (totalSilenceTime > duration * 0.3) {
    recommendations.push('Reduzir períodos de silêncio excessivo');
  }
  if (recommendations.length === 0) {
    recommendations.push('Atendimento dentro dos padrões esperados');
  }
  
  // Calculate overall score with new metrics
  let score = Math.round(sentiment * 10);
  score -= Math.min(3, Math.floor(totalSilenceTime / duration * 10));
  score -= Math.min(2, Math.floor(averageResponseTime));
  score = Math.max(0, Math.min(10, score));
  
  return {
    sentiment,
    keyTopics,
    criticalMoments,
    recommendations,
    score,
    silenceAnalysis: {
      totalSilenceTime,
      silencePeriods,
      averageSilenceDuration
    },
    criticalWordsFound,
    responseTimeAnalysis: {
      averageResponseTime,
      maxResponseTime,
      responseTimesBySegment
    }
  };
}

export async function getTranscriptionStatus(transcriptId: string) {
  try {
    const transcript = await client.transcripts.get(transcriptId);
    return {
      status: transcript.status,
      progress: transcript.status === 'processing' ? 50 : transcript.status === 'completed' ? 100 : 0
    };
  } catch (error) {
    console.error('Error getting transcription status:', error);
    return { status: 'error', progress: 0 };
  }
}