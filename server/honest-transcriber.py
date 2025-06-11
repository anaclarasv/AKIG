#!/usr/bin/env python3
"""
Transcritor honesto que não inventa diálogos falsos
Analisa o arquivo real e informa claramente o que foi detectado
"""

import os
import sys
import json
import tempfile
from pydub import AudioSegment

def analyze_real_audio_content(file_path: str) -> dict:
    """
    Analisa o conteúdo real do arquivo de áudio
    Sem inventar diálogos - apenas reporta o que foi realmente detectado
    """
    try:
        print(f"Analisando arquivo real: {file_path}", file=sys.stderr)
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")
        
        # Carregar e analisar arquivo real
        audio = AudioSegment.from_file(file_path)
        duration = len(audio) / 1000.0
        channels = audio.channels
        frame_rate = audio.frame_rate
        
        print(f"Arquivo analisado: {duration:.1f}s, {channels} canais, {frame_rate}Hz", file=sys.stderr)
        
        # Converter para análise
        if channels > 1:
            audio = audio.set_channels(1)
        audio = audio.set_frame_rate(16000)
        
        # Analisar energia do áudio real
        raw_data = audio.raw_data
        sample_width = audio.sample_width
        
        # Calcular RMS em janelas de 0.5s
        window_size = 8000  # 0.5s a 16kHz
        energy_values = []
        
        for i in range(0, len(raw_data), window_size * sample_width):
            window = raw_data[i:i + window_size * sample_width]
            if len(window) >= sample_width:
                if sample_width == 2:
                    import struct
                    try:
                        samples = struct.unpack(f"<{len(window)//2}h", window)
                        rms = (sum(s * s for s in samples) / len(samples)) ** 0.5
                        energy_values.append(rms)
                    except struct.error:
                        continue
        
        # Detectar atividade baseada na energia real
        if energy_values:
            max_energy = max(energy_values)
            threshold = max_energy * 0.15
            active_windows = [i for i, energy in enumerate(energy_values) if energy > threshold]
            
            total_active_time = len(active_windows) * 0.5
            activity_ratio = total_active_time / duration if duration > 0 else 0
        else:
            active_windows = []
            total_active_time = 0
            activity_ratio = 0
        
        # Resultado honesto baseado na análise real
        if active_windows:
            result_text = f"ANÁLISE REAL DO ARQUIVO:\n\n" \
                         f"• Duração total: {duration:.1f} segundos ({duration/60:.1f} minutos)\n" \
                         f"• Atividade detectada: {total_active_time:.1f} segundos ({activity_ratio*100:.1f}% do tempo)\n" \
                         f"• Segmentos ativos: {len(active_windows)} janelas de 0.5s\n" \
                         f"• Formato: {channels} canal(is), {frame_rate}Hz\n\n" \
                         f"IMPORTANTE: Esta é uma análise técnica do arquivo. Para obter a transcrição real do conteúdo falado, é necessário configurar um serviço de speech-to-text (Google Cloud Speech, Azure Speech, OpenAI Whisper API, etc.).\n\n" \
                         f"O sistema detectou atividade vocal real no arquivo, mas não pode transcrever o conteúdo sem uma API de reconhecimento de fala configurada."
            
            # Criar segmentos honestos baseados na atividade real
            segments = []
            segments_created = 0
            
            for i in range(0, len(active_windows), max(1, len(active_windows)//5)):  # Máximo 5 segmentos
                if segments_created >= 5:
                    break
                    
                window_index = active_windows[i]
                start_time = window_index * 0.5
                end_time = min(start_time + 0.5, duration)
                
                segments.append({
                    'id': f'segment_{segments_created}',
                    'speaker': 'unknown',
                    'text': f"Atividade detectada ({start_time:.1f}s-{end_time:.1f}s)",
                    'startTime': start_time,
                    'endTime': end_time,
                    'confidence': energy_values[window_index] / max_energy if energy_values else 0.5,
                    'criticalWords': []
                })
                segments_created += 1
        else:
            result_text = f"ANÁLISE REAL DO ARQUIVO:\n\n" \
                         f"• Duração total: {duration:.1f} segundos\n" \
                         f"• Formato: {channels} canal(is), {frame_rate}Hz\n" \
                         f"• Status: Arquivo processado mas nenhuma atividade vocal clara foi detectada\n\n" \
                         f"O arquivo foi analisado completamente, mas não foram identificados padrões de fala claros acima do threshold de detecção."
            
            segments = [{
                'id': 'segment_0',
                'speaker': 'unknown',
                'text': 'Nenhuma atividade vocal clara detectada',
                'startTime': 0,
                'endTime': duration,
                'confidence': 0.3,
                'criticalWords': []
            }]
        
        result = {
            'text': result_text,
            'segments': segments,
            'duration': duration,
            'success': True,
            'analysis': {
                'file_duration': duration,
                'active_time': total_active_time,
                'activity_ratio': activity_ratio,
                'windows_analyzed': len(energy_values),
                'active_windows': len(active_windows)
            },
            'note': 'Análise técnica real do arquivo - sem conteúdo inventado'
        }
        
        print(f"Análise concluída: {len(active_windows)}/{len(energy_values)} janelas ativas", file=sys.stderr)
        return result
        
    except Exception as e:
        print(f"Erro na análise: {e}", file=sys.stderr)
        return {
            'text': f"Erro ao analisar o arquivo: {str(e)}",
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
        result = analyze_real_audio_content(file_path)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()