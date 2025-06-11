#!/usr/bin/env python3
"""
Transcritor usando Whisper local para processar conteúdo real do áudio
Sem APIs externas - processa o arquivo autêntico carregado
"""

import os
import sys
import json
import tempfile
import whisper
from pydub import AudioSegment

def transcribe_with_whisper(file_path: str) -> dict:
    """
    Transcrição real usando Whisper local
    Processa o conteúdo autêntico do arquivo de áudio
    """
    try:
        print(f"Loading Whisper model...", file=sys.stderr)
        
        # Carregar modelo Whisper (base é um bom compromisso entre velocidade e qualidade)
        model = whisper.load_model("base")
        
        print(f"Transcribing audio file: {file_path}", file=sys.stderr)
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")
        
        # Carregar áudio
        audio = AudioSegment.from_file(file_path)
        duration = len(audio) / 1000.0
        
        print(f"Audio loaded: {duration:.1f}s, {audio.channels} channels", file=sys.stderr)
        
        # Converter para mono se necessário
        if audio.channels > 1:
            audio = audio.set_channels(1)
            print("Converted to mono", file=sys.stderr)
        
        # Normalizar para 16kHz (padrão do Whisper)
        audio = audio.set_frame_rate(16000)
        
        # Salvar como WAV temporário
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            audio.export(temp_file.name, format="wav")
            temp_path = temp_file.name
        
        try:
            print("Starting Whisper transcription...", file=sys.stderr)
            
            # Transcrever com Whisper
            result = model.transcribe(
                temp_path,
                language='pt',  # Português
                word_timestamps=True,
                verbose=False
            )
            
            print(f"Whisper transcription completed", file=sys.stderr)
            
            # Processar resultado
            full_text = result['text'].strip()
            segments = []
            
            # Extrair segmentos com timestamps
            if 'segments' in result and result['segments']:
                for i, segment in enumerate(result['segments']):
                    # Alternar falantes (simplificado)
                    speaker = 'agent' if i % 2 == 0 else 'client'
                    
                    # Extrair palavras com timestamps se disponíveis
                    words = []
                    if 'words' in segment and segment['words']:
                        words = [word['word'] for word in segment['words']]
                        segment_text = ' '.join(words).strip()
                    else:
                        segment_text = segment['text'].strip()
                    
                    if segment_text:
                        segments.append({
                            'id': f'segment_{i}',
                            'speaker': speaker,
                            'text': segment_text,
                            'startTime': segment.get('start', 0),
                            'endTime': segment.get('end', duration),
                            'confidence': segment.get('confidence', 0.9),
                            'criticalWords': []
                        })
            else:
                # Se não há segmentos, criar um único segmento
                segments.append({
                    'id': 'segment_0',
                    'speaker': 'agent',
                    'text': full_text,
                    'startTime': 0,
                    'endTime': duration,
                    'confidence': 0.8,
                    'criticalWords': []
                })
            
            # Limpar arquivo temporário
            os.unlink(temp_path)
            
            result_data = {
                'text': full_text,
                'segments': segments,
                'duration': duration,
                'success': True,
                'transcription_engine': 'whisper_local',
                'segments_count': len(segments)
            }
            
            print(f"Real transcription completed: {len(segments)} segments, {len(full_text)} characters", file=sys.stderr)
            return result_data
            
        except Exception as whisper_error:
            print(f"Whisper transcription error: {whisper_error}", file=sys.stderr)
            # Limpar arquivo temporário
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            raise whisper_error
            
    except Exception as e:
        print(f"Transcription failed: {e}", file=sys.stderr)
        return {
            'text': f"Erro na transcrição com Whisper: {str(e)}",
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
        result = transcribe_with_whisper(file_path)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()