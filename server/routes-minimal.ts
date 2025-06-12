import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";

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
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Basic routes for monitoring system
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard metrics
  app.get('/api/dashboard/metrics', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Monitoring sessions
  app.get('/api/monitoring', isAuthenticated, async (req, res) => {
    try {
      const sessions = await storage.getMonitoringSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching monitoring sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.get('/api/monitoring/:id', isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getMonitoringSession(parseInt(req.params.id));
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching monitoring session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // Audio upload
  app.post('/api/monitoring/upload', isAuthenticated, upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const audioUrl = `/uploads/${req.file.filename}`;
      const userId = req.user?.claims?.sub;

      const session = await storage.createMonitoringSession({
        agentId: req.body.agentId || userId,
        evaluatorId: userId,
        audioUrl,
        status: 'pending',
        transcription: null,
        analysis: null
      });

      res.json(session);
    } catch (error) {
      console.error("Error uploading audio:", error);
      res.status(500).json({ message: "Failed to upload audio" });
    }
  });

  // Users management
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  const httpServer = createServer(app);
  return httpServer;
}