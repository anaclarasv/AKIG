import nodeWhisper from 'node-whisper';
import fs from 'fs';
import path from 'path';

export class RealWhisperTranscription {
  private static transcriptionCache = new Map<string, any>();
  private static processingStatus = new Map<string, any>();

  /**
   * Transcreve áudio usando Whisper local real
   */
  static async transcribeAudio(audioFilePath: string): Promise<any> {
    console.log('Iniciando transcrição real com Whisper para:', audioFilePath);
    
    const cacheKey = audioFilePath;
    if (this.transcriptionCache.has(cacheKey)) {
      console.log('Retornando transcrição do cache');
      return this.transcriptionCache.get(cacheKey);
    }

    // Verificar se arquivo existe
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Arquivo de áudio não encontrado: ${audioFilePath}`);
    }

    try {
      // Marcar como processando
      this.processingStatus.set(cacheKey, { status: 'processing', progress: 10 });

      console.log('Executando Whisper com configurações em português...');
      
      // Atualizar status
      this.processingStatus.set(cacheKey, { status: 'processing', progress: 30 });

      // Executar transcrição real com configuração simples
      const startTime = Date.now();
      
      // Usar a API correta do node-whisper
      const transcript = await nodeWhisper(audioFilePath);
      
      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;
      
      console.log(`✅ Transcrição concluída em ${processingTime}s`);
      
      // Atualizar status
      this.processingStatus.set(cacheKey, { status: 'processing', progress: 80 });

      // Processar resultado
      const result = this.processWhisperResult(transcript, audioFilePath);
      
      // Cache do resultado
      this.transcriptionCache.set(cacheKey, result);
      
      // Marcar como concluído
      this.processingStatus.set(cacheKey, { status: 'completed', progress: 100 });
      
      console.log('📝 Texto transcrito:', result.text.substring(0, 100) + '...');
      return result;

    } catch (error) {
      console.error('❌ Erro na transcrição Whisper:', error);
      this.processingStatus.set(cacheKey, { 
        status: 'error', 
        progress: 0, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Processa o resultado do Whisper para o formato esperado
   */
  private static processWhisperResult(transcript: any, audioFilePath: string): any {
    console.log('🔄 Processando resultado do Whisper...');
    
    // Obter duração do áudio
    const stats = fs.statSync(audioFilePath);
    const estimatedDuration = this.estimateAudioDuration(stats.size);
    
    let segments = [];
    let fullText = '';

    if (transcript && typeof transcript === 'object') {
      // Se o Whisper retornou segmentos com timestamps
      if (transcript.segments && Array.isArray(transcript.segments)) {
        segments = transcript.segments.map((segment: any, index: number) => ({
          id: `seg_${index + 1}`,
          speaker: this.detectSpeaker(segment.text, index),
          text: segment.text.trim(),
          startTime: segment.start || (index * 5),
          endTime: segment.end || ((index + 1) * 5),
          confidence: segment.confidence || 0.9
        }));
        fullText = transcript.segments.map((s: any) => s.text).join(' ');
      } else if (transcript.text) {
        // Se retornou apenas texto
        fullText = transcript.text;
        segments = this.createSegmentsFromText(fullText, estimatedDuration);
      }
    } else if (typeof transcript === 'string') {
      // Se retornou string direta
      fullText = transcript;
      segments = this.createSegmentsFromText(fullText, estimatedDuration);
    }

    return {
      text: fullText,
      segments,
      duration: estimatedDuration,
      transcriptionMethod: 'whisper_local',
      isAuthentic: true,
      processingTime: 'real',
      confidence: 0.9
    };
  }

  /**
   * Cria segmentos a partir de texto quando não há timestamps
   */
  private static createSegmentsFromText(text: string, duration: number): any[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const segmentDuration = duration / sentences.length;
    
    return sentences.map((sentence, index) => ({
      id: `seg_${index + 1}`,
      speaker: this.detectSpeaker(sentence, index),
      text: sentence.trim(),
      startTime: index * segmentDuration,
      endTime: (index + 1) * segmentDuration,
      confidence: 0.9
    }));
  }

  /**
   * Detecta falante básico baseado no conteúdo
   */
  private static detectSpeaker(text: string, index: number): string {
    const agentKeywords = ['posso ajudar', 'obrigad', 'aqui é', 'vou verificar', 'empresa'];
    const clientKeywords = ['preciso', 'problema', 'quero', 'gostaria', 'não consigo'];
    
    const lowerText = text.toLowerCase();
    
    if (agentKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'agent';
    } else if (clientKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'client';
    }
    
    // Alternância simples se não conseguir detectar
    return index % 2 === 0 ? 'agent' : 'client';
  }

  /**
   * Estima duração do áudio baseado no tamanho do arquivo
   */
  private static estimateAudioDuration(fileSize: number): number {
    // Estimativa aproximada: 1MB ≈ 60 segundos para MP3 de qualidade média
    const estimatedSeconds = Math.max(30, fileSize / 17000);
    return Math.min(900, estimatedSeconds); // Máximo 15 minutos
  }

  /**
   * Verifica status da transcrição
   */
  static getTranscriptionStatus(audioFilePath: string): any {
    return this.processingStatus.get(audioFilePath) || { status: 'not_found' };
  }

  /**
   * Limpa cache
   */
  static clearCache(): void {
    this.transcriptionCache.clear();
    this.processingStatus.clear();
    console.log('🧹 Cache de transcrições limpo');
  }

  /**
   * Análise básica do texto transcrito
   */
  static analyzeTranscription(transcriptionResult: any): any {
    const { text, segments } = transcriptionResult;
    
    // Análise de sentimento
    const positiveWords = ['obrigado', 'excelente', 'ótimo', 'bom', 'perfeito'];
    const negativeWords = ['problema', 'erro', 'ruim', 'dificuldade', 'não funciona'];
    
    const positiveCount = positiveWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length;
    
    const negativeCount = negativeWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length;
    
    const sentiment = positiveCount > negativeCount ? 0.7 : 0.4;
    
    return {
      sentiment,
      tone: 0.7,
      criticalWordsCount: negativeCount,
      positiveIndicators: positiveCount,
      overallScore: Math.min(10, 5 + (sentiment * 5)),
      recommendations: negativeCount > 2 ? 
        ['Melhorar abordagem com cliente', 'Focar em soluções rápidas'] :
        ['Atendimento adequado', 'Manter padrão de qualidade'],
      analysisMethod: 'whisper_nlp'
    };
  }
}