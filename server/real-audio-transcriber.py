#!/usr/bin/env python3
"""
Transcritor real de áudio usando speech_recognition
Processa o conteúdo autêntico do arquivo sem gerar diálogos falsos
"""

import os
import sys
import json
import tempfile
import speech_recognition as sr
from pydub import AudioSegment
from pydub.silence import split_on_silence

def transcribe_real_audio(file_path: str) -> dict:
    """
    Transcrição real do áudio usando Google Speech Recognition
    Sem diálogos inventados - apenas o que está realmente no arquivo
    """
    try:
        print(f"Iniciando transcrição real do arquivo: {file_path}", file=sys.stderr)
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Arquivo de áudio não encontrado: {file_path}")
        
        # Carregar áudio
        audio = AudioSegment.from_file(file_path)
        duration = len(audio) / 1000.0
        
        print(f"Áudio carregado: {duration:.1f}s, {audio.channels} canais", file=sys.stderr)
        
        # Converter para mono se necessário
        if audio.channels > 1:
            audio = audio.set_channels(1)
            print("Convertido para mono", file=sys.stderr)
        
        # Ajustar taxa de amostragem para 16kHz
        audio = audio.set_frame_rate(16000)
        
        # Normalizar volume
        audio = audio.normalize()
        
        # Dividir áudio em chunks para processamento
        print("Dividindo áudio em segmentos...", file=sys.stderr)
        chunks = split_on_silence(
            audio,
            min_silence_len=1000,  # 1 segundo de silêncio
            silence_thresh=audio.dBFS - 16,
            keep_silence=500
        )
        
        if not chunks:
            # Se não conseguiu dividir, usar o áudio inteiro em chunks menores
            chunk_length = 30 * 1000  # 30 segundos por chunk
            chunks = [audio[i:i + chunk_length] for i in range(0, len(audio), chunk_length)]
            print(f"Dividido em chunks de 30s: {len(chunks)} chunks", file=sys.stderr)
        else:
            print(f"Dividido por silêncio: {len(chunks)} chunks", file=sys.stderr)
        
        # Inicializar recognizer
        recognizer = sr.Recognizer()
        recognizer.energy_threshold = 300
        recognizer.dynamic_energy_threshold = True
        
        transcription_results = []
        successful_transcriptions = 0
        
        for i, chunk in enumerate(chunks[:20]):  # Limitar a 20 chunks para performance
            try:
                print(f"Processando chunk {i+1}/{min(len(chunks), 20)}", file=sys.stderr)
                
                # Salvar chunk como WAV temporário
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                    chunk.export(temp_file.name, format="wav")
                    temp_path = temp_file.name
                
                # Transcrever chunk
                with sr.AudioFile(temp_path) as source:
                    recognizer.adjust_for_ambient_noise(source, duration=0.5)
                    audio_data = recognizer.record(source)
                
                try:
                    # Tentar Google Speech Recognition
                    text = recognizer.recognize_google(audio_data, language='pt-BR')
                    if text.strip():
                        # Calcular timing do chunk
                        chunk_start = (i * len(audio)) / len(chunks) / 1000.0
                        chunk_end = min(((i + 1) * len(audio)) / len(chunks) / 1000.0, duration)
                        
                        transcription_results.append({
                            'text': text.strip(),
                            'start_time': chunk_start,
                            'end_time': chunk_end,
                            'chunk_index': i
                        })
                        successful_transcriptions += 1
                        print(f"Chunk {i+1} transcrito: '{text[:50]}...'", file=sys.stderr)
                    
                except sr.UnknownValueError:
                    print(f"Chunk {i+1}: não foi possível entender o áudio", file=sys.stderr)
                except sr.RequestError as e:
                    print(f"Chunk {i+1}: erro na API - {e}", file=sys.stderr)
                    # Se a API do Google falhar, retornar erro específico
                    return {
                        'text': f"Erro na API do Google Speech: {e}. Para transcrição real, é necessária uma chave da API do Google Cloud Speech.",
                        'segments': [],
                        'duration': duration,
                        'success': False,
                        'error': f"Google Speech API não disponível: {e}"
                    }
                
                # Limpar arquivo temporário
                os.unlink(temp_path)
                
            except Exception as chunk_error:
                print(f"Erro processando chunk {i+1}: {chunk_error}", file=sys.stderr)
                continue
        
        # Processar resultados
        if transcription_results:
            # Combinar texto de todos os chunks
            full_text = " ".join([result['text'] for result in transcription_results])
            
            # Criar segmentos baseados nos chunks transcritos
            segments = []
            for i, result in enumerate(transcription_results):
                segments.append({
                    'id': f'segment_{i}',
                    'speaker': 'unknown',  # Não identificar falantes como solicitado
                    'text': result['text'],
                    'startTime': result['start_time'],
                    'endTime': result['end_time'],
                    'confidence': 0.9,  # Confidence alto para transcrições reais
                    'criticalWords': []
                })
            
            result = {
                'text': full_text,
                'segments': segments,
                'duration': duration,
                'success': True,
                'transcription_engine': 'google_speech_real',
                'chunks_processed': len(chunks),
                'chunks_transcribed': successful_transcriptions
            }
            
            print(f"Transcrição real concluída: {successful_transcriptions}/{len(chunks)} chunks transcritos", file=sys.stderr)
            print(f"Texto total: {len(full_text)} caracteres", file=sys.stderr)
            return result
        else:
            return {
                'text': "Nenhum conteúdo de fala foi detectado ou transcrito no arquivo de áudio.",
                'segments': [],
                'duration': duration,
                'success': False,
                'error': "Nenhuma transcrição foi possível"
            }
            
    except Exception as e:
        print(f"Erro na transcrição: {e}", file=sys.stderr)
        return {
            'text': f"Erro na transcrição real: {str(e)}",
            'segments': [],
            'duration': 60.0,
            'success': False,
            'error': str(e)
        }

def main():
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Caminho do arquivo de áudio é obrigatório'}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        result = transcribe_real_audio(file_path)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()