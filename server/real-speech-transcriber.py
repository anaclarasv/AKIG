#!/usr/bin/env python3
"""
Transcritor real usando Google Speech Recognition
Baseado exatamente na implementação do QualityCallMonitor
"""

import os
import sys
import json
import tempfile
import speech_recognition as sr
from pydub import AudioSegment
import logging

# Configurar logging
logging.basicConfig(level=logging.WARNING)

def transcribe_audio_real(file_path: str) -> dict:
    """
    Transcrição real usando Google Speech Recognition
    Exatamente como no QualityCallMonitor
    """
    try:
        print(f"Starting real transcription: {file_path}", file=sys.stderr)
        
        # Verificar se arquivo existe
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Carregar e converter áudio
        audio = AudioSegment.from_file(file_path)
        
        # Converter para mono e ajustar taxa de amostragem
        if audio.channels > 1:
            audio = audio.set_channels(1)
        audio = audio.set_frame_rate(16000)
        
        # Salvar como WAV temporário
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            audio.export(temp_file.name, format="wav")
            temp_wav_path = temp_file.name
        
        print(f"Audio converted to WAV: {temp_wav_path}", file=sys.stderr)
        
        # Usar SpeechRecognition para transcrição real
        recognizer = sr.Recognizer()
        recognizer.energy_threshold = 300
        recognizer.dynamic_energy_threshold = True
        
        with sr.AudioFile(temp_wav_path) as source:
            print("Adjusting for ambient noise...", file=sys.stderr)
            recognizer.adjust_for_ambient_noise(source, duration=1.0)
            print("Recording audio data...", file=sys.stderr)
            audio_data = recognizer.record(source)
        
        print("Starting speech recognition...", file=sys.stderr)
        
        # Tentar transcrição com Google Speech API
        try:
            transcript = recognizer.recognize_google(audio_data, language='pt-BR')
            print(f"Google Speech Recognition success: {len(transcript)} chars", file=sys.stderr)
            success = True
        except sr.UnknownValueError:
            transcript = "Áudio não foi reconhecido pelo sistema de transcrição"
            print("Google Speech Recognition could not understand audio", file=sys.stderr)
            success = False
        except sr.RequestError as e:
            transcript = f"Erro na solicitação do Google Speech Recognition: {e}"
            print(f"Google Speech Recognition request error: {e}", file=sys.stderr)
            success = False
        
        # Limpar arquivo temporário
        os.unlink(temp_wav_path)
        
        # Obter duração real do áudio
        duration = len(audio) / 1000.0  # Convert to seconds
        
        # Criar segmentos baseados na transcrição real
        segments = []
        if transcript and success:
            # Dividir o texto em segmentos menores se for longo
            words = transcript.split()
            if len(words) > 10:
                # Criar múltiplos segmentos para textos longos
                words_per_segment = 15
                segment_count = (len(words) + words_per_segment - 1) // words_per_segment
                
                for i in range(segment_count):
                    start_word = i * words_per_segment
                    end_word = min((i + 1) * words_per_segment, len(words))
                    segment_text = " ".join(words[start_word:end_word])
                    
                    start_time = (duration / segment_count) * i
                    end_time = (duration / segment_count) * (i + 1)
                    speaker = 'agent' if i % 2 == 0 else 'client'
                    
                    segments.append({
                        'id': f'segment_{i}',
                        'speaker': speaker,
                        'text': segment_text,
                        'startTime': start_time,
                        'endTime': end_time,
                        'confidence': 0.9 if success else 0.5,
                        'criticalWords': []
                    })
            else:
                # Texto curto - um único segmento
                segments.append({
                    'id': 'segment_0',
                    'speaker': 'agent',
                    'text': transcript,
                    'startTime': 0,
                    'endTime': duration,
                    'confidence': 0.9 if success else 0.5,
                    'criticalWords': []
                })
        else:
            # Fallback se não conseguir transcrever
            segments.append({
                'id': 'segment_0',
                'speaker': 'system',
                'text': transcript,
                'startTime': 0,
                'endTime': duration,
                'confidence': 0.1,
                'criticalWords': []
            })
        
        result = {
            'text': transcript,
            'segments': segments,
            'duration': duration,
            'success': success,
            'audio_properties': {
                'duration': duration,
                'channels': audio.channels,
                'frame_rate': audio.frame_rate,
                'sample_width': audio.sample_width
            }
        }
        
        print(f"Transcription completed: {len(segments)} segments, success: {success}", file=sys.stderr)
        return result
        
    except Exception as e:
        print(f"Transcription error: {e}", file=sys.stderr)
        return {
            'text': f"Erro na transcrição: {str(e)}",
            'segments': [],
            'duration': 60.0,
            'success': False,
            'error': str(e)
        }

def main():
    """Função principal"""
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Caminho do arquivo necessário'}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        result = transcribe_audio_real(file_path)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()