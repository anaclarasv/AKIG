#!/usr/bin/env python3
"""
AssemblyAI real audio transcription
Processes authentic audio content using paid API
"""
import json
import sys
import os
import requests
import time
from pathlib import Path

# AssemblyAI API configuration
ASSEMBLYAI_API_KEY = os.environ.get('ASSEMBLYAI_API_KEY')
ASSEMBLYAI_UPLOAD_URL = "https://api.assemblyai.com/v2/upload"
ASSEMBLYAI_TRANSCRIPT_URL = "https://api.assemblyai.com/v2/transcript"

def upload_audio_to_assemblyai(file_path: str) -> str:
    """Upload audio file to AssemblyAI and get URL"""
    headers = {
        'authorization': ASSEMBLYAI_API_KEY,
        'content-type': 'application/octet-stream'
    }
    
    with open(file_path, 'rb') as f:
        response = requests.post(ASSEMBLYAI_UPLOAD_URL, headers=headers, data=f)
    
    if response.status_code == 200:
        return response.json()['upload_url']
    else:
        raise Exception(f"Failed to upload audio: {response.text}")

def transcribe_with_assemblyai(audio_url: str) -> dict:
    """Transcribe audio using AssemblyAI API"""
    headers = {
        'authorization': ASSEMBLYAI_API_KEY,
        'content-type': 'application/json'
    }
    
    # Request transcription with basic features for Portuguese
    data = {
        'audio_url': audio_url,
        'language_code': 'pt',  # Portuguese
        'speaker_labels': True,
        'punctuate': True,
        'format_text': True
    }
    
    response = requests.post(ASSEMBLYAI_TRANSCRIPT_URL, headers=headers, json=data)
    
    if response.status_code != 200:
        raise Exception(f"Failed to request transcription: {response.text}")
    
    transcript_id = response.json()['id']
    
    # Poll for completion
    polling_url = f"{ASSEMBLYAI_TRANSCRIPT_URL}/{transcript_id}"
    
    print("Waiting for AssemblyAI transcription to complete...", file=sys.stderr)
    
    while True:
        response = requests.get(polling_url, headers=headers)
        result = response.json()
        
        if result['status'] == 'completed':
            return result
        elif result['status'] == 'error':
            raise Exception(f"Transcription failed: {result.get('error', 'Unknown error')}")
        
        time.sleep(2)  # Wait 2 seconds before polling again

def process_assemblyai_result(result: dict) -> dict:
    """Process AssemblyAI transcription result into our format"""
    
    # Extract full text
    full_text = result['text']
    
    # Process utterances (speaker-separated segments)
    segments = []
    
    if 'utterances' in result and result['utterances']:
        for utterance in result['utterances']:
            # Map AssemblyAI speaker to our format
            speaker_label = utterance.get('speaker', 'A')
            speaker = "Atendente" if speaker_label == 'A' else "Cliente"
            
            # Detect critical words
            critical_words = detect_critical_words(utterance['text'])
            
            segments.append({
                "start": round(utterance['start'] / 1000, 2),  # Convert ms to seconds
                "end": round(utterance['end'] / 1000, 2),
                "speaker": speaker,
                "text": utterance['text'],
                "criticalWords": critical_words
            })
    else:
        # Fallback: create segments from words if no speaker detection
        words = result.get('words', [])
        if words:
            current_segment = []
            segment_start = 0
            
            for i, word in enumerate(words):
                if i == 0:
                    segment_start = word['start']
                
                current_segment.append(word['text'])
                
                # Create segment every 15 words or at end
                if (i + 1) % 15 == 0 or i == len(words) - 1:
                    segment_text = ' '.join(current_segment)
                    speaker = "Atendente" if len(segments) % 2 == 0 else "Cliente"
                    critical_words = detect_critical_words(segment_text)
                    
                    segments.append({
                        "start": round(segment_start / 1000, 2),
                        "end": round(word['end'] / 1000, 2),
                        "speaker": speaker,
                        "text": segment_text,
                        "criticalWords": critical_words
                    })
                    
                    current_segment = []
    
    # Calculate duration
    duration = segments[-1]["end"] if segments else 0
    
    # Extract sentiment if available
    sentiment_score = 0.5  # Default neutral
    if 'sentiment_analysis_results' in result:
        sentiment_data = result['sentiment_analysis_results']
        if sentiment_data:
            # Convert AssemblyAI sentiment to our scale
            avg_sentiment = sum(s.get('sentiment', 'NEUTRAL') == 'POSITIVE' for s in sentiment_data) / len(sentiment_data)
            sentiment_score = avg_sentiment
    
    # Analyze transcription
    analysis = analyze_transcription_content(full_text, segments, sentiment_score)
    
    return {
        "text": full_text,
        "segments": segments,
        "duration": duration,
        "confidence": result.get('confidence', 0.9),
        "transcription_engine": "assemblyai_real",
        "analysis": analysis
    }

def detect_critical_words(text: str) -> list:
    """Detect critical customer service words"""
    critical_keywords = [
        'problema', 'problemas', 'danificado', 'quebrado', 'defeito',
        'reclamação', 'insatisfeito', 'cancelar', 'reembolso', 'urgente',
        'transtorno', 'atrasado', 'errado', 'não funciona'
    ]
    
    found = []
    text_lower = text.lower()
    for keyword in critical_keywords:
        if keyword in text_lower:
            found.append(keyword)
    
    return found

def analyze_transcription_content(text: str, segments: list, sentiment_score: float) -> dict:
    """Analyze transcription for business insights"""
    
    # Extract all critical words
    all_critical = []
    for segment in segments:
        all_critical.extend(segment.get('criticalWords', []))
    
    # Identify topics
    text_lower = text.lower()
    topics = []
    
    topic_keywords = {
        'produto': ['produto', 'item', 'mercadoria'],
        'entrega': ['entrega', 'envio', 'correios'],
        'atendimento': ['atendimento', 'suporte'],
        'pagamento': ['pagamento', 'cobrança', 'fatura'],
        'devolução': ['devolução', 'devolver', 'trocar']
    }
    
    for topic, keywords in topic_keywords.items():
        if any(keyword in text_lower for keyword in keywords):
            topics.append(topic)
    
    # Generate recommendations
    recommendations = []
    if sentiment_score < 0.4:
        recommendations.append("Melhorar treinamento da equipe")
        recommendations.append("Implementar follow-up proativo")
    
    if len(set(all_critical)) > 2:
        recommendations.append("Revisar processos de qualidade")
        recommendations.append("Monitorar produtos/serviços")
    
    if sentiment_score > 0.7:
        recommendations.append("Documentar boas práticas")
        recommendations.append("Reconhecer performance do agente")
    
    if not recommendations:
        recommendations.append("Manter padrão atual")
    
    return {
        "sentiment": round(sentiment_score, 2),
        "criticalWords": list(set(all_critical)),
        "topics": topics,
        "recommendations": recommendations
    }

def main():
    """Main function"""
    if len(sys.argv) != 2:
        print("Usage: python assemblyai-transcription.py <audio_file>", file=sys.stderr)
        sys.exit(1)
    
    audio_file = sys.argv[1]
    
    if not os.path.exists(audio_file):
        print(f"Error: File {audio_file} not found", file=sys.stderr)
        sys.exit(1)
    
    if not ASSEMBLYAI_API_KEY:
        print("Error: ASSEMBLYAI_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)
    
    try:
        print(f"Processing real audio with AssemblyAI: {audio_file}", file=sys.stderr)
        
        # Upload audio file
        print("Uploading audio to AssemblyAI...", file=sys.stderr)
        audio_url = upload_audio_to_assemblyai(audio_file)
        
        # Transcribe audio
        print("Starting transcription...", file=sys.stderr)
        assemblyai_result = transcribe_with_assemblyai(audio_url)
        
        # Process results
        result = process_assemblyai_result(assemblyai_result)
        
        print(f"Transcription completed: {len(result['text'])} characters, {len(result['segments'])} segments", file=sys.stderr)
        
        # Output JSON result
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "text": "",
            "segments": [],
            "duration": 0,
            "transcription_engine": "assemblyai_real"
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()