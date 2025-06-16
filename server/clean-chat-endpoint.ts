import { Express } from 'express';
import { isAuthenticated } from './auth';
import { storage } from './storage';

export function setupCleanChatAnalysis(app: Express) {
  // Chat analysis endpoint - preserves timestamps and detects real problems
  app.post('/api/monitoring-sessions/:id/analyze-chat', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getMonitoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.channelType !== 'chat' || !session.chatContent) {
        return res.status(400).json({ message: "Session is not a chat or has no content" });
      }
      
      console.log('=== INICIANDO ANÁLISE CORRIGIDA ===');
      console.log('Session ID:', sessionId);
      console.log('Chat content:', session.chatContent);
      
      // Import fixed analyzer that preserves timestamps and detects real problems
      const { FixedChatAnalyzer } = await import('./fixed-chat-analyzer');
      
      // Análise corrigida do chat que preserva horários e detecta problemas reais
      const analysis = FixedChatAnalyzer.analyzeChatContent(session.chatContent);
      
      console.log('=== RESULTADO DA ANÁLISE CORRIGIDA ===');
      console.log('Sentimento:', analysis.analysis.overallSentiment);
      console.log('Satisfação Cliente:', analysis.analysis.customerSatisfaction);
      console.log('Performance Agente:', analysis.analysis.agentPerformance);
      console.log('Palavrões:', analysis.metrics.totalSwearWords);
      console.log('Tempo Máximo Resposta:', analysis.metrics.maxResponseTime, 'minutos');
      console.log('Requer Escalação:', analysis.analysis.requiresEscalation);
      console.log('Issues Críticas:', analysis.analysis.criticalIssues);

      // Prepare transcription result preserving original timestamps
      const transcriptionResult = {
        text: analysis.conversationFlow.map(msg => `${msg.speaker}: ${msg.text}`).join('\n'),
        segments: analysis.conversationFlow.map((msg, index) => ({
          id: `msg_${index}`,
          speaker: msg.speaker,
          text: msg.text,
          startTime: index * 30,
          endTime: (index + 1) * 30,
          confidence: 0.95,
          criticalWords: msg.hasSwearing ? ['palavrão'] : []
        })),
        conversationFlow: analysis.conversationFlow.map((msg, index) => ({
          timestamp: msg.originalTimestamp,
          speaker: msg.speaker,
          message: msg.text,
          sentiment: msg.sentiment === 'positive' ? 0.8 : 
                    msg.sentiment === 'negative' ? 0.1 : 0.5,
          responseTime: analysis.timeline.responseDelays[index]?.delay || 0,
          hasSwearing: msg.hasSwearing,
          hasUrgency: msg.hasUrgency
        })),
        speakerAnalysis: {
          agent: {
            messageCount: analysis.metrics.agentMessages,
            averageResponseTime: analysis.metrics.averageResponseTime,
            performance: analysis.analysis.agentPerformance,
            professionalismScore: analysis.metrics.totalSwearWords > 0 ? 0.3 : 0.9
          },
          client: {
            messageCount: analysis.metrics.clientMessages,
            satisfactionLevel: analysis.analysis.customerSatisfaction,
            escalationLevel: analysis.metrics.escalationLevel,
            emotionalState: analysis.analysis.overallSentiment
          }
        },
        timeline: {
          startTime: analysis.timeline.firstMessage,
          endTime: analysis.timeline.lastMessage,
          duration: analysis.timeline.conversationDuration,
          responseDelays: analysis.timeline.responseDelays
        },
        duration: analysis.timeline.conversationDuration,
        confidence: 0.95
      };

      const aiAnalysis = {
        sentiment: analysis.analysis.overallSentiment === 'positive' ? 0.8 : 
                  analysis.analysis.overallSentiment === 'negative' ? 0.2 : 0.5,
        keyTopics: analysis.analysis.criticalIssues.length > 0 ? 
                  analysis.analysis.criticalIssues : ['atendimento', 'suporte'],
        criticalMoments: analysis.analysis.criticalIssues.map((issue, index) => ({
          timestamp: index * 60,
          description: issue,
          severity: 'high' as const
        })),
        recommendations: analysis.analysis.requiresEscalation ? 
          ['Escalação imediata necessária', 'Treinamento em atendimento ao cliente'] :
          ['Manter qualidade do atendimento'],
        score: analysis.analysis.serviceQuality === 'critical' ? 2 :
               analysis.analysis.serviceQuality === 'poor' ? 4 :
               analysis.analysis.serviceQuality === 'average' ? 6 : 8
      };

      // Update session with corrected analysis results
      await storage.updateMonitoringSession(sessionId, {
        status: 'completed',
        transcription: transcriptionResult,
        aiAnalysis
      });

      console.log('=== ANÁLISE SALVA COM SUCESSO ===');

      res.json({
        message: "Chat analysis completed successfully",
        sessionId,
        status: 'completed',
        analysis: {
          overallSentiment: analysis.analysis.overallSentiment,
          customerSatisfaction: analysis.analysis.customerSatisfaction,
          agentPerformance: analysis.analysis.agentPerformance,
          maxResponseTime: analysis.metrics.maxResponseTime,
          totalSwearWords: analysis.metrics.totalSwearWords,
          criticalIssues: analysis.analysis.criticalIssues,
          requiresEscalation: analysis.analysis.requiresEscalation
        },
        transcription: transcriptionResult
      });

    } catch (error) {
      console.error('Chat analysis error:', error);
      res.status(500).json({ 
        message: "Failed to analyze chat", 
        error: error.message 
      });
    }
  });
}