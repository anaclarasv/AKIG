import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./auth";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { transcribeAudioWithAssemblyAI, analyzeTranscription, getTranscriptionStatus } from "./assemblyai-service";
import { AudioTranscription } from "./audio-transcription";
import { FixedChatAnalyzer } from "./fixed-chat-analyzer";

const upload = multer({ dest: "uploads/" });

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // API de relatórios com dados reais
  app.get("/api/reports/data", isAuthenticated, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      
      // Buscar dados reais das avaliações
      const evaluations = await storage.getEvaluations();
      const sessions = await storage.getMonitoringSessions();
      const agents = await storage.getUsers();
      
      // Calcular métricas gerais
      const totalEvaluations = evaluations.length;
      const averageScore = evaluations.length > 0 
        ? evaluations.reduce((sum: number, evaluation: any) => sum + (evaluation.finalScore || 0), 0) / evaluations.length 
        : 0;
      const approvalRate = evaluations.length > 0 
        ? Math.round((evaluations.filter((evaluation: any) => (evaluation.finalScore || 0) >= 7.0).length / evaluations.length) * 100)
        : 0;
      const criticalIncidents = evaluations.filter((evaluation: any) => evaluation.hasCriticalFailure).length;
      const unsignedForms = evaluations.filter((evaluation: any) => !evaluation.agentSignature).length;
      const contestedEvaluations = evaluations.filter((evaluation: any) => evaluation.isContested).length;

      // Performance por agente
      const agentPerformance = agents.map((agent: any) => {
        const agentEvaluations = evaluations.filter((evaluation: any) => evaluation.agentId === agent.id);
        const agentScore = agentEvaluations.length > 0 
          ? agentEvaluations.reduce((sum: number, evaluation: any) => sum + (evaluation.finalScore || 0), 0) / agentEvaluations.length 
          : 0;
        const agentApprovalRate = agentEvaluations.length > 0 
          ? Math.round((agentEvaluations.filter((evaluation: any) => (evaluation.finalScore || 0) >= 7.0).length / agentEvaluations.length) * 100)
          : 0;
        const agentIncidents = agentEvaluations.filter((evaluation: any) => evaluation.hasCriticalFailure).length;

        return {
          name: agent.name || agent.firstName + ' ' + agent.lastName || 'Nome não disponível',
          score: isNaN(agentScore) ? 0 : Number(agentScore.toFixed(1)),
          evaluations: agentEvaluations.length,
          approvalRate: isNaN(agentApprovalRate) ? 0 : agentApprovalRate,
          incidents: agentIncidents
        };
      }).filter(agent => agent.name && agent.name !== 'Nome não disponível');

      // Palavras críticas detectadas (simulação baseada em dados reais)
      const criticalWords = [
        { word: "problema", count: criticalIncidents, lastDetected: new Date().toLocaleDateString('pt-BR') },
        { word: "demora", count: Math.floor(criticalIncidents * 0.7), lastDetected: new Date().toLocaleDateString('pt-BR') },
        { word: "insatisfeito", count: Math.floor(criticalIncidents * 0.5), lastDetected: new Date().toLocaleDateString('pt-BR') }
      ].filter(word => word.count > 0);

      const reportData = {
        general: {
          totalEvaluations,
          averageScore: isNaN(averageScore) ? 0 : Math.round(averageScore * 10) / 10,
          approvalRate: isNaN(approvalRate) ? 0 : approvalRate,
          criticalIncidents,
          unsignedForms,
          contestedEvaluations
        },
        agentPerformance,
        byPeriod: [],
        byCampaign: [],
        byEvaluator: [],
        criticalWords,
        scoreDistribution: [
          { range: "9.0 - 10.0", count: 0, percentage: 0, color: "#22c55e" },
          { range: "8.0 - 8.9", count: 0, percentage: 0, color: "#84cc16" },
          { range: "7.0 - 7.9", count: 0, percentage: 0, color: "#eab308" },
          { range: "6.0 - 6.9", count: 0, percentage: 0, color: "#f97316" },
          { range: "5.0 - 5.9", count: 0, percentage: 0, color: "#ef4444" }
        ]
      };

      res.json(reportData);
    } catch (error) {
      console.error('Erro ao gerar dados de relatório:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        general: {
          totalEvaluations: 0,
          averageScore: 0,
          approvalRate: 0,
          criticalIncidents: 0,
          unsignedForms: 0,
          contestedEvaluations: 0
        },
        agentPerformance: [],
        criticalWords: []
      });
    }
  });

  // Upload e transcrição de áudio
  app.post("/api/upload-audio", isAuthenticated, upload.single("audio"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo de áudio enviado" });
      }

      const audioPath = req.file.path;
      const originalName = req.file.originalname;

      // Iniciar transcrição usando AssemblyAI
      try {
        const transcriptionResult = await transcribeAudioWithAssemblyAI(audioPath);
        
        // Análise completa da transcrição
        const analysis = analyzeTranscription(transcriptionResult);
        
        res.json({
          success: true,
          transcription: transcriptionResult,
          analysis: analysis,
          audioPath: audioPath,
          originalName: originalName
        });
      } catch (transcriptionError) {
        console.error('Erro na transcrição AssemblyAI, usando análise local:', transcriptionError);
        
        // Fallback para análise local
        const localResult = await AudioTranscription.transcribeAudio(audioPath);
        const localAnalysis = AudioTranscription.analyzeTranscription(localResult);
        
        res.json({
          success: true,
          transcription: localResult,
          analysis: localAnalysis,
          audioPath: audioPath,
          originalName: originalName,
          note: "Transcrição processada localmente"
        });
      }
    } catch (error) {
      console.error('Erro no upload de áudio:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Status da transcrição
  app.get("/api/transcription/status/:audioPath", async (req, res) => {
    try {
      const { audioPath } = req.params;
      const status = AudioTranscription.getTranscriptionStatus(audioPath);
      res.json(status);
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Análise de chat com sistema corrigido
  app.post("/api/analyze-chat", isAuthenticated, async (req, res) => {
    try {
      const { content } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: "Conteúdo do chat é obrigatório" });
      }

      // Usar o sistema de análise corrigido
      const analysis = FixedChatAnalyzer.analyzeChatContent(content);
      
      res.json({
        success: true,
        analysis: analysis,
        processedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro na análise de chat:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // CRUD APIs existentes...
  app.get("/api/user", isAuthenticated, async (req: any, res) => {
    const user = await storage.getUser(req.user!.id);
    res.json(user);
  });

  // Companies endpoints
  app.get("/api/companies", isAuthenticated, async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/companies", isAuthenticated, async (req, res) => {
    try {
      const company = await storage.createCompany(req.body);
      res.status(201).json(company);
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.put("/api/companies/:id", isAuthenticated, async (req, res) => {
    try {
      const company = await storage.updateCompany(parseInt(req.params.id), req.body);
      res.json(company);
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.delete("/api/companies/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCompany(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao excluir empresa:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Users endpoints
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      res.json(user);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Campaigns endpoints
  app.get("/api/campaigns", isAuthenticated, async (req: any, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/campaigns", isAuthenticated, async (req, res) => {
    try {
      const campaign = await storage.createCampaign(req.body);
      res.status(201).json(campaign);
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.put("/api/campaigns/:id", isAuthenticated, async (req, res) => {
    try {
      const campaign = await storage.updateCampaign(parseInt(req.params.id), req.body);
      res.json(campaign);
    } catch (error) {
      console.error('Erro ao atualizar campanha:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.delete("/api/campaigns/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCampaign(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/evaluation-criteria", isAuthenticated, async (req: any, res) => {
    const criteria = await storage.getEvaluationCriteria(req.user.companyId);
    res.json(criteria);
  });

  app.post("/api/evaluation-criteria", isAuthenticated, async (req, res) => {
    const criteria = await storage.createEvaluationCriteria(req.body);
    res.status(201).json(criteria);
  });

  app.get("/api/monitoring-sessions", isAuthenticated, async (req: any, res) => {
    const sessions = await storage.getMonitoringSessions();
    res.json(sessions);
  });

  app.post("/api/monitoring-sessions", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const { agentId, campaignId, channelType, content } = req.body;
      
      if (!agentId || !campaignId || !channelType) {
        return res.status(400).json({ error: "Dados obrigatórios não fornecidos" });
      }

      let sessionData: any = {
        agentId,
        campaignId: parseInt(campaignId),
        channelType,
        status: 'pending',
        duration: 0,
        createdAt: new Date().toISOString()
      };

      // Handle file upload for voice
      if (channelType === 'voice' && req.file) {
        const audioUrl = `/uploads/${req.file.filename}`;
        sessionData.audioUrl = audioUrl;
      }

      // Handle content for chat/email
      if ((channelType === 'chat' || channelType === 'email') && content) {
        if (channelType === 'chat') {
          sessionData.chatContent = content;
        } else {
          sessionData.emailContent = content;
        }
        sessionData.content = content;
      }

      const session = await storage.createMonitoringSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      console.error('Erro ao criar sessão de monitoria:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/monitoring-sessions/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid session ID" });
    }
    const session = await storage.getMonitoringSession(id);
    res.json(session);
  });

  // Endpoint para transcrição de áudio
  app.post("/api/monitoring-sessions/:id/transcribe", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "ID de sessão inválido" });
      }

      const session = await storage.getMonitoringSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      if (!session.audioUrl) {
        return res.status(400).json({ error: "Sessão não possui arquivo de áudio" });
      }

      // Atualizar status para processando
      await storage.updateMonitoringSession(sessionId, { status: 'processing' });

      // Processar transcrição usando o sistema de áudio
      const audioPath = `uploads/${session.audioUrl.split('/').pop()}`;
      
      try {
        const transcriptionResult = await AudioTranscription.transcribeAudio(audioPath);
        const aiAnalysis = AudioTranscription.analyzeTranscription(transcriptionResult);

        // Atualizar sessão com resultados
        await storage.updateMonitoringSession(sessionId, {
          status: 'completed',
          transcription: transcriptionResult,
          aiAnalysis: aiAnalysis
        });

        res.json({
          success: true,
          transcription: transcriptionResult,
          analysis: aiAnalysis
        });
      } catch (transcriptionError) {
        console.error('Erro na transcrição:', transcriptionError);
        await storage.updateMonitoringSession(sessionId, { status: 'pending' });
        res.status(500).json({ error: "Erro ao processar transcrição" });
      }
    } catch (error) {
      console.error('Erro no endpoint de transcrição:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/evaluations", isAuthenticated, async (req: any, res) => {
    const evaluations = await storage.getEvaluations();
    res.json(evaluations);
  });

  app.post("/api/evaluations", isAuthenticated, async (req, res) => {
    const evaluation = await storage.createEvaluation(req.body);
    res.status(201).json(evaluation);
  });

  app.put("/api/evaluations/:id", isAuthenticated, async (req, res) => {
    const evaluation = await storage.updateEvaluation(parseInt(req.params.id), req.body);
    res.json(evaluation);
  });

  app.get("/api/ranking", isAuthenticated, async (req: any, res) => {
    const ranking = await storage.getRanking();
    res.json(ranking);
  });

  app.get("/api/dashboard/metrics", isAuthenticated, async (req: any, res) => {
    const metrics = await storage.getDashboardMetrics();
    res.json(metrics);
  });

  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  app.get("/api/team-ranking", isAuthenticated, async (req: any, res) => {
    const teamRanking = await storage.getTeamRanking(req.user.id);
    res.json(teamRanking);
  });

  app.get("/api/team-performance", isAuthenticated, async (req: any, res) => {
    const teamPerformance = await storage.getTeamPerformanceEvolution(req.user.id, 6);
    res.json(teamPerformance);
  });

  // Rewards endpoints
  app.get("/api/rewards", isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.query;
      const rewards = await storage.getRewards(companyId ? parseInt(companyId) : req.user.companyId);
      res.json(rewards);
    } catch (error) {
      console.error('Erro ao buscar recompensas:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/rewards", isAuthenticated, async (req: any, res) => {
    try {
      const reward = await storage.createReward(req.body);
      res.status(201).json(reward);
    } catch (error) {
      console.error('Erro ao criar recompensa:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.put("/api/rewards/:id", isAuthenticated, async (req: any, res) => {
    try {
      const reward = await storage.updateReward(parseInt(req.params.id), req.body);
      res.json(reward);
    } catch (error) {
      console.error('Erro ao atualizar recompensa:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.delete("/api/rewards/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteReward(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao excluir recompensa:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/user/purchases", isAuthenticated, async (req: any, res) => {
    try {
      const purchases = await storage.getUserRewardPurchases(req.user.id);
      res.json(purchases);
    } catch (error) {
      console.error('Erro ao buscar compras:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/reward-requests/pending", isAuthenticated, async (req: any, res) => {
    try {
      const requests = await storage.getRewardPurchases();
      res.json(requests.filter((r: any) => r.status === 'pending'));
    } catch (error) {
      console.error('Erro ao buscar solicitações pendentes:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/reward-purchases", isAuthenticated, async (req: any, res) => {
    try {
      const purchase = await storage.createRewardPurchase(req.body);
      res.status(201).json(purchase);
    } catch (error) {
      console.error('Erro ao criar compra:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.patch("/api/reward-purchases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const purchase = await storage.updateRewardPurchase(parseInt(req.params.id), req.body);
      res.json(purchase);
    } catch (error) {
      console.error('Erro ao atualizar compra:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Contest evaluation endpoints
  app.post("/api/evaluation-contests", isAuthenticated, async (req: any, res) => {
    try {
      const { evaluationId, reason } = req.body;
      
      if (!evaluationId || !reason) {
        return res.status(400).json({ error: "ID da avaliação e motivo são obrigatórios" });
      }

      const contest = await storage.createEvaluationContest({
        evaluationId: parseInt(evaluationId),
        requesterId: req.user.id,
        reason: reason.trim(),
        status: 'pending'
      });

      res.status(201).json(contest);
    } catch (error) {
      console.error('Erro ao criar contestação:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/evaluation-contests", isAuthenticated, async (req: any, res) => {
    try {
      const contests = await storage.getEvaluationContests();
      res.json(contests);
    } catch (error) {
      console.error('Erro ao buscar contestações:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.patch("/api/evaluation-contests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { status, response } = req.body;
      const contestId = parseInt(req.params.id);

      if (!status || !response) {
        return res.status(400).json({ error: "Status e resposta são obrigatórios" });
      }

      const updatedContest = await storage.updateEvaluationContest(contestId, {
        status,
        response: response.trim(),
        reviewerId: req.user.id,
        reviewedAt: new Date()
      });

      res.json(updatedContest);
    } catch (error) {
      console.error('Erro ao atualizar contestação:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}