#!/usr/bin/env python3
"""
Transcritor local usando Whisper OpenAI (offline)
Processa áudio real sem dependência de APIs externas
"""

import sys
import json
import os
import subprocess
import librosa
import whisper
from pathlib import Path

def convert_to_wav(input_path):
    """Converte áudio para WAV usando ffmpeg"""
    try:
        output_path = input_path.replace('.mp3', '_converted.wav').replace('.m4a', '_converted.wav')
        
        # Usar ffmpeg para conversão
        cmd = [
            'ffmpeg', '-i', input_path, 
            '-acodec', 'pcm_s16le', 
            '-ar', '16000', 
            '-ac', '1',
            '-y',  # Sobrescrever arquivo existente
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            return output_path
        else:
            print(f"Erro na conversão FFmpeg: {result.stderr}")
            return input_path
            
    except Exception as e:
        print(f"Erro na conversão: {e}")
        return input_path

def transcribe_with_whisper(audio_path):
    """Transcreve áudio usando Whisper local"""
    try:
        # Carregar modelo Whisper (base é um bom compromisso)
        model = whisper.load_model("base")
        
        # Transcrever áudio
        result = model.transcribe(audio_path, language="pt", verbose=False)
        
        # Processar segmentos
        segments = []
        for i, segment in enumerate(result["segments"]):
            speaker = "agent" if i % 2 == 0 else "client"
            segments.append({
                "id": f"segment_{i}",
                "speaker": speaker,
                "text": segment["text"].strip(),
                "startTime": segment["start"],
                "endTime": segment["end"],
                "confidence": 0.85
            })
        
        return {
            "text": result["text"],
            "segments": segments,
            "duration": result.get("duration", 0),
            "confidence": 0.85,
            "language": result.get("language", "pt")
        }
        
    except Exception as e:
        print(f"Erro na transcrição Whisper: {e}")
        return None

def analyze_audio_features(audio_path):
    """Analisa características do áudio"""
    try:
        # Carregar áudio com librosa
        y, sr = librosa.load(audio_path, sr=16000)
        
        # Calcular duração
        duration = len(y) / sr
        
        # Detectar energia/atividade de voz
        energy = librosa.feature.rms(y=y)[0]
        voice_activity = (energy > energy.mean()).sum() / len(energy)
        
        return {
            "duration": duration,
            "voice_activity": float(voice_activity),
            "sample_rate": sr,
            "channels": 1
        }
        
    except Exception as e:
        print(f"Erro na análise de áudio: {e}")
        return {"duration": 0, "voice_activity": 0.5}

def analyze_transcription(text, segments):
    """Analisa transcrição para insights"""
    
    # Palavras-chave para análise
    positive_words = ["obrigado", "perfeito", "excelente", "ótimo", "satisfeito", "resolvido", "bom"]
    negative_words = ["problema", "ruim", "péssimo", "insatisfeito", "reclamação", "cancelar", "errado"]
    
    text_lower = text.lower()
    
    # Contagem de sentimentos
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    # Calcular sentimento
    sentiment = 0
    if positive_count > negative_count:
        sentiment = 1
    elif negative_count > positive_count:
        sentiment = -1
    
    # Tópicos identificados
    topics = []
    if "pedido" in text_lower: topics.append("Pedidos")
    if "pagamento" in text_lower: topics.append("Pagamento")
    if "entrega" in text_lower: topics.append("Entrega")
    if "produto" in text_lower: topics.append("Produto")
    if "suporte" in text_lower: topics.append("Suporte")
    
    # Momentos críticos
    critical_moments = []
    for segment in segments:
        seg_text = segment["text"].lower()
        if any(word in seg_text for word in negative_words):
            critical_moments.append({
                "timestamp": segment["startTime"],
                "description": f"Problema detectado: {segment['text'][:50]}...",
                "severity": "medium"
            })
    
    # Score baseado na análise
    base_score = 70
    sentiment_bonus = sentiment * 15
    positive_bonus = positive_count * 5
    negative_penalty = negative_count * 10
    
    score = max(0, min(100, base_score + sentiment_bonus + positive_bonus - negative_penalty))
    
    return {
        "sentiment": sentiment,
        "keyTopics": topics,
        "criticalMoments": critical_moments,
        "score": score,
        "recommendations": generate_recommendations(sentiment, negative_count, topics),
        "silenceAnalysis": {
            "totalSilenceTime": 0,
            "silencePeriods": [],
            "averageSilenceDuration": 0
        },
        "criticalWordsFound": [
            {
                "word": word,
                "count": text_lower.count(word),
                "timestamps": [seg["startTime"] for seg in segments if word in seg["text"].lower()]
            }
            for word in negative_words if word in text_lower
        ]
    }

def generate_recommendations(sentiment, negative_count, topics):
    """Gera recomendações baseadas na análise"""
    recommendations = []
    
    if sentiment < 0:
        recommendations.append("Melhorar tom e abordagem no atendimento")
        recommendations.append("Implementar treinamento em resolução de conflitos")
    
    if negative_count > 2:
        recommendations.append("Revisar processos para reduzir pontos de atrito")
        recommendations.append("Considerar escalação para supervisor")
    
    if "Pagamento" in topics:
        recommendations.append("Verificar processos de cobrança")
    
    if "Entrega" in topics:
        recommendations.append("Revisar logística e prazos")
    
    if sentiment >= 0:
        recommendations.append("Manter padrão de qualidade no atendimento")
    
    return recommendations

def main():
    """Função principal"""
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Caminho do arquivo de áudio é obrigatório"}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    
    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"Arquivo não encontrado: {audio_path}"}))
        sys.exit(1)
    
    try:
        # Converter para WAV se necessário
        if not audio_path.endswith('.wav'):
            wav_path = convert_to_wav(audio_path)
        else:
            wav_path = audio_path
        
        # Analisar características do áudio
        audio_features = analyze_audio_features(wav_path)
        
        # Transcrever com Whisper
        transcription_result = transcribe_with_whisper(wav_path)
        
        if not transcription_result:
            print(json.dumps({"error": "Falha na transcrição"}))
            sys.exit(1)
        
        # Analisar transcrição
        analysis = analyze_transcription(
            transcription_result["text"], 
            transcription_result["segments"]
        )
        
        # Resultado final
        result = {
            "transcription": transcription_result["text"],
            "segments": transcription_result["segments"],
            "duration": audio_features["duration"],
            "confidence": transcription_result["confidence"],
            "analysis": analysis,
            "audioFeatures": audio_features,
            "method": "whisper_local"
        }
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
        # Limpar arquivo temporário
        if wav_path != audio_path and os.path.exists(wav_path):
            os.remove(wav_path)
            
    except Exception as e:
        print(json.dumps({"error": f"Erro no processamento: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()