import { storage } from './storage';
import { AudioTranscription } from './audio-transcription';
import fs from 'fs';
import path from 'path';

export async function processRealAudio57() {
  try {
    console.log('Processando áudio real da monitoria #57...');
    
    // Encontrar o arquivo de áudio da monitoria #57
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = fs.readdirSync(uploadsDir);
    
    // Procurar pelo arquivo de áudio mais recente (TESTECX.mp3)
    const audioFile = files.find(file => 
      file.includes('test') || file.includes('TESTECX') || file.includes('mp3')
    );
    
    if (!audioFile) {
      throw new Error('Arquivo de áudio não encontrado');
    }
    
    const audioFilePath = path.join(uploadsDir, audioFile);
    console.log('Arquivo encontrado:', audioFilePath);
    
    // Processar transcrição real usando sistema interno
    const transcriptionResult = await AudioTranscription.transcribeAudio(audioFilePath);
    
    // Analisar o conteúdo transcrito
    const analysisResult = AudioTranscription.analyzeTranscription(transcriptionResult);
    
    // Atualizar monitoria no banco
    const updateData = {
      transcription: transcriptionResult,
      aiAnalysis: analysisResult,
      status: 'completed' as const,
      duration: transcriptionResult.duration || 0,
      updatedAt: new Date()
    };
    
    await storage.updateMonitoringSession(57, updateData);
    
    console.log('Monitoria #57 processada com transcrição real');
    console.log('Análise:', analysisResult.summary);
    
    return {
      success: true,
      transcription: transcriptionResult,
      analysis: analysisResult
    };
    
  } catch (error) {
    console.error('Erro ao processar áudio real:', error);
    throw error;
  }
}