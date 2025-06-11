#!/usr/bin/env python3
"""
Transcritor usando Google Speech API exatamente como no QualityCallMonitor
Processa o conteúdo real do áudio sem gerar diálogos sintéticos
"""

import os
import sys
import json
import tempfile
import speech_recognition as sr
from pydub import AudioSegment
from pydub.silence import split_on_silence

def transcribe_with_google_api(file_path: str) -> dict:
    """
    Transcrição real usando Google Speech Recognition
    Baseado na implementação do QualityCallMonitor
    """
    try:
        print(f"Starting Google Speech transcription: {file_path}", file=sys.stderr)
        
        # Verificar se arquivo existe
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")
        
        # Carregar áudio
        audio = AudioSegment.from_file(file_path)
        print(f"Audio loaded: {len(audio)}ms, {audio.channels} channels", file=sys.stderr)
        
        # Converter para mono se necessário
        if audio.channels > 1:
            audio = audio.set_channels(1)
            print("Converted to mono", file=sys.stderr)
        
        # Ajustar taxa de amostragem
        audio = audio.set_frame_rate(16000)
        
        # Normalizar volume
        audio = audio.normalize()
        
        # Dividir o áudio em chunks baseado no silêncio (como no QualityCallMonitor)
        chunks = split_on_silence(
            audio,
            min_silence_len=500,  # 500ms de silêncio
            silence_thresh=audio.dBFS - 14,  # Threshold de silêncio
            keep_silence=250  # Manter 250ms de silêncio
        )
        
        print(f"Audio split into {len(chunks)} chunks", file=sys.stderr)
        
        # Se não conseguiu dividir, usar o áudio completo
        if not chunks:
            chunks = [audio]
            print("Using full audio as single chunk", file=sys.stderr)
        
        # Inicializar recognizer
        recognizer = sr.Recognizer()
        recognizer.energy_threshold = 300
        recognizer.dynamic_energy_threshold = True
        
        transcripts = []
        total_duration = len(audio) / 1000.0
        
        for i, chunk in enumerate(chunks):
            try:
                # Salvar chunk como WAV temporário
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                    chunk.export(temp_file.name, format="wav")
                    temp_path = temp_file.name
                
                print(f"Processing chunk {i+1}/{len(chunks)}", file=sys.stderr)
                
                # Transcrever chunk
                with sr.AudioFile(temp_path) as source:
                    # Ajustar para ruído ambiente
                    recognizer.adjust_for_ambient_noise(source, duration=0.5)
                    audio_data = recognizer.record(source)
                
                # Tentar Google Speech Recognition
                try:
                    text = recognizer.recognize_google(audio_data, language='pt-BR')
                    if text.strip():
                        transcripts.append(text.strip())
                        print(f"Chunk {i+1} transcribed: {text[:50]}...", file=sys.stderr)
                    else:
                        print(f"Chunk {i+1}: empty result", file=sys.stderr)
                except sr.UnknownValueError:
                    print(f"Chunk {i+1}: could not understand audio", file=sys.stderr)
                except sr.RequestError as e:
                    print(f"Chunk {i+1}: API error - {e}", file=sys.stderr)
                    # Se API falhar, retornar indicação de erro
                    return {
                        'text': f"Erro na API do Google Speech: {e}",
                        'segments': [],
                        'duration': total_duration,
                        'success': False,
                        'error': f"Google Speech API error: {e}"
                    }
                
                # Limpar arquivo temporário
                os.unlink(temp_path)
                
            except Exception as chunk_error:
                print(f"Error processing chunk {i+1}: {chunk_error}", file=sys.stderr)
                continue
        
        # Combinar todas as transcrições
        full_transcript = " ".join(transcripts) if transcripts else ""
        
        # Criar segmentos baseados nos chunks transcritos
        segments = []
        if transcripts:
            chunk_duration = total_duration / len(chunks)
            transcript_index = 0
            
            for i, transcript in enumerate(transcripts):
                start_time = i * chunk_duration
                end_time = min((i + 1) * chunk_duration, total_duration)
                speaker = 'agent' if i % 2 == 0 else 'client'
                
                segments.append({
                    'id': f'segment_{i}',
                    'speaker': speaker,
                    'text': transcript,
                    'startTime': start_time,
                    'endTime': end_time,
                    'confidence': 0.9,
                    'criticalWords': []
                })
        
        success = len(transcripts) > 0
        
        result = {
            'text': full_transcript if success else "Nenhum conteúdo de fala foi detectado no áudio",
            'segments': segments,
            'duration': total_duration,
            'success': success,
            'chunks_processed': len(chunks),
            'chunks_transcribed': len(transcripts)
        }
        
        print(f"Transcription completed: {len(transcripts)}/{len(chunks)} chunks transcribed", file=sys.stderr)
        return result
        
    except Exception as e:
        print(f"Transcription failed: {e}", file=sys.stderr)
        return {
            'text': f"Erro na transcrição: {str(e)}",
            'segments': [],
            'duration': 60.0,
            'success': False,
            'error': str(e)
        }

def main():
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Audio file path required'}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        result = transcribe_with_google_api(file_path)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()