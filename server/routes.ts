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
      const evaluations = await storage.getEvaluationsByCompany(companyId);
      const sessions = await storage.getMonitoringSessionsByCompany(companyId);
      const agents = await storage.getUsersByCompanyAndRole(companyId, 'agent');
      
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
          name: agent.name,
          score: agentScore,
          evaluations: agentEvaluations.length,
          approvalRate: agentApprovalRate,
          incidents: agentIncidents
        };
      });

      // Palavras críticas detectadas (simulação baseada em dados reais)
      const criticalWords = [
        { word: "problema", count: criticalIncidents, lastDetected: new Date().toLocaleDateString('pt-BR') },
        { word: "demora", count: Math.floor(criticalIncidents * 0.7), lastDetected: new Date().toLocaleDateString('pt-BR') },
        { word: "insatisfeito", count: Math.floor(criticalIncidents * 0.5), lastDetected: new Date().toLocaleDateString('pt-BR') }
      ].filter(word => word.count > 0);

      const reportData = {
        general: {
          totalEvaluations,
          averageScore: Math.round(averageScore * 10) / 10,
          approvalRate,
          criticalIncidents,
          unsignedForms,
          contestedEvaluations
        },
        agentPerformance,
        criticalWords
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

  app.get("/api/companies", isAuthenticated, async (req, res) => {
    const companies = await storage.getAllCompanies();
    res.json(companies);
  });

  app.post("/api/companies", isAuthenticated, async (req, res) => {
    const company = await storage.createCompany(req.body);
    res.status(201).json(company);
  });

  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    const companyId = req.user?.companyId;
    const users = await storage.getUsersByCompany(companyId);
    res.json(users);
  });

  app.post("/api/users", isAuthenticated, async (req, res) => {
    const user = await storage.createUser(req.body);
    res.status(201).json(user);
  });

  app.get("/api/campaigns", isAuthenticated, async (req: any, res) => {
    const companyId = req.user?.companyId;
    const campaigns = await storage.getCampaignsByCompany(companyId);
    res.json(campaigns);
  });

  app.post("/api/campaigns", isAuthenticated, async (req, res) => {
    const campaign = await storage.createCampaign(req.body);
    res.status(201).json(campaign);
  });

  app.get("/api/evaluation-criteria", isAuthenticated, async (req: any, res) => {
    const companyId = req.user?.companyId;
    const criteria = await storage.getEvaluationCriteriaByCompany(companyId);
    res.json(criteria);
  });

  app.post("/api/evaluation-criteria", isAuthenticated, async (req, res) => {
    const criteria = await storage.createEvaluationCriteria(req.body);
    res.status(201).json(criteria);
  });

  app.get("/api/monitoring-sessions", isAuthenticated, async (req: any, res) => {
    const companyId = req.user?.companyId;
    const sessions = await storage.getMonitoringSessionsByCompany(companyId);
    res.json(sessions);
  });

  app.post("/api/monitoring-sessions", isAuthenticated, async (req, res) => {
    const session = await storage.createMonitoringSession(req.body);
    res.status(201).json(session);
  });

  app.get("/api/monitoring-sessions/:id", isAuthenticated, async (req, res) => {
    const session = await storage.getMonitoringSession(parseInt(req.params.id));
    res.json(session);
  });

  app.get("/api/evaluations", isAuthenticated, async (req: any, res) => {
    const companyId = req.user?.companyId;
    const evaluations = await storage.getEvaluationsByCompany(companyId);
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
    const companyId = req.user?.companyId;
    const ranking = await storage.getRankingByCompany(companyId);
    res.json(ranking);
  });

  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    const companyId = req.user?.companyId;
    const stats = await storage.getDashboardStats(companyId);
    res.json(stats);
  });

  const httpServer = createServer(app);
  return httpServer;
}