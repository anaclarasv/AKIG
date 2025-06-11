#!/usr/bin/env python3
"""
Transcritor usando OpenAI Whisper local instalado
Processa o conteúdo real do áudio sem inventar diálogos
"""

import os
import sys
import json
import tempfile
import subprocess
from pydub import AudioSegment

def transcribe_with_local_whisper(file_path: str) -> dict:
    """
    Transcrição real usando Whisper local via linha de comando
    Processa o conteúdo autêntico do arquivo
    """
    try:
        print(f"Iniciando transcrição com Whisper local: {file_path}", file=sys.stderr)
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")
        
        # Carregar áudio
        audio = AudioSegment.from_file(file_path)
        duration = len(audio) / 1000.0
        
        print(f"Arquivo carregado: {duration:.1f}s, {audio.channels} canais", file=sys.stderr)
        
        # Converter para formato adequado ao Whisper
        if audio.channels > 1:
            audio = audio.set_channels(1)
        audio = audio.set_frame_rate(16000)
        
        # Salvar como WAV temporário
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            audio.export(temp_file.name, format="wav")
            temp_path = temp_file.name
        
        try:
            print("Executando Whisper...", file=sys.stderr)
            
            # Usar whisper via linha de comando
            cmd = [
                'whisper', 
                temp_path,
                '--model', 'base',
                '--language', 'pt',
                '--output_format', 'json',
                '--output_dir', '/tmp'
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            
            if result.returncode == 0:
                print("Whisper executado com sucesso", file=sys.stderr)
                
                # Encontrar arquivo JSON gerado
                base_name = os.path.splitext(os.path.basename(temp_path))[0]
                json_path = f"/tmp/{base_name}.json"
                
                if os.path.exists(json_path):
                    with open(json_path, 'r', encoding='utf-8') as f:
                        whisper_result = json.load(f)
                    
                    # Processar resultado do Whisper
                    full_text = whisper_result.get('text', '').strip()
                    segments = []
                    
                    if 'segments' in whisper_result and whisper_result['segments']:
                        for i, segment in enumerate(whisper_result['segments']):
                            segments.append({
                                'id': f'segment_{i}',
                                'speaker': 'unknown',
                                'text': segment.get('text', '').strip(),
                                'startTime': segment.get('start', 0),
                                'endTime': segment.get('end', duration),
                                'confidence': 0.9,  # Whisper não fornece confidence por segmento
                                'criticalWords': []
                            })
                    else:
                        # Se não há segmentos, criar um único
                        if full_text:
                            segments.append({
                                'id': 'segment_0',
                                'speaker': 'unknown',
                                'text': full_text,
                                'startTime': 0,
                                'endTime': duration,
                                'confidence': 0.9,
                                'criticalWords': []
                            })
                    
                    # Limpar arquivos temporários
                    os.unlink(temp_path)
                    os.unlink(json_path)
                    
                    if full_text:
                        result_data = {
                            'text': full_text,
                            'segments': segments,
                            'duration': duration,
                            'success': True,
                            'transcription_engine': 'whisper_local_cli',
                            'segments_count': len(segments)
                        }
                        
                        print(f"Transcrição concluída: {len(full_text)} caracteres, {len(segments)} segmentos", file=sys.stderr)
                        return result_data
                    else:
                        return {
                            'text': "Whisper processou o arquivo mas não detectou conteúdo de fala clara.",
                            'segments': [],
                            'duration': duration,
                            'success': False,
                            'note': 'Arquivo processado com Whisper mas sem transcrição resultado'
                        }
                else:
                    print(f"Arquivo JSON não encontrado: {json_path}", file=sys.stderr)
                    return {
                        'text': "Whisper executou mas não gerou arquivo de resultado.",
                        'segments': [],
                        'duration': duration,
                        'success': False,
                        'error': 'Arquivo de resultado não encontrado'
                    }
            else:
                print(f"Erro no Whisper: {result.stderr}", file=sys.stderr)
                return {
                    'text': f"Erro na execução do Whisper: {result.stderr}",
                    'segments': [],
                    'duration': duration,
                    'success': False,
                    'error': result.stderr
                }
                
        except subprocess.TimeoutExpired:
            print("Timeout na execução do Whisper", file=sys.stderr)
            os.unlink(temp_path)
            return {
                'text': "Timeout na transcrição - arquivo muito longo para processamento.",
                'segments': [],
                'duration': duration,
                'success': False,
                'error': 'Timeout'
            }
        except Exception as whisper_error:
            print(f"Erro no Whisper: {whisper_error}", file=sys.stderr)
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            return {
                'text': f"Erro na transcrição com Whisper: {str(whisper_error)}",
                'segments': [],
                'duration': duration,
                'success': False,
                'error': str(whisper_error)
            }
            
    except Exception as e:
        print(f"Erro geral: {e}", file=sys.stderr)
        return {
            'text': f"Erro no processamento do arquivo: {str(e)}",
            'segments': [],
            'duration': 60.0,
            'success': False,
            'error': str(e)
        }

def main():
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Caminho do arquivo é obrigatório'}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        result = transcribe_with_local_whisper(file_path)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()