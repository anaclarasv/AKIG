import OpenAI from "openai";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import path from "path";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export async function transcribeAudio(audioFilePath: string): Promise<{
  text: string;
  segments?: Array<{
    id: string;
    speaker: 'agent' | 'client';
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
}> {
  try {
    const audioReadStream = fs.createReadStream(audioFilePath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"]
    });

    // Convert Whisper segments to our format
    const segments = transcription.segments?.map((segment, index) => ({
      id: `segment_${index}`,
      speaker: index % 2 === 0 ? 'agent' : 'client' as 'agent' | 'client', // Alternate between speakers
      text: segment.text,
      startTime: segment.start,
      endTime: segment.end,
      confidence: 0.95 // Whisper doesn't provide confidence per segment
    })) || [];

    return {
      text: transcription.text,
      segments
    };
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error("Failed to transcribe audio");
  }
}

export async function analyzeTranscription(text: string): Promise<{
  criticalWordsCount: number;
  totalSilenceTime: number;
  averageToneScore: number;
  sentimentScore: number;
  recommendations: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that analyzes customer service call transcriptions. Analyze the provided transcription and provide insights in JSON format with the following structure: { criticalWordsCount: number, totalSilenceTime: number, averageToneScore: number (1-10), sentimentScore: number (-1 to 1), recommendations: string[] }"
        },
        {
          role: "user",
          content: `Analyze this customer service call transcription: ${text}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      criticalWordsCount: analysis.criticalWordsCount || 0,
      totalSilenceTime: analysis.totalSilenceTime || 0,
      averageToneScore: analysis.averageToneScore || 7,
      sentimentScore: analysis.sentimentScore || 0,
      recommendations: analysis.recommendations || []
    };
  } catch (error) {
    console.error("Error analyzing transcription:", error);
    return {
      criticalWordsCount: 0,
      totalSilenceTime: 0,
      averageToneScore: 7,
      sentimentScore: 0,
      recommendations: ["Analysis could not be completed at this time."]
    };
  }
}