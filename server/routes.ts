import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import {
  insertCompanySchema,
  insertCampaignSchema,
  insertMonitoringSessionSchema,
  insertEvaluationSchema,
  insertEvaluationCriteriaSchema,
  insertRewardSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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
        isActive: user.isActive,
      });
    } catch (error) {
      console.error("Error creating user:", error as Error);
      res.status(500).json({ message: "Failed to create user" });
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
      const companyId = user?.role === 'admin' ? undefined : (user?.companyId ?? undefined);
      const agentId = user?.role === 'agent' ? user.id : undefined;
      const sessions = await storage.getMonitoringSessions(companyId, agentId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching monitoring sessions:", error);
      res.status(500).json({ message: "Failed to fetch monitoring sessions" });
    }
  });

  app.post('/api/monitoring-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!['admin', 'supervisor', 'evaluator'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      const validatedData = insertMonitoringSessionSchema.parse(req.body);
      const session = await storage.createMonitoringSession(validatedData);
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
      if (!user?.companyId) {
        return res.status(400).json({ message: "Company ID required" });
      }
      const rewards = await storage.getRewards(user.companyId);
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

  const httpServer = createServer(app);
  return httpServer;
}
