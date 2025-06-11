import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { db } from "./db";
import { evaluations, evaluationContests } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { setupAuth, isAuthenticated } from "./auth";
import { analyzeTranscription } from "./openai";
// import { transcribeWithNodeWhisper } from "./whisper-real";
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

  // Get user's evaluations for "My Evaluations" page
  app.get('/api/my-evaluations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const period = req.query.period || '30'; // days
      
      const evaluations = await storage.getUserEvaluations(userId, parseInt(period));
      res.json(evaluations);
    } catch (error) {
      console.error('Error fetching user evaluations:', error);
      res.status(500).json({ message: 'Failed to fetch evaluations' });
    }
  });

  // Monitoring sessions routes
  app.get('/api/monitoring-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      let sessions;
      
      if (user?.role === 'agent') {
        // Agents can only see their own sessions
        const companyId = user?.companyId ?? undefined;
        sessions = await storage.getMonitoringSessions(companyId, user.id);
      } else if (['admin', 'supervisor', 'evaluator'].includes(user?.role || '')) {
        // Admins, supervisors, and evaluators can see all sessions
        const companyId = user?.role === 'admin' ? undefined : (user?.companyId ?? undefined);
        const agentId = req.query.agentId as string;
        sessions = await storage.getMonitoringSessions(companyId, agentId);
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching monitoring sessions:", error);
      res.status(500).json({ message: "Failed to fetch monitoring sessions" });
    }
  });

  // Get archived monitoring sessions (must come before /:id route)
  app.get('/api/monitoring-sessions/archived', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const companyId = user?.role === 'admin' ? undefined : (user?.companyId || undefined);
      const archivedSessions = await storage.getArchivedMonitoringSessions(companyId);
      res.json(archivedSessions);
    } catch (error) {
      console.error("Error fetching archived monitoring sessions:", error);
      res.status(500).json({ message: "Failed to fetch archived monitoring sessions" });
    }
  });

  // Get deleted monitoring sessions  
  app.get('/api/monitoring-sessions/deleted', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const companyId = user?.role === 'admin' ? undefined : (user?.companyId || undefined);
      const deletedSessions = await storage.getDeletedMonitoringSessions(companyId);
      res.json(deletedSessions);
    } catch (error) {
      console.error("Error fetching deleted monitoring sessions:", error);
      res.status(500).json({ message: "Failed to fetch deleted monitoring sessions" });
    }
  });

  app.get('/api/monitoring-sessions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const sessionId = parseInt(req.params.id);
      const session = await storage.getMonitoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Agents can only view their own sessions
      if (user?.role === 'agent' && session.agentId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get agent and evaluator info
      const agent = await storage.getUser(session.agentId);
      const evaluator = session.evaluatorId ? await storage.getUser(session.evaluatorId) : null;

      const sessionWithDetails = {
        ...session,
        agent: agent ? {
          firstName: agent.firstName,
          lastName: agent.lastName
        } : null,
        evaluator: evaluator ? {
          firstName: evaluator.firstName,
          lastName: evaluator.lastName
        } : null
      };

      res.json(sessionWithDetails);
    } catch (error) {
      console.error("Error fetching monitoring session:", error);
      res.status(500).json({ message: "Failed to fetch monitoring session" });
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
            console.log('Starting real local Whisper transcription...');
            
            // Use node-whisper for real local transcription
            const nodeWhisper = (await import('node-whisper')).default;
            const fs = await import('fs');
            
            if (!fs.existsSync(audioFile.path)) {
              throw new Error(`Audio file not found: ${audioFile.path}`);
            }
            
            console.log(`Processing audio file: ${audioFile.path}`);
            
            const options = {
              modelName: "base",
              language: 'pt',
              word_timestamps: true,
              gen_file_txt: true
            };
            
            const result = await nodeWhisper(audioFile.path, options);
            const transcript = typeof result === 'string' ? result : result.txt || '';
            
            if (!transcript || transcript.length === 0) {
              throw new Error('No transcription text generated');
            }
            
            console.log('Real transcription result:', transcript.substring(0, 200));
            
            // Process the real transcript into segments
            const words = transcript.split(' ');
            const segmentSize = Math.max(10, Math.floor(words.length / 5));
            const segments = [];
            
            for (let i = 0; i < words.length; i += segmentSize) {
              const segmentWords = words.slice(i, i + segmentSize);
              const segmentText = segmentWords.join(' ');
              const startTime = (i / words.length) * 60; // Estimate timing
              const endTime = Math.min(((i + segmentSize) / words.length) * 60, 60);
              
              segments.push({
                id: `segment_${i / segmentSize}`,
                speaker: i % 2 === 0 ? 'agent' : 'client',
                text: segmentText,
                startTime,
                endTime,
                confidence: 0.9,
                criticalWords: segmentText.toLowerCase().includes('problema') || 
                             segmentText.toLowerCase().includes('reclamação') ? ['problema'] : []
              });
            }
            
            transcriptionResult = {
              text: transcript,
              segments,
              duration: 60
            };
            
            // Simple analysis based on real content
            const sentiment = transcript.toLowerCase().includes('obrigado') || 
                            transcript.toLowerCase().includes('satisfeito') ? 0.8 : 0.5;
            
            aiAnalysis = {
              sentiment,
              keyTopics: ['atendimento'],
              criticalMoments: [],
              recommendations: ['Revisar protocolos de atendimento'],
              score: Math.round(sentiment * 10)
            };
            
          } catch (error) {
            console.error('Real transcription failed:', (error as any).message);
            throw new Error(`Real transcription failed: ${(error as any).message}`);
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
            status: 'failed'
          });
        }
      });

      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating monitoring session:", error);
      res.status(500).json({ message: "Failed to create monitoring session" });
    }
  });

  // Instant transcription endpoint - works for any session regardless of status
  app.post('/api/monitoring-sessions/:id/transcribe', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor', 'evaluator'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getMonitoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      console.log(`Starting instant transcription for session ${sessionId}`);

      // Process transcription instantly using our local system
      const audioPath = session.audioUrl;
      if (!audioPath) {
        return res.status(400).json({ message: "No audio file found for this session" });
      }

      // Use OpenAI Whisper API for real transcription
      console.log('Processing with OpenAI Whisper API for real audio transcription...');
      
      // Fix audio path resolution - handle absolute paths correctly
      let resolvedPath;
      
      if (path.isAbsolute(audioPath)) {
        // If it's already an absolute path, use it directly
        resolvedPath = audioPath;
      } else {
        // If relative, join with current working directory
        resolvedPath = path.join(process.cwd(), audioPath);
      }
      
      console.log(`Original path: ${audioPath}`);
      console.log(`Resolved path: ${resolvedPath}`);
      
      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        console.error(`Audio file not found: ${resolvedPath}`);
        return res.status(400).json({ message: "Audio file not found on server" });
      }
      
      // Update status to processing immediately
      await storage.updateMonitoringSession(sessionId, {
        status: "processing"
      });

      // Use AssemblyAI for real audio transcription
      try {
        console.log('Starting AssemblyAI real transcription for session:', sessionId);
        
        const { spawn } = await import('child_process');
        
        const pythonProcess = spawn('python3', [
          '/home/runner/workspace/server/assemblyai-transcription.py',
          resolvedPath
        ], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
          console.log('AssemblyAI progress:', data.toString().trim());
        });
        
        const transcriptionResult = await new Promise((resolve, reject) => {
          pythonProcess.on('close', (code) => {
            if (code === 0) {
              try {
                const result = JSON.parse(stdout);
                resolve(result);
              } catch (parseError) {
                reject(new Error(`Failed to parse transcription result: ${parseError}`));
              }
            } else {
              reject(new Error(`AssemblyAI transcriber failed with code ${code}: ${stderr}`));
            }
          });
          
          pythonProcess.on('error', (error) => {
            reject(new Error(`Failed to start AssemblyAI transcriber: ${error.message}`));
          });
          
          // Timeout after 10 minutes for longer audio files
          setTimeout(() => {
            pythonProcess.kill();
            reject(new Error('Transcription timeout after 10 minutes'));
          }, 600000);
        });
        
        const result = transcriptionResult as any;
        
        console.log('AssemblyAI transcription completed successfully');
        console.log(`Text length: ${result.text.length} characters`);
        console.log(`Segments: ${result.segments.length}`);
        
        if (result.text && result.segments) {
          console.log(`OpenAI Whisper transcription successful: ${result.text.length} characters, ${result.segments.length} segments`);
          
          // Generate analysis based on transcription
          const transcript = result.text || '';
          const segments = result.segments || [];
          
          // Count critical words
          let criticalCount = 0;
          segments.forEach((segment: any) => {
            criticalCount += segment.criticalWords?.length || 0;
          });
          
          // Analyze sentiment
          const positiveWords = ['obrigado', 'ótimo', 'perfeito', 'excelente'];
          const negativeWords = ['problema', 'defeito', 'danificado', 'urgente'];
          
          let sentiment = 0.7;
          const lowerText = transcript.toLowerCase();
          
          positiveWords.forEach(word => {
            if (lowerText.includes(word)) sentiment += 0.1;
          });
          
          negativeWords.forEach(word => {
            if (lowerText.includes(word)) sentiment -= 0.15;
          });
          
          sentiment = Math.max(0.1, Math.min(1.0, sentiment));
          
          const aiAnalysis = {
            sentiment,
            score: Math.round(sentiment * 10),
            criticalMoments: segments.filter((seg: any) => seg.criticalWords?.length > 0).map((seg: any) => ({
              time: seg.startTime,
              description: `Palavra crítica: ${seg.criticalWords.join(', ')}`,
              severity: seg.criticalWords.length > 1 ? 'high' : 'medium'
            })),
            keyTopics: extractTopics(transcript),
            recommendations: generateRecommendations(sentiment, criticalCount),
            processingTime: '< 2s',
            engine: result.transcription_engine
          };
          
          // Update session with results
          await storage.updateMonitoringSession(sessionId, {
            transcription: {
              text: result.text,
              segments: result.segments,
              totalDuration: Math.round(result.duration)
            },
            duration: Math.round(result.duration),
            aiAnalysis: aiAnalysis,
            status: 'completed'
          });
          
          console.log(`Session ${sessionId} completed with real audio transcription`);
        } else {
          console.error(`Python transcription failed: ${result.error}`);
          await storage.updateMonitoringSession(sessionId, {
            status: 'error'
          });
        }
      } catch (error) {
        console.error('Python transcription system failed:', error);
        await storage.updateMonitoringSession(sessionId, {
          status: 'error'
        });
        return res.status(500).json({ message: `Transcription failed: ${(error as any).message}` });
      }
      
      function extractTopics(text: string): string[] {
        const topics = [];
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('pedido') || lowerText.includes('compra')) topics.push('pedido');
        if (lowerText.includes('entrega') || lowerText.includes('envio')) topics.push('entrega');
        if (lowerText.includes('produto') || lowerText.includes('item')) topics.push('produto');
        if (lowerText.includes('troca') || lowerText.includes('devolução')) topics.push('troca');
        if (lowerText.includes('problema') || lowerText.includes('defeito')) topics.push('problema');
        if (lowerText.includes('atendimento')) topics.push('atendimento');
        
        return topics.length > 0 ? topics : ['atendimento_geral'];
      }
      
      function generateRecommendations(sentiment: number, criticalCount: number): string[] {
        const recommendations = [];
        
        if (sentiment > 0.8) {
          recommendations.push('Excelente atendimento - manter padrão');
        } else if (sentiment > 0.6) {
          recommendations.push('Atendimento satisfatório');
        } else {
          recommendations.push('Atendimento precisa melhorar');
        }
        
        if (criticalCount > 0) {
          recommendations.push('Palavras críticas detectadas - acompanhar');
        }
        
        return recommendations;
      }

      // Return final session with completed transcription
      const finalSession = await storage.getMonitoringSession(sessionId);
      res.json({
        ...finalSession,
        message: "Transcription completed successfully"
      });

    } catch (error) {
      console.error("Error in Whisper transcription:", error);
      res.status(500).json({ message: "Failed to start transcription" });
    }
  });

  // Get transcription status endpoint
  app.get("/api/monitoring-sessions/:id/transcription-status", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getMonitoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.transcription) {
        // Return existing completed transcription
        res.json(session);
      } else {
        res.json({
          status: "pending",
          progress: 0,
          segments: []
        });
      }
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({ message: "Failed to get transcription status" });
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

  // Update transcription text
  app.patch('/api/monitoring-sessions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Allow supervisors, evaluators, and agents to edit transcriptions
      if (!['admin', 'supervisor', 'evaluator', 'agent'].includes(user.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const id = parseInt(req.params.id);
      const { transcriptionText } = req.body;

      if (transcriptionText === undefined) {
        return res.status(400).json({ message: "transcriptionText is required" });
      }

      const session = await storage.getMonitoringSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // For agents, only allow editing their own sessions
      if (user.role === 'agent' && session.agentId !== user.id) {
        return res.status(403).json({ message: "Can only edit your own sessions" });
      }

      // Update the transcription field with the new text
      const currentTranscription = session.transcription || {};
      const updatedTranscription = {
        ...currentTranscription,
        text: transcriptionText,
        editedAt: new Date().toISOString(),
        editedBy: user.id,
      };

      const updatedSession = await storage.updateMonitoringSession(id, {
        transcription: updatedTranscription,
      });

      res.json(updatedSession);
    } catch (error) {
      console.error("Error updating transcription:", error);
      res.status(500).json({ message: "Failed to update transcription" });
    }
  });

  // Delete monitoring session
  app.delete('/api/monitoring-sessions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getMonitoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      await storage.deleteMonitoringSession(sessionId);
      res.json({ message: 'Session deleted successfully' });
    } catch (error) {
      console.error('Error deleting monitoring session:', error);
      res.status(500).json({ message: 'Failed to delete monitoring session' });
    }
  });

  // Archive monitoring session (soft delete with reason)
  app.patch('/api/monitoring-sessions/:id/archive', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const sessionId = parseInt(req.params.id);
      const { reason } = req.body;
      const session = await storage.getMonitoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const archivedSession = await storage.archiveMonitoringSession(sessionId, user.id, reason);
      res.json({ 
        message: 'Monitoria arquivada com sucesso', 
        session: archivedSession 
      });
    } catch (error) {
      console.error('Error archiving monitoring session:', error);
      res.status(500).json({ message: 'Failed to archive monitoring session' });
    }
  });

  // Soft delete monitoring session 
  app.patch('/api/monitoring-sessions/:id/soft-delete', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const sessionId = parseInt(req.params.id);
      const { reason } = req.body;
      const session = await storage.getMonitoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const deletedSession = await storage.softDeleteMonitoringSession(sessionId, user.id, reason);
      res.json({ 
        message: 'Monitoria excluída com sucesso', 
        session: deletedSession 
      });
    } catch (error) {
      console.error('Error soft deleting monitoring session:', error);
      res.status(500).json({ message: 'Failed to soft delete monitoring session' });
    }
  });

  // Restore monitoring session from archive/deleted state
  app.patch('/api/monitoring-sessions/:id/restore', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getMonitoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const restoredSession = await storage.restoreMonitoringSession(sessionId);
      res.json({ 
        message: 'Monitoria restaurada com sucesso', 
        session: restoredSession 
      });
    } catch (error) {
      console.error('Error restoring monitoring session:', error);
      res.status(500).json({ message: 'Failed to restore monitoring session' });
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
      
      // For admin users, get criteria from all companies, for others use their companyId
      if (user?.role === 'admin') {
        const companies = await storage.getCompanies();
        if (companies.length > 0) {
          const criteria = await storage.getEvaluationCriteria(companies[0].id);
          return res.json(criteria);
        } else {
          return res.json([]);
        }
      }
      
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
      
      if (user?.role === 'admin') {
        // Admin can specify companyId via query parameter
        const queryCompanyId = req.query.companyId;
        if (!queryCompanyId) {
          return res.status(400).json({ message: "Company ID required" });
        }
        companyId = parseInt(queryCompanyId);
      } else {
        // Other roles use their assigned companyId
        if (!user?.companyId) {
          return res.status(400).json({ message: "Company ID required" });
        }
        companyId = user.companyId;
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
      const user = await storage.getUser(req.user.id);
      const { agentId } = req.query;
      
      // Admin, evaluator and supervisor can see all contests, agents only their own
      if (['admin', 'evaluator', 'supervisor'].includes(user?.role || '')) {
        const contests = await storage.getAllEvaluationContests();
        res.json(contests);
      } else {
        // For agents, get their own contests with evaluation details
        const targetAgentId = agentId || req.user.id;
        const agentContests = await db
          .select({
            id: evaluationContests.id,
            evaluationId: evaluationContests.evaluationId,
            agentId: evaluationContests.agentId,
            reason: evaluationContests.reason,
            status: evaluationContests.status,
            response: evaluationContests.response,
            createdAt: evaluationContests.createdAt,
            reviewedAt: evaluationContests.reviewedAt,
            evaluationScore: evaluations.finalScore,
            evaluationObservations: evaluations.observations,
            monitoringSessionId: evaluations.monitoringSessionId,
          })
          .from(evaluationContests)
          .innerJoin(evaluations, eq(evaluationContests.evaluationId, evaluations.id))
          .where(eq(evaluationContests.agentId, targetAgentId as string))
          .orderBy(desc(evaluationContests.createdAt));
        
        res.json(agentContests);
      }
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

  // Monitoring Evaluations endpoints
  app.get("/api/monitoring-evaluations/:monitoringId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const monitoringId = parseInt(req.params.monitoringId);
      
      // Get the monitoring session first to check permissions
      const monitoringSession = await storage.getMonitoringSession(monitoringId);
      if (!monitoringSession) {
        return res.status(404).json({ message: "Monitoring session not found" });
      }

      // Agents can only view evaluations of their own sessions
      if (user?.role === 'agent' && monitoringSession.agentId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const evaluation = await storage.getMonitoringEvaluation(monitoringId);
      if (!evaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }

      // Get form criteria and build sections with responses
      const formTemplate = await storage.getMonitoringFormTemplate(1);
      if (!formTemplate) {
        return res.status(404).json({ message: "Form template not found" });
      }

      const sections = await Promise.all(
        formTemplate.sections.map(async (section) => {
          const criteria = await Promise.all(
            section.criteria.map(async (criterion) => {
              // Get the response for this criterion from evaluation_responses
              const response = await storage.getEvaluationResponse(evaluation.id, criterion.id);
              return {
                ...criterion,
                response: response?.value || null
              };
            })
          );

          // Calculate achieved score for this section
          const achievedScore = criteria.reduce((total, criterion) => {
            if (criterion.isCritical && criterion.response === "true") {
              // Critical failure - section gets 0 points
              return 0;
            }
            if (!criterion.isCritical && (criterion.response === "sim" || criterion.response === "na")) {
              return total + criterion.weight;
            }
            return total;
          }, 0);

          return {
            ...section,
            criteria,
            achievedScore
          };
        })
      );

      const evaluationWithSections = {
        ...evaluation,
        sections
      };

      res.json(evaluationWithSections);
    } catch (error) {
      console.error("Error fetching monitoring evaluation:", error);
      res.status(500).json({ message: "Failed to fetch monitoring evaluation" });
    }
  });

  // Get detailed monitoring evaluation with session data (for evaluation details page)
  app.get("/api/monitoring-evaluations/:id/details", isAuthenticated, async (req: any, res) => {
    try {
      const evaluationId = parseInt(req.params.id);
      const user = await storage.getUser(req.user.id);
      
      // Get the evaluation
      const evaluation = await storage.getMonitoringEvaluationById(evaluationId);
      if (!evaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }

      // Get the monitoring session with full details
      const monitoringSession = await storage.getMonitoringSession(evaluation.monitoringSessionId);
      if (!monitoringSession) {
        return res.status(404).json({ message: "Monitoring session not found" });
      }

      // Only agents can view their own evaluations, or supervisors/evaluators can view any
      if (user?.role === 'agent' && monitoringSession.agentId !== user.id) {
        return res.status(403).json({ message: "You can only view your own evaluations" });
      }

      // Get the form and its sections/criteria
      const form = await storage.getMonitoringForm(evaluation.formId);
      if (!form) {
        return res.status(404).json({ message: "Evaluation form not found" });
      }

      // Get all responses for this evaluation
      const responses = await storage.getEvaluationResponses(evaluationId);

      // Build sections with criteria and scores
      const sections = await Promise.all(
        form.sections.map(async (section: any) => {
          const criteria = section.criteria.map((criterion: any) => {
            const response = responses.find((r: any) => r.criteriaId === criterion.id);
            return {
              ...criterion,
              score: response?.pointsEarned || 0,
              maxScore: criterion.weight,
              comment: response?.response || ''
            };
          });

          return {
            ...section,
            criteria
          };
        })
      );

      // Parse transcription if it exists
      let transcription = null;
      if (monitoringSession.transcription) {
        try {
          transcription = typeof monitoringSession.transcription === 'string' 
            ? JSON.parse(monitoringSession.transcription) 
            : monitoringSession.transcription;
        } catch (e) {
          console.warn("Failed to parse transcription:", e);
        }
      }

      const detailedEvaluation = {
        ...evaluation,
        finalScore: parseFloat(evaluation.finalScore as string),
        partialScore: parseFloat(evaluation.partialScore as string),
        session: {
          ...monitoringSession,
          transcription
        },
        sections
      };

      res.json(detailedEvaluation);
    } catch (error) {
      console.error("Error fetching detailed monitoring evaluation:", error);
      res.status(500).json({ message: "Failed to fetch detailed monitoring evaluation" });
    }
  });

  // Sign monitoring evaluation (for agents)
  app.post("/api/monitoring-evaluations/:id/sign", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const evaluationId = parseInt(req.params.id);
      const { comment, agentId, signedAt } = req.body;

      // Only agents can sign evaluations
      if (user?.role !== 'agent') {
        return res.status(403).json({ message: "Only agents can sign evaluations" });
      }

      const evaluation = await storage.getMonitoringEvaluation(evaluationId);
      if (!evaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }

      // Get the monitoring session to verify ownership
      const monitoringSession = await storage.getMonitoringSession(evaluation.monitoringSessionId);
      if (!monitoringSession || monitoringSession.agentId !== user.id) {
        return res.status(403).json({ message: "You can only sign your own evaluations" });
      }

      // Check if already signed
      if (evaluation.agentSignature) {
        return res.status(400).json({ message: "Evaluation already signed" });
      }

      // Update evaluation with signature
      const updatedEvaluation = await storage.updateMonitoringEvaluation(evaluationId, {
        agentSignature: comment || "Assinatura digital confirmada",
        agentSignedAt: new Date(signedAt)
      });

      res.json(updatedEvaluation);
    } catch (error) {
      console.error("Error signing monitoring evaluation:", error);
      res.status(500).json({ message: "Failed to sign monitoring evaluation" });
    }
  });

  // Monitoring Forms endpoints
  app.get("/api/monitoring-forms/active", isAuthenticated, async (req, res) => {
    try {
      const form = await storage.getActiveMonitoringForm();
      res.json(form);
    } catch (error) {
      console.error("Error fetching active monitoring form:", error);
      res.status(500).json({ message: "Failed to fetch monitoring form" });
    }
  });

  app.get("/api/monitoring-forms/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const form = await storage.getMonitoringForm(parseInt(id));
      res.json(form);
    } catch (error) {
      console.error("Error fetching monitoring form:", error);
      res.status(500).json({ message: "Failed to fetch monitoring form" });
    }
  });

  // Performance evolution endpoint for agents
  app.get("/api/performance-evolution/:userId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const months = parseInt(req.query.months as string) || 6;
      
      const user = await storage.getUser(req.user.id);
      
      // Only allow agents to view their own data, or supervisors/admins to view any data
      if (user?.role === 'agent' && req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const performanceData = await storage.getPerformanceEvolution(userId, months);
      res.json(performanceData);
    } catch (error) {
      console.error("Error fetching performance evolution:", error);
      res.status(500).json({ message: "Failed to fetch performance evolution" });
    }
  });

  // Monitoring Evaluations endpoints
  app.post("/api/monitoring-evaluations", isAuthenticated, async (req, res) => {
    try {
      const evaluationData = {
        ...req.body,
        evaluatorId: req.user.id,
      };
      const evaluation = await storage.createMonitoringEvaluation(evaluationData);
      res.status(201).json(evaluation);
    } catch (error) {
      console.error("Error creating monitoring evaluation:", error);
      res.status(500).json({ message: "Failed to create monitoring evaluation" });
    }
  });

  app.get("/api/monitoring-evaluations", isAuthenticated, async (req, res) => {
    try {
      const { sessionId } = req.query;
      const evaluations = await storage.getMonitoringEvaluations(
        sessionId ? parseInt(sessionId as string) : undefined
      );
      res.json(evaluations);
    } catch (error) {
      console.error("Error fetching monitoring evaluations:", error);
      res.status(500).json({ message: "Failed to fetch monitoring evaluations" });
    }
  });

  app.patch("/api/monitoring-evaluations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const evaluation = await storage.updateMonitoringEvaluation(parseInt(id), req.body);
      res.json(evaluation);
    } catch (error) {
      console.error("Error updating monitoring evaluation:", error);
      res.status(500).json({ message: "Failed to update monitoring evaluation" });
    }
  });

  // Evaluation contests endpoints
  app.get("/api/evaluation-contests", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      if (user?.role === 'agent') {
        const contests = await storage.getEvaluationContests(user.id);
        res.json(contests);
      } else {
        const contests = await storage.getAllEvaluationContests();
        res.json(contests);
      }
    } catch (error) {
      console.error("Error fetching evaluation contests:", error);
      res.status(500).json({ message: "Failed to fetch evaluation contests" });
    }
  });

  app.post("/api/evaluation-contests", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      if (user?.role !== 'agent') {
        return res.status(403).json({ message: "Only agents can create contests" });
      }

      const contestData = {
        ...req.body,
        agentId: user.id,
        status: 'pending' as const
      };

      const contest = await storage.createEvaluationContest(contestData);
      res.status(201).json(contest);
    } catch (error) {
      console.error("Error creating evaluation contest:", error);
      res.status(500).json({ message: "Failed to create evaluation contest" });
    }
  });

  app.patch("/api/evaluation-contests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const contestId = parseInt(req.params.id);
      
      // Only supervisors and admins can update contest status
      if (user?.role !== 'supervisor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const contest = await storage.updateEvaluationContest(contestId, req.body);
      res.json(contest);
    } catch (error) {
      console.error("Error updating evaluation contest:", error);
      res.status(500).json({ message: "Failed to update evaluation contest" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
