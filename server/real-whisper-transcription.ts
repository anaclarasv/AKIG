import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function transcribeAudioWithWhisper(audioFilePath: string): Promise<{
  text: string;
  segments: Array<{
    id: string;
    speaker: string;
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
    criticalWords: string[];
  }>;
  duration: number;
  success: boolean;
  transcription_engine: string;
  error?: string;
}> {
  try {
    console.log(`Starting Whisper transcription for: ${audioFilePath}`);
    
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    const fileStats = fs.statSync(audioFilePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    
    console.log(`File size: ${fileSizeMB.toFixed(2)}MB`);
    
    // Check file size limit (25MB for Whisper API)
    if (fileStats.size > 25 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 25MB for Whisper API.');
    }

    // Create readable stream for OpenAI
    const audioStream = fs.createReadStream(audioFilePath);
    
    console.log('Calling OpenAI Whisper API...');
    
    // Call OpenAI Whisper API with timeout
    const transcriptionPromise = openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
      language: "pt", // Portuguese
      response_format: "verbose_json",
      timestamp_granularities: ["segment"]
    });

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI Whisper API timeout after 60 seconds')), 60000);
    });

    const transcription = await Promise.race([transcriptionPromise, timeoutPromise]) as any;

    console.log('Whisper API response received');

    if (!transcription.text || transcription.text.trim().length === 0) {
      return {
        text: "Whisper processou o arquivo mas não detectou conteúdo de fala clara.",
        segments: [],
        duration: 60.0,
        success: false,
        transcription_engine: 'openai_whisper',
        error: 'No speech detected'
      };
    }

    // Process segments from Whisper
    const segments = [];
    if (transcription.segments && transcription.segments.length > 0) {
      for (let i = 0; i < transcription.segments.length; i++) {
        const segment = transcription.segments[i];
        
        segments.push({
          id: `segment_${i}`,
          speaker: detectSpeaker(segment.text, i),
          text: segment.text.trim(),
          startTime: segment.start,
          endTime: segment.end,
          confidence: 0.9, // Whisper doesn't provide segment-level confidence
          criticalWords: detectCriticalWords(segment.text)
        });
      }
    } else {
      // Create single segment if no timestamp data
      segments.push({
        id: 'segment_0',
        speaker: 'unknown',
        text: transcription.text.trim(),
        startTime: 0,
        endTime: transcription.duration || 60,
        confidence: 0.9,
        criticalWords: detectCriticalWords(transcription.text)
      });
    }

    const result = {
      text: transcription.text.trim(),
      segments,
      duration: transcription.duration || calculateDurationFromSegments(segments),
      success: true,
      transcription_engine: 'openai_whisper',
      segments_count: segments.length
    };

    console.log(`Transcription completed: ${result.text.length} characters, ${segments.length} segments`);
    return result;

  } catch (error: any) {
    console.error('Whisper transcription error:', error);
    
    if (error.message?.includes('API key')) {
      return {
        text: "Erro: Chave da API OpenAI não configurada. Configure OPENAI_API_KEY nas variáveis de ambiente.",
        segments: [],
        duration: 60.0,
        success: false,
        transcription_engine: 'openai_whisper',
        error: 'API key not configured'
      };
    }

    return {
      text: `Erro na transcrição com Whisper: ${error.message}`,
      segments: [],
      duration: 60.0,
      success: false,
      transcription_engine: 'openai_whisper',
      error: error.message
    };
  }
}

function detectSpeaker(text: string, index: number): string {
  // Basic speaker detection based on content patterns
  const lowerText = text.toLowerCase();
  
  // Agent patterns
  if (lowerText.includes('bom dia') || 
      lowerText.includes('boa tarde') || 
      lowerText.includes('posso ajudar') ||
      lowerText.includes('atendimento') ||
      lowerText.includes('empresa')) {
    return 'agent';
  }
  
  // Client patterns  
  if (lowerText.includes('problema') ||
      lowerText.includes('reclamação') ||
      lowerText.includes('quero falar') ||
      lowerText.includes('não funciona')) {
    return 'client';
  }
  
  // Alternate by index if no clear pattern
  return index % 2 === 0 ? 'agent' : 'client';
}

function detectCriticalWords(text: string): string[] {
  const criticalKeywords = [
    'problema', 'reclamação', 'irritado', 'chateado', 'péssimo', 
    'ruim', 'terrível', 'inaceitável', 'absurdo', 'revoltante',
    'cancelar', 'processo', 'advogado', 'justiça', 'procon',
    'gerente', 'supervisor', 'responsável', 'diretor'
  ];
  
  const lowerText = text.toLowerCase();
  return criticalKeywords.filter(keyword => lowerText.includes(keyword));
}

function calculateDurationFromSegments(segments: any[]): number {
  if (segments.length === 0) return 60;
  
  const lastSegment = segments[segments.length - 1];
  return lastSegment.endTime || 60;
}

export function analyzeWhisperTranscription(transcriptionResult: any): any {
  if (!transcriptionResult.success || !transcriptionResult.text) {
    return {
      sentiment: 0.5,
      confidence: 0.3,
      criticalMoments: [],
      recommendations: ["Transcrição não disponível para análise"],
      summary: "Falha na transcrição"
    };
  }

  const text = transcriptionResult.text.toLowerCase();
  const segments = transcriptionResult.segments || [];
  
  // Count critical words across all segments
  let totalCriticalWords = 0;
  const criticalMoments = [];
  
  segments.forEach((segment: any, index: number) => {
    const criticalWords = segment.criticalWords || [];
    totalCriticalWords += criticalWords.length;
    
    if (criticalWords.length > 0) {
      criticalMoments.push({
        timestamp: segment.startTime,
        text: segment.text,
        keywords: criticalWords,
        severity: criticalWords.length > 2 ? 'high' : 'medium'
      });
    }
  });

  // Sentiment analysis based on content
  let sentiment = 0.7; // Default neutral-positive
  
  if (text.includes('problema') || text.includes('reclamação')) {
    sentiment -= 0.2;
  }
  if (text.includes('irritado') || text.includes('chateado')) {
    sentiment -= 0.3;
  }
  if (text.includes('obrigado') || text.includes('excelente')) {
    sentiment += 0.2;
  }
  
  sentiment = Math.max(0, Math.min(1, sentiment));

  return {
    sentiment,
    confidence: 0.85,
    criticalMoments,
    recommendations: generateRecommendations(sentiment, totalCriticalWords),
    summary: `Transcrição real processada com ${segments.length} segmentos. ${totalCriticalWords} palavras críticas detectadas.`
  };
}

function generateRecommendations(sentiment: number, criticalCount: number): string[] {
  const recommendations = [];
  
  if (sentiment < 0.4) {
    recommendations.push("Cliente demonstra insatisfação - considere escalonamento");
    recommendations.push("Revisar protocolos de atendimento para situações críticas");
  }
  
  if (criticalCount > 3) {
    recommendations.push("Múltiplas palavras críticas detectadas - monitorar de perto");
    recommendations.push("Considerar intervenção do supervisor em tempo real");
  }
  
  if (sentiment > 0.7 && criticalCount === 0) {
    recommendations.push("Atendimento positivo - usar como exemplo de boas práticas");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Atendimento dentro dos padrões normais");
  }
  
  return recommendations;
}