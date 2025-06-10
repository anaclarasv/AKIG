import {
  users,
  companies,
  campaigns,
  monitoringSessions,
  evaluations,
  evaluationCriteria,
  rewards,
  rewardPurchases,
  type User,
  type UpsertUser,
  type InsertUser,
  type Company,
  type InsertCompany,
  type Campaign,
  type InsertCampaign,
  type MonitoringSession,
  type InsertMonitoringSession,
  type Evaluation,
  type InsertEvaluation,
  type EvaluationCriteria,
  type InsertEvaluationCriteria,
  type Reward,
  type InsertReward,
  type RewardPurchase,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, avg, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Company operations
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company>;
  
  // Campaign operations
  getCampaigns(companyId?: number): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign>;
  
  // Monitoring operations
  getMonitoringSessions(companyId?: number, agentId?: string): Promise<MonitoringSession[]>;
  getMonitoringSession(id: number): Promise<MonitoringSession | undefined>;
  createMonitoringSession(session: InsertMonitoringSession): Promise<MonitoringSession>;
  updateMonitoringSession(id: number, session: Partial<InsertMonitoringSession>): Promise<MonitoringSession>;
  
  // Evaluation operations
  getEvaluations(companyId?: number, agentId?: string): Promise<Evaluation[]>;
  getEvaluation(id: number): Promise<Evaluation | undefined>;
  createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;
  updateEvaluation(id: number, evaluation: Partial<InsertEvaluation>): Promise<Evaluation>;
  
  // Evaluation criteria operations
  getEvaluationCriteria(companyId: number): Promise<EvaluationCriteria[]>;
  createEvaluationCriteria(criteria: InsertEvaluationCriteria): Promise<EvaluationCriteria>;
  updateEvaluationCriteria(id: number, criteria: Partial<InsertEvaluationCriteria>): Promise<EvaluationCriteria>;
  
  // Reward operations
  getRewards(companyId: number): Promise<Reward[]>;
  createReward(reward: InsertReward): Promise<Reward>;
  getUserRewardPurchases(userId: string): Promise<RewardPurchase[]>;
  purchaseReward(userId: string, rewardId: number): Promise<RewardPurchase>;
  
  // Dashboard metrics
  getDashboardMetrics(companyId?: number): Promise<{
    todayMonitorings: number;
    averageScore: number;
    pendingForms: number;
    activeAgents: number;
  }>;
  
  // Ranking operations
  getUserRanking(companyId?: number): Promise<Array<{
    userId: string;
    firstName: string;
    lastName: string;
    averageScore: number;
    virtualCoins: number;
    rank: number;
  }>>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [user] = await db.insert(users).values({ ...userData, id }).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).where(eq(companies.isActive, true));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company> {
    const [updatedCompany] = await db
      .update(companies)
      .set({ ...company, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return updatedCompany;
  }

  async getCampaigns(companyId?: number): Promise<Campaign[]> {
    if (companyId) {
      return await db.select().from(campaigns).where(and(
        eq(campaigns.isActive, true),
        eq(campaigns.companyId, companyId)
      ));
    }
    return await db.select().from(campaigns).where(eq(campaigns.isActive, true));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign> {
    const [updatedCampaign] = await db
      .update(campaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return updatedCampaign;
  }

  async getMonitoringSessions(companyId?: number, agentId?: string): Promise<MonitoringSession[]> {
    if (companyId && agentId) {
      // Get sessions for specific company and agent
      const sessionsWithCampaigns = await db
        .select()
        .from(monitoringSessions)
        .innerJoin(campaigns, eq(monitoringSessions.campaignId, campaigns.id))
        .where(and(
          eq(campaigns.companyId, companyId),
          eq(monitoringSessions.agentId, agentId)
        ))
        .orderBy(desc(monitoringSessions.createdAt));
      
      return sessionsWithCampaigns.map(result => result.monitoring_sessions);
    } else if (companyId) {
      // Get sessions for specific company
      const sessionsWithCampaigns = await db
        .select()
        .from(monitoringSessions)
        .innerJoin(campaigns, eq(monitoringSessions.campaignId, campaigns.id))
        .where(eq(campaigns.companyId, companyId))
        .orderBy(desc(monitoringSessions.createdAt));
      
      return sessionsWithCampaigns.map(result => result.monitoring_sessions);
    } else if (agentId) {
      // Get sessions for specific agent
      return await db.select().from(monitoringSessions)
        .where(eq(monitoringSessions.agentId, agentId))
        .orderBy(desc(monitoringSessions.createdAt));
    }
    
    // Get all sessions
    return await db.select().from(monitoringSessions).orderBy(desc(monitoringSessions.createdAt));
  }

  async getMonitoringSession(id: number): Promise<MonitoringSession | undefined> {
    const [session] = await db.select().from(monitoringSessions).where(eq(monitoringSessions.id, id));
    return session;
  }

  async createMonitoringSession(session: InsertMonitoringSession): Promise<MonitoringSession> {
    const [newSession] = await db.insert(monitoringSessions).values(session).returning();
    return newSession;
  }

  async updateMonitoringSession(id: number, session: Partial<InsertMonitoringSession>): Promise<MonitoringSession> {
    const [updatedSession] = await db
      .update(monitoringSessions)
      .set({ ...session, updatedAt: new Date() })
      .where(eq(monitoringSessions.id, id))
      .returning();
    return updatedSession;
  }

  async getEvaluations(companyId?: number, agentId?: string): Promise<Evaluation[]> {
    if (companyId && agentId) {
      const evaluationsWithSessions = await db
        .select({
          id: evaluations.id,
          monitoringSessionId: evaluations.monitoringSessionId,
          evaluatorId: evaluations.evaluatorId,
          scores: evaluations.scores,
          observations: evaluations.observations,
          finalScore: evaluations.finalScore,
          status: evaluations.status,
          agentSignature: evaluations.agentSignature,
          signedAt: evaluations.signedAt,
          contestedAt: evaluations.contestedAt,
          contestReason: evaluations.contestReason,
          createdAt: evaluations.createdAt,
          updatedAt: evaluations.updatedAt,
        })
        .from(evaluations)
        .innerJoin(monitoringSessions, eq(evaluations.monitoringSessionId, monitoringSessions.id))
        .innerJoin(campaigns, eq(monitoringSessions.campaignId, campaigns.id))
        .where(and(
          eq(campaigns.companyId, companyId),
          eq(monitoringSessions.agentId, agentId)
        ));
      
      return evaluationsWithSessions;
    } else if (companyId) {
      const evaluationsWithSessions = await db
        .select({
          id: evaluations.id,
          monitoringSessionId: evaluations.monitoringSessionId,
          evaluatorId: evaluations.evaluatorId,
          scores: evaluations.scores,
          observations: evaluations.observations,
          finalScore: evaluations.finalScore,
          status: evaluations.status,
          agentSignature: evaluations.agentSignature,
          signedAt: evaluations.signedAt,
          contestedAt: evaluations.contestedAt,
          contestReason: evaluations.contestReason,
          createdAt: evaluations.createdAt,
          updatedAt: evaluations.updatedAt,
        })
        .from(evaluations)
        .innerJoin(monitoringSessions, eq(evaluations.monitoringSessionId, monitoringSessions.id))
        .innerJoin(campaigns, eq(monitoringSessions.campaignId, campaigns.id))
        .where(eq(campaigns.companyId, companyId));
      
      return evaluationsWithSessions;
    } else if (agentId) {
      const evaluationsWithSessions = await db
        .select({
          id: evaluations.id,
          monitoringSessionId: evaluations.monitoringSessionId,
          evaluatorId: evaluations.evaluatorId,
          scores: evaluations.scores,
          observations: evaluations.observations,
          finalScore: evaluations.finalScore,
          status: evaluations.status,
          agentSignature: evaluations.agentSignature,
          signedAt: evaluations.signedAt,
          contestedAt: evaluations.contestedAt,
          contestReason: evaluations.contestReason,
          createdAt: evaluations.createdAt,
          updatedAt: evaluations.updatedAt,
        })
        .from(evaluations)
        .innerJoin(monitoringSessions, eq(evaluations.monitoringSessionId, monitoringSessions.id))
        .where(eq(monitoringSessions.agentId, agentId));
      
      return evaluationsWithSessions;
    }
    
    return await db.select().from(evaluations);
  }

  async getEvaluation(id: number): Promise<Evaluation | undefined> {
    const [evaluation] = await db.select().from(evaluations).where(eq(evaluations.id, id));
    return evaluation;
  }

  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    const [newEvaluation] = await db.insert(evaluations).values(evaluation).returning();
    return newEvaluation;
  }

  async updateEvaluation(id: number, evaluation: Partial<InsertEvaluation>): Promise<Evaluation> {
    const [updatedEvaluation] = await db
      .update(evaluations)
      .set({ ...evaluation, updatedAt: new Date() })
      .where(eq(evaluations.id, id))
      .returning();
    return updatedEvaluation;
  }

  async getEvaluationCriteria(companyId: number): Promise<EvaluationCriteria[]> {
    return await db.select().from(evaluationCriteria).where(eq(evaluationCriteria.companyId, companyId));
  }

  async createEvaluationCriteria(criteria: InsertEvaluationCriteria): Promise<EvaluationCriteria> {
    const [newCriteria] = await db.insert(evaluationCriteria).values(criteria).returning();
    return newCriteria;
  }

  async updateEvaluationCriteria(id: number, criteria: Partial<InsertEvaluationCriteria>): Promise<EvaluationCriteria> {
    const [updatedCriteria] = await db
      .update(evaluationCriteria)
      .set(criteria)
      .where(eq(evaluationCriteria.id, id))
      .returning();
    return updatedCriteria;
  }

  async getRewards(companyId: number): Promise<Reward[]> {
    return await db.select().from(rewards).where(eq(rewards.companyId, companyId));
  }

  async createReward(reward: InsertReward): Promise<Reward> {
    const [newReward] = await db.insert(rewards).values(reward).returning();
    return newReward;
  }

  async getUserRewardPurchases(userId: string): Promise<RewardPurchase[]> {
    return await db.select().from(rewardPurchases).where(eq(rewardPurchases.userId, userId));
  }

  async purchaseReward(userId: string, rewardId: number): Promise<RewardPurchase> {
    // Get user and reward
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const [reward] = await db.select().from(rewards).where(eq(rewards.id, rewardId));

    if (!user || !reward) {
      throw new Error('User or reward not found');
    }

    const userCoins = user.virtualCoins || 0;
    if (userCoins < reward.cost) {
      throw new Error('Insufficient virtual coins');
    }

    // Update user's virtual coins
    await db
      .update(users)
      .set({ virtualCoins: userCoins - reward.cost })
      .where(eq(users.id, userId));

    // Create purchase record
    const [purchase] = await db
      .insert(rewardPurchases)
      .values({ 
        userId: userId,
        rewardId: rewardId,
        cost: reward.cost 
      })
      .returning();

    return purchase;
  }

  async getDashboardMetrics(companyId?: number): Promise<{
    todayMonitorings: number;
    averageScore: number;
    pendingForms: number;
    activeAgents: number;
  }> {
    // Return mock data for now to get the app running
    return {
      todayMonitorings: 5,
      averageScore: 8.5,
      pendingForms: 3,
      activeAgents: 12,
    };
  }

  async getUserRanking(companyId?: number): Promise<Array<{
    userId: string;
    firstName: string;
    lastName: string;
    averageScore: number;
    virtualCoins: number;
    rank: number;
  }>> {
    // Simplified implementation for now
    const allUsers = await db.select().from(users).where(and(
      eq(users.role, "agent"),
      eq(users.isActive, true)
    ));

    return allUsers.map((user, index) => ({
      userId: user.id,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      averageScore: 8.5, // Mock score for now
      virtualCoins: user.virtualCoins || 0,
      rank: index + 1,
    }));
  }
}

export const storage = new DatabaseStorage();