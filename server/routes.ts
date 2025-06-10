import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { transcribeAudio, analyzeTranscription, transcribeAudioLocal } from "./openai";
import { SecurityMiddleware } from "./security";
import lgpdRoutes from "./lgpd-routes";
import {
  insertCompanySchema,
  insertCampaignSchema,
  insertMonitoringSessionSchema,
  insertEvaluationSchema,
  insertEvaluationCriteriaSchema,
  insertRewardSchema,
} from "@shared/schema";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/flac',
      'audio/x-flac',
      'audio/aac',
      'audio/ogg',
      'audio/webm',
      'audio/m4a',
      'audio/mp4',
      'audio/x-m4a',
      'audio/amr',
      'audio/3gpp',
      'audio/aiff',
      'audio/x-aiff'
    ];
    
    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    const allowedExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'webm', 'm4a', 'mp4', 'amr', '3gp', 'aiff'];
    
    if (file.mimetype.startsWith('audio/') || allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension || '')) {
      cb(null, true);
    } else {
      cb(new Error('Formato de áudio não suportado. Formatos aceitos: MP3, WAV, FLAC, AAC, OGG, WEBM, M4A, AMR, AIFF'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Security middleware - LGPD compliance
  app.use(SecurityMiddleware.configureHelmet());
  app.use(SecurityMiddleware.createRateLimit());
  app.use(SecurityMiddleware.sanitizeInput);
  app.use(SecurityMiddleware.secureActivityLog);
  
  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));
  
  // Auth middleware
  await setupAuth(app);

  // LGPD compliance routes
  app.use('/api/lgpd', lgpdRoutes);

  // Auth routes are handled in auth.ts
  
  // Admin-only user creation
  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create users" });
      }
      
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password (import hashPassword function)
      const { scrypt, randomBytes } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);
      
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(req.body.password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        virtualCoins: 0,
        isActive: true,
      });

      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        virtualCoins: user.virtualCoins,
        isActive: user.isActive
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Get all users (admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can view all users" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        virtualCoins: user.virtualCoins,
        isActive: user.isActive
      })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get agents by company (evaluators and supervisors)
  app.get('/api/agents', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor', 'evaluator'].includes(currentUser?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const users = await storage.getAllUsers();
      const agents = users.filter(user => 
        user.role === 'agent' && 
        user.isActive &&
        (currentUser?.role === 'admin' || user.companyId === currentUser?.companyId)
      );
      
      res.json(agents.map(agent => ({
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        companyId: agent.companyId
      })));
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  // Update user (admin only)
  app.put('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update users" });
      }

      const userId = req.params.id;
      const updates = req.body;
      
      // Remove password from updates if empty
      if (updates.password === "") {
        delete updates.password;
      } else if (updates.password) {
        // Hash new password
        const { scrypt, randomBytes } = await import("crypto");
        const { promisify } = await import("util");
        const scryptAsync = promisify(scrypt);
        
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync(updates.password, salt, 64)) as Buffer;
        updates.password = `${buf.toString("hex")}.${salt}`;
      }

      const updatedUser = await storage.updateUser(userId, updates);
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        companyId: updatedUser.companyId,
        virtualCoins: updatedUser.virtualCoins,
        isActive: updatedUser.isActive
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (admin only)
  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete users" });
      }

      const userId = req.params.id;
      
      // Prevent self-deletion
      if (userId === currentUser.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Dashboard metrics
  app.get('/api/dashboard/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const companyId = user?.role === 'admin' ? undefined : (user?.companyId ?? undefined);
      const metrics = await storage.getDashboardMetrics(companyId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // User ranking
  app.get('/api/ranking', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const companyId = user?.role === 'admin' ? undefined : (user?.companyId ?? undefined);
      const ranking = await storage.getUserRanking(companyId);
      res.json(ranking);
    } catch (error) {
      console.error("Error fetching user ranking:", error);
      res.status(500).json({ message: "Failed to fetch user ranking" });
    }
  });

  // Companies routes
  app.get('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const validatedData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(validatedData);
      res.status(201).json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.put('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const id = parseInt(req.params.id);
      const validatedData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(id, validatedData);
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  // Campaigns routes
  app.get('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const companyId = user?.role === 'admin' ? undefined : (user?.companyId ?? undefined);
      const campaigns = await storage.getCampaigns(companyId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      const validatedData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(validatedData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  // Monitoring sessions routes
  app.get('/api/monitoring-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      // Agents cannot access monitoring sessions
      if (user?.role === 'agent') {
        return res.status(403).json({ message: "Access denied" });
      }
      const companyId = user?.role === 'admin' ? undefined : (user?.companyId ?? undefined);
      const agentId = req.query.agentId as string;
      const sessions = await storage.getMonitoringSessions(companyId, agentId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching monitoring sessions:", error);
      res.status(500).json({ message: "Failed to fetch monitoring sessions" });
    }
  });

  app.post('/api/monitoring-sessions', isAuthenticated, upload.single('audio'), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor', 'evaluator'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      console.log('Request body:', req.body);
      console.log('Request file:', req.file);

      const { agentId, campaignId } = req.body;
      if (!agentId || !campaignId) {
        return res.status(400).json({ 
          message: "Agent ID and Campaign ID are required",
          received: { agentId, campaignId }
        });
      }

      const audioFile = req.file;
      if (!audioFile) {
        return res.status(400).json({ message: "Audio file is required" });
      }

      // Create initial session
      const sessionData = {
        agentId,
        campaignId: parseInt(campaignId),
        status: 'pending' as const,
        audioUrl: audioFile.path
      };

      const session = await storage.createMonitoringSession(sessionData);

      // Process transcription in background
      setImmediate(async () => {
        try {
          console.log('Starting transcription for session:', session.id);
          
          // Instant processing - no delays
          console.log('Processing audio instantly...');
          
          let transcriptionResult;
          let aiAnalysis;
          
          try {
            console.log('Starting OpenAI Whisper transcription for real audio content...');
            
            // Use OpenAI Whisper directly for real transcription
            const whisperResult = await transcribeAudio(audioFile.path);
            console.log('OpenAI Whisper result:', whisperResult.text);
            
            // Process the real transcription into segments
            const sentences = whisperResult.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const avgDuration = whisperResult.segments && whisperResult.segments.length > 0 
              ? whisperResult.segments[whisperResult.segments.length - 1].endTime / whisperResult.segments.length
              : 4; // 4 seconds per segment if no timing data
            
            const segments = sentences.map((sentence, index) => {
              const startTime = index * avgDuration;
              const endTime = (index + 1) * avgDuration;
              
              // Detect critical words in the REAL transcribed text
              const criticalWordPatterns = /\b(problema|erro|cancelar|reclamar|insatisfeito|ruim|falha|defeito|demora|lento|urgente|grave)\b/gi;
              const criticalWords = sentence.match(criticalWordPatterns) || [];
              
              return {
                id: (index + 1).toString(),
                speaker: index % 2 === 0 ? 'agent' : 'client',
                text: sentence.trim(),
                startTime: Math.round(startTime * 10) / 10,
                endTime: Math.round(endTime * 10) / 10,
                confidence: 0.95,
                criticalWords: criticalWords.map(w => w.toLowerCase())
              };
            });
            
            transcriptionResult = {
              text: whisperResult.text,
              segments
            };
            
            // Analyze the REAL transcribed content
            console.log('Analyzing real transcribed content with AI...');
            aiAnalysis = await analyzeTranscription(whisperResult.text);
            console.log('AI analysis of real content completed');
            
          } catch (error) {
            console.error('OpenAI Whisper transcription failed:', (error as Error).message);
            throw new Error(`Transcription failed: ${(error as Error).message}`);
          }
          
          const transcriptionData = {
            segments: transcriptionResult.segments || [],
            totalDuration: transcriptionResult.segments?.reduce((acc: number, seg: any) => Math.max(acc, seg.endTime), 0) || 23
          };

          // Update session with transcription and analysis
          await storage.updateMonitoringSession(session.id, {
            transcription: transcriptionData,
            aiAnalysis,
            status: 'completed'
          });

          console.log('Transcription completed for session:', session.id);
        } catch (error) {
          console.error('Error processing transcription:', error);
          await storage.updateMonitoringSession(session.id, {
            status: 'pending'
          });
        }
      });

      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating monitoring session:", error);
      res.status(500).json({ message: "Failed to create monitoring session" });
    }
  });

  app.put('/api/monitoring-sessions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor', 'evaluator'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      const id = parseInt(req.params.id);
      const validatedData = insertMonitoringSessionSchema.partial().parse(req.body);
      const session = await storage.updateMonitoringSession(id, validatedData);
      res.json(session);
    } catch (error) {
      console.error("Error updating monitoring session:", error);
      res.status(500).json({ message: "Failed to update monitoring session" });
    }
  });

  // Evaluations routes
  app.get('/api/evaluations', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const companyId = user?.role === 'admin' ? undefined : (user?.companyId ?? undefined);
      const agentId = user?.role === 'agent' ? user.id : undefined;
      const evaluations = await storage.getEvaluations(companyId, agentId);
      res.json(evaluations);
    } catch (error) {
      console.error("Error fetching evaluations:", error);
      res.status(500).json({ message: "Failed to fetch evaluations" });
    }
  });

  app.post('/api/evaluations', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'evaluator'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      const validatedData = insertEvaluationSchema.parse(req.body);
      const evaluation = await storage.createEvaluation(validatedData);
      res.status(201).json(evaluation);
    } catch (error) {
      console.error("Error creating evaluation:", error);
      res.status(500).json({ message: "Failed to create evaluation" });
    }
  });

  app.put('/api/evaluations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const evaluation = await storage.getEvaluation(parseInt(req.params.id));
      
      // Check permissions
      if (user?.role === 'agent' && evaluation?.agentSignature) {
        // Agent can only sign evaluations
        const { agentSignature } = req.body;
        if (agentSignature) {
          const updated = await storage.updateEvaluation(parseInt(req.params.id), {
            agentSignature,
            signedAt: new Date(),
            status: 'signed'
          });
          return res.json(updated);
        }
      } else if (['admin', 'evaluator'].includes(user?.role || '')) {
        const validatedData = insertEvaluationSchema.partial().parse(req.body);
        const updated = await storage.updateEvaluation(parseInt(req.params.id), validatedData);
        return res.json(updated);
      }
      
      return res.status(403).json({ message: "Access denied" });
    } catch (error) {
      console.error("Error updating evaluation:", error);
      res.status(500).json({ message: "Failed to update evaluation" });
    }
  });

  // Evaluation criteria routes
  app.get('/api/evaluation-criteria', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.companyId) {
        return res.status(400).json({ message: "Company ID required" });
      }
      const criteria = await storage.getEvaluationCriteria(user.companyId);
      res.json(criteria);
    } catch (error) {
      console.error("Error fetching evaluation criteria:", error);
      res.status(500).json({ message: "Failed to fetch evaluation criteria" });
    }
  });

  app.post('/api/evaluation-criteria', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      const validatedData = insertEvaluationCriteriaSchema.parse(req.body);
      const criteria = await storage.createEvaluationCriteria(validatedData);
      res.status(201).json(criteria);
    } catch (error) {
      console.error("Error creating evaluation criteria:", error);
      res.status(500).json({ message: "Failed to create evaluation criteria" });
    }
  });

  // Rewards routes
  app.get('/api/rewards', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      let companyId: number;
      
      console.log(`[REWARDS] User role: ${user?.role}, Query companyId: ${req.query.companyId}, User companyId: ${user?.companyId}`);
      
      if (user?.role === 'admin') {
        // Admin can specify companyId via query parameter
        const queryCompanyId = req.query.companyId;
        if (!queryCompanyId) {
          console.log(`[REWARDS] Admin missing companyId parameter`);
          return res.status(400).json({ message: "Company ID required" });
        }
        companyId = parseInt(queryCompanyId);
        console.log(`[REWARDS] Admin using companyId: ${companyId}`);
      } else {
        // Other roles use their assigned companyId
        if (!user?.companyId) {
          console.log(`[REWARDS] User missing companyId: ${user?.id}`);
          return res.status(400).json({ message: "Company ID required" });
        }
        companyId = user.companyId;
        console.log(`[REWARDS] User using companyId: ${companyId}`);
      }
      
      const rewards = await storage.getRewards(companyId);
      res.json(rewards);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      res.status(500).json({ message: "Failed to fetch rewards" });
    }
  });

  app.post('/api/rewards', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      const validatedData = insertRewardSchema.parse(req.body);
      const reward = await storage.createReward(validatedData);
      res.status(201).json(reward);
    } catch (error) {
      console.error("Error creating reward:", error);
      res.status(500).json({ message: "Failed to create reward" });
    }
  });

  app.post('/api/rewards/:id/purchase', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const rewardId = parseInt(req.params.id);
      const purchase = await storage.purchaseReward(user!.id, rewardId);
      res.status(201).json(purchase);
    } catch (error) {
      console.error("Error purchasing reward:", error as Error);
      res.status(500).json({ message: (error as Error).message || "Failed to purchase reward" });
    }
  });

  app.get('/api/user/purchases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const purchases = await storage.getUserRewardPurchases(userId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching user purchases:", error);
      res.status(500).json({ message: "Failed to fetch user purchases" });
    }
  });

  // Performance evolution endpoint
  app.get("/api/performance-evolution", isAuthenticated, async (req, res) => {
    try {
      const { agentId, months } = req.query;
      
      if (!agentId) {
        return res.status(400).json({ message: "Agent ID required" });
      }

      const monthsNumber = parseInt(months as string) || 3;
      const performanceData = await storage.getPerformanceEvolution(agentId as string, monthsNumber);
      
      res.json({ data: performanceData });
    } catch (error) {
      console.error("Error fetching performance evolution:", error);
      res.status(500).json({ message: "Failed to fetch performance evolution" });
    }
  });

  // Evaluation contests endpoints
  app.get("/api/evaluation-contests", isAuthenticated, async (req, res) => {
    try {
      const { agentId } = req.query;
      
      if (!agentId) {
        return res.status(400).json({ message: "Agent ID required" });
      }

      const contests = await storage.getEvaluationContests(agentId as string);
      res.json(contests);
    } catch (error) {
      console.error("Error fetching evaluation contests:", error);
      res.status(500).json({ message: "Failed to fetch evaluation contests" });
    }
  });

  app.post("/api/evaluation-contests", isAuthenticated, async (req, res) => {
    try {
      const { evaluationId, reason } = req.body;
      const agentId = req.user?.id;

      if (!evaluationId || !reason || !agentId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const contest = await storage.createEvaluationContest({
        evaluationId,
        agentId,
        reason,
        status: 'pending'
      });

      res.status(201).json(contest);
    } catch (error) {
      console.error("Error creating evaluation contest:", error);
      res.status(500).json({ message: "Failed to create evaluation contest" });
    }
  });

  app.patch("/api/evaluation-contests/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, response } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const contest = await storage.updateEvaluationContest(parseInt(id), {
        status,
        response
      });

      res.json(contest);
    } catch (error) {
      console.error("Error updating evaluation contest:", error);
      res.status(500).json({ message: "Failed to update evaluation contest" });
    }
  });

  // Notifications endpoints
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const notification = await storage.markNotificationAsRead(parseInt(id), userId);
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
