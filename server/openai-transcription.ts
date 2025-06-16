import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export interface OpenAITranscriptionResult {
  text: string;
  segments: Array<{
    id: string;
    speaker: string;
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  duration: number;
  confidence: number;
  audioUrl?: string;
}

export class OpenAITranscriber {
  /**
   * Transcreve áudio usando OpenAI Whisper API
   */
  static async transcribeAudio(audioFilePath: string): Promise<OpenAITranscriptionResult> {
    try {
      if (!fs.existsSync(audioFilePath)) {
        throw new Error('Arquivo de áudio não encontrado');
      }

      const audioFile = fs.createReadStream(audioFilePath);
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment']
      });

      // Processar transcrição do OpenAI
      const processedResult = this.processOpenAITranscription(transcription, audioFilePath);
      
      return processedResult;
    } catch (error: any) {
      console.error('Erro na transcrição OpenAI:', error);
      throw new Error(`Erro na transcrição: ${error?.message || 'Erro desconhecido'}`);
    }
  }

  /**
   * Processa resultado da transcrição OpenAI
   */
  private static processOpenAITranscription(transcription: any, audioFilePath: string): OpenAITranscriptionResult {
    const segments = [];
    
    if (transcription.segments && transcription.segments.length > 0) {
      transcription.segments.forEach((segment: any, index: number) => {
        // Determinar speaker baseado no padrão de alternância
        const speaker = index % 2 === 0 ? 'agent' : 'client';
        
        segments.push({
          id: `segment_${index}`,
          speaker: speaker,
          text: segment.text.trim(),
          startTime: segment.start,
          endTime: segment.end,
          confidence: 0.9 // OpenAI não fornece confidence por segmento
        });
      });
    }

    return {
      text: transcription.text || '',
      segments: segments,
      duration: transcription.duration || 0,
      confidence: 0.9,
      audioUrl: audioFilePath
    };
  }

  /**
   * Analisa transcrição para insights de negócio
   */
  static analyzeTranscription(transcriptionResult: OpenAITranscriptionResult) {
    const text = transcriptionResult.text.toLowerCase();
    const segments = transcriptionResult.segments;
    
    // Análise de sentimento básica
    const positiveWords = ['obrigado', 'perfeito', 'excelente', 'ótimo', 'satisfeito', 'resolvido'];
    const negativeWords = ['problema', 'ruim', 'péssimo', 'insatisfeito', 'reclamação', 'cancelar'];
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    let sentiment = 0;
    if (positiveCount > negativeCount) sentiment = 1;
    else if (negativeCount > positiveCount) sentiment = -1;
    
    // Tópicos principais
    const keyTopics = [];
    if (text.includes('pedido')) keyTopics.push('Pedidos');
    if (text.includes('pagamento')) keyTopics.push('Pagamento');
    if (text.includes('entrega')) keyTopics.push('Entrega');
    if (text.includes('produto')) keyTopics.push('Produto');
    if (text.includes('suporte')) keyTopics.push('Suporte Técnico');
    
    // Momentos críticos
    const criticalMoments = [];
    segments.forEach((segment, index) => {
      const segmentText = segment.text.toLowerCase();
      if (negativeWords.some(word => segmentText.includes(word))) {
        criticalMoments.push({
          timestamp: segment.startTime,
          description: `Possível insatisfação detectada: "${segment.text}"`,
          severity: 'medium' as const
        });
      }
    });
    
    // Score geral
    const score = Math.max(0, Math.min(100, 70 + (sentiment * 15) + (positiveCount * 5) - (negativeCount * 10)));
    
    return {
      sentiment,
      keyTopics,
      criticalMoments,
      recommendations: this.generateRecommendations(sentiment, negativeCount, keyTopics),
      score,
      silenceAnalysis: {
        totalSilenceTime: 0,
        silencePeriods: [],
        averageSilenceDuration: 0
      },
      criticalWordsFound: negativeWords.filter(word => text.includes(word)).map(word => ({
        word,
        count: (text.match(new RegExp(word, 'g')) || []).length,
        timestamps: segments
          .filter(s => s.text.toLowerCase().includes(word))
          .map(s => s.startTime)
      })),
      responseTimeAnalysis: {
        averageResponseTime: segments.length > 1 ? 
          segments.slice(1).reduce((acc, seg, i) => acc + (seg.startTime - segments[i].endTime), 0) / (segments.length - 1) : 0,
        maxResponseTime: 0,
        responseTimesBySegment: []
      }
    };
  }

  /**
   * Gera recomendações baseadas na análise
   */
  private static generateRecommendations(sentiment: number, negativeCount: number, keyTopics: string[]): string[] {
    const recommendations = [];
    
    if (sentiment < 0) {
      recommendations.push('Melhorar o tom e abordagem no atendimento');
      recommendations.push('Implementar treinamento adicional em resolução de conflitos');
    }
    
    if (negativeCount > 2) {
      recommendations.push('Revisar processos para reduzir pontos de atrito');
      recommendations.push('Considerar escalação para supervisor');
    }
    
    if (keyTopics.includes('Pagamento')) {
      recommendations.push('Verificar processos de cobrança e faturamento');
    }
    
    if (keyTopics.includes('Entrega')) {
      recommendations.push('Revisar logística e prazos de entrega');
    }
    
    if (sentiment >= 0) {
      recommendations.push('Manter padrão de qualidade no atendimento');
    }
    
    return recommendations;
  }
}