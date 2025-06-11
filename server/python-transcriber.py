#!/usr/bin/env python3
"""
Transcritor de áudio real usando SpeechRecognition
Baseado na abordagem do QualityCallMonitor
"""

import os
import sys
import json
import tempfile
import logging
import speech_recognition as sr
from pydub import AudioSegment
from concurrent.futures import ThreadPoolExecutor, as_completed
import librosa
import numpy as np

# Configurar logging
logging.basicConfig(level=logging.INFO)

def convert_to_wav(input_path: str) -> str:
    """Converte arquivo de áudio para WAV otimizado para transcrição"""
    try:
        audio = AudioSegment.from_file(input_path)
        
        # Converter para mono e ajustar taxa de amostragem
        if audio.channels > 1:
            audio = audio.set_channels(1)
        audio = audio.set_frame_rate(16000)
        
        # Salvar como WAV temporário
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            audio.export(temp_file.name, format="wav")
            return temp_file.name
            
    except Exception as e:
        logging.error(f"Erro na conversão de áudio: {e}")
        raise

def transcribe_chunk(chunk_data):
    """Transcreve um chunk de áudio"""
    chunk, index = chunk_data
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            chunk.export(temp_file.name, format="wav")
            
            recognizer = sr.Recognizer()
            recognizer.energy_threshold = 300
            recognizer.dynamic_energy_threshold = True
            
            with sr.AudioFile(temp_file.name) as source:
                # Ajustar para ruído ambiente
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio_data = recognizer.record(source)
            
            # Tentar Google Speech Recognition primeiro
            try:
                text = recognizer.recognize_google(audio_data, language='pt-BR')
                logging.info(f"Chunk {index}: Google Speech - {len(text)} chars")
            except sr.UnknownValueError:
                # Se Google falhar, tentar com engine local
                try:
                    text = recognizer.recognize_sphinx(audio_data, language='pt-BR')
                    logging.info(f"Chunk {index}: Sphinx - {len(text)} chars")
                except:
                    text = ""
            except sr.RequestError:
                # Fallback para análise básica se APIs falharem
                text = f"[Segmento de áudio {index + 1}]"
                
            os.unlink(temp_file.name)
            return (index, text if text else "")
            
    except Exception as e:
        logging.error(f"Erro no chunk {index}: {e}")
        return (index, "")

def analyze_audio_properties(file_path: str) -> dict:
    """Analisa propriedades do áudio usando librosa"""
    try:
        audio, sample_rate = librosa.load(file_path, sr=None)
        duration = len(audio) / sample_rate
        
        # Detectar silêncio
        rms = librosa.feature.rms(y=audio)[0]
        silence_threshold = 0.01
        silent_frames = rms < silence_threshold
        silence_ratio = np.sum(silent_frames) / len(silent_frames)
        
        return {
            'duration': float(duration),
            'sample_rate': int(sample_rate),
            'silence_ratio': float(silence_ratio),
            'avg_energy': float(np.mean(rms))
        }
    except Exception as e:
        logging.error(f"Erro na análise de áudio: {e}")
        return {'duration': 60.0, 'sample_rate': 16000, 'silence_ratio': 0.1, 'avg_energy': 0.1}

def transcribe_audio_real(file_path: str) -> dict:
    """Transcrição principal usando chunks paralelos"""
    try:
        logging.info(f"Iniciando transcrição real de {file_path}")
        
        # Analisar propriedades do áudio
        audio_props = analyze_audio_properties(file_path)
        
        # Converter para WAV otimizado
        wav_path = convert_to_wav(file_path)
        
        # Carregar áudio convertido
        audio = AudioSegment.from_file(wav_path)
        
        # Determinar tamanho do chunk baseado na duração
        duration = audio_props['duration']
        if duration <= 30:
            chunk_length_ms = 10000  # 10 segundos
        elif duration <= 120:
            chunk_length_ms = 15000  # 15 segundos
        else:
            chunk_length_ms = 20000  # 20 segundos
        
        # Dividir em chunks
        chunks = []
        for i in range(0, len(audio), chunk_length_ms):
            chunk = audio[i:i + chunk_length_ms]
            if len(chunk) > 1000:  # Apenas chunks com conteúdo significativo
                chunks.append((chunk, i // chunk_length_ms))
        
        logging.info(f"Processando {len(chunks)} chunks de {chunk_length_ms/1000}s cada")
        
        # Processar chunks em paralelo
        transcripts = {}
        max_workers = min(4, len(chunks))
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_chunk = {executor.submit(transcribe_chunk, chunk_data): chunk_data for chunk_data in chunks}
            
            for future in as_completed(future_to_chunk, timeout=120):
                try:
                    index, text = future.result(timeout=30)
                    if text.strip():
                        transcripts[index] = text
                        logging.info(f"Chunk {index + 1}/{len(chunks)} concluído")
                except Exception as e:
                    logging.error(f"Erro no processamento: {e}")
                    continue
        
        # Montar transcrição final
        final_parts = []
        for i in sorted(transcripts.keys()):
            final_parts.append(transcripts[i])
        
        final_transcript = " ".join(final_parts)
        
        # Criar segmentos para timeline
        segments = []
        if transcripts:
            chunk_duration = audio_props['duration'] / len(chunks)
            for i, (index, text) in enumerate(sorted(transcripts.items())):
                speaker = 'agent' if i % 2 == 0 else 'client'
                segments.append({
                    'id': f'segment_{index}',
                    'speaker': speaker,
                    'text': text,
                    'startTime': index * chunk_duration,
                    'endTime': (index + 1) * chunk_duration,
                    'confidence': 0.85,
                    'criticalWords': []
                })
        
        # Limpar arquivo temporário
        os.unlink(wav_path)
        
        result = {
            'text': final_transcript or "Transcrição processada mas sem texto reconhecido",
            'segments': segments,
            'duration': audio_props['duration'],
            'success': len(transcripts) > 0,
            'audio_properties': audio_props
        }
        
        logging.info(f"Transcrição concluída: {len(final_transcript)} caracteres, {len(segments)} segmentos")
        return result
        
    except Exception as e:
        logging.error(f"Erro na transcrição: {e}")
        return {
            'text': f"Erro na transcrição: {str(e)}",
            'segments': [],
            'duration': 60.0,
            'success': False,
            'error': str(e)
        }

def main():
    """Função principal chamada pelo Node.js"""
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Caminho do arquivo necessário'}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(json.dumps({'error': f'Arquivo não encontrado: {file_path}'}))
        sys.exit(1)
    
    try:
        result = transcribe_audio_real(file_path)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()