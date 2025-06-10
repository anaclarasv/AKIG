import fs from "fs";
import path from "path";

// Simplified real transcription using node-whisper
export async function transcribeAudioReal(audioFilePath: string): Promise<{
  text: string;
  duration: number;
  segments: Array<{
    id: string;
    speaker: 'agent' | 'client';
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
    criticalWords: string[];
  }>;
}> {
  console.log('Starting real audio transcription for:', audioFilePath);

  // Ensure file exists
  if (!fs.existsSync(audioFilePath)) {
    throw new Error(`Arquivo de áudio não encontrado: ${audioFilePath}`);
  }

  try {
    // Try to use node-whisper for real transcription
    const nodeWhisper = require('node-whisper');
    
    console.log('Executing node-whisper transcription...');
    
    // Basic configuration for Portuguese
    const result = await nodeWhisper(audioFilePath, {
      modelName: 'base',
      language: 'pt',
      whisperOptions: {
        outputInText: true,
        outputInJson: false,
        translateToEnglish: false,
        wordTimestamps: false,
        temperature: 0.0
      }
    });

    let transcribedText = '';
    
    // Extract text from various possible result formats
    if (typeof result === 'string') {
      transcribedText = result;
    } else if (result && result.transcription) {
      transcribedText = result.transcription;
    } else if (result && result.text) {
      transcribedText = result.text;
    } else {
      throw new Error('Whisper não retornou texto válido');
    }

    if (!transcribedText || transcribedText.trim().length === 0) {
      throw new Error('Transcrição resultou em texto vazio');
    }

    console.log('Real transcription result:', transcribedText);

    // Get basic file info for duration estimation
    const stats = fs.statSync(audioFilePath);
    const estimatedDuration = Math.max(10, Math.min(stats.size / 16000, 300));

    // Process into segments with speaker detection
    const segments = processIntoSegments(transcribedText.trim(), estimatedDuration);

    return {
      text: transcribedText.trim(),
      duration: estimatedDuration,
      segments
    };

  } catch (whisperError) {
    console.error('Node-whisper failed:', whisperError);
    
    // If Whisper fails, return an error instead of fake content
    throw new Error(`Falha na transcrição real: ${whisperError.message || 'Erro desconhecido'}`);
  }
}

// Process real transcription into conversation segments
function processIntoSegments(text: string, duration: number): Array<{
  id: string;
  speaker: 'agent' | 'client';
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  criticalWords: string[];
}> {
  // Split text into natural segments (sentences/phrases)
  const sentences = text.split(/[.!?]+|\n+/).filter(s => s.trim().length > 3);
  
  if (sentences.length === 0) {
    return [];
  }

  const segments = [];
  const segmentDuration = duration / sentences.length;
  let currentSpeaker: 'agent' | 'client' = 'agent';

  sentences.forEach((sentence, index) => {
    const cleanText = sentence.trim();
    if (cleanText.length === 0) return;

    const startTime = index * segmentDuration;
    const endTime = Math.min((index + 1) * segmentDuration, duration);

    // Simple speaker detection based on conversation patterns
    const isGreeting = /^(olá|oi|bom dia|boa tarde|central|atendimento)/i.test(cleanText);
    const isQuestion = cleanText.includes('?') || /^(como|quando|onde|qual|por que|quanto)/i.test(cleanText);
    const isThankYou = /(obrigad|valeu|tá bom|ok|perfeito)/i.test(cleanText);

    // Agent typically starts, then alternate based on content
    if (index === 0 || isGreeting) {
      currentSpeaker = 'agent';
    } else if (isQuestion) {
      currentSpeaker = 'client';
    } else if (isThankYou) {
      currentSpeaker = 'client';
    } else {
      // Alternate speakers for natural flow
      currentSpeaker = currentSpeaker === 'agent' ? 'client' : 'agent';
    }

    const criticalWords = detectCriticalWords(cleanText);

    segments.push({
      id: `real_segment_${index + 1}`,
      speaker: currentSpeaker,
      text: cleanText,
      startTime: Math.round(startTime * 10) / 10,
      endTime: Math.round(endTime * 10) / 10,
      confidence: 0.85, // Reasonable confidence for real transcription
      criticalWords
    });
  });

  return segments;
}

// Detect critical words for customer service evaluation
function detectCriticalWords(text: string): string[] {
  const criticalPatterns = [
    'problema', 'erro', 'falha', 'demora', 'lento', 'ruim', 'péssimo',
    'obrigado', 'obrigada', 'perfeito', 'excelente', 'ótimo', 'bom',
    'atendimento', 'suporte', 'técnico', 'conta', 'cartão', 'fatura',
    'urgente', 'rápido', 'agora', 'hoje', 'resolver', 'ajudar'
  ];

  const words = text.toLowerCase().split(/\s+/);
  return criticalPatterns.filter(pattern => 
    words.some(word => word.includes(pattern) || pattern.includes(word))
  );
}

// Simple analysis for real transcription
export function analyzeRealTranscription(transcriptionResult: any): any {
  const { text, segments } = transcriptionResult;
  
  // Count positive and negative indicators
  const positiveWords = ['obrigado', 'perfeito', 'excelente', 'ótimo', 'bom', 'resolver', 'ajudar'];
  const negativeWords = ['problema', 'erro', 'falha', 'ruim', 'péssimo', 'demora', 'lento'];
  
  const lowercaseText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowercaseText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowercaseText.includes(word)).length;
  
  // Calculate sentiment score
  const sentimentScore = Math.max(0.1, Math.min(1.0, 0.5 + (positiveCount - negativeCount) * 0.1));
  
  return {
    sentiment: sentimentScore,
    tone: sentimentScore > 0.7 ? 'positive' : sentimentScore < 0.3 ? 'negative' : 'neutral',
    criticalWords: segments.flatMap((s: any) => s.criticalWords || []),
    recommendations: generateRecommendations(sentimentScore, negativeCount),
    summary: `Transcrição real processada com ${segments.length} segmentos`
  };
}

function generateRecommendations(sentiment: number, negativeCount: number): string[] {
  const recommendations = [];
  
  if (sentiment < 0.4) {
    recommendations.push('Melhorar abordagem para reduzir tensão do cliente');
  }
  
  if (negativeCount > 2) {
    recommendations.push('Focar em soluções rápidas para problemas identificados');
  }
  
  if (sentiment > 0.8) {
    recommendations.push('Excelente atendimento, manter padrão de qualidade');
  }
  
  return recommendations;
}