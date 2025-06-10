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
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
    if (companyId || agentId) {
      const evaluationsWithSessions = await db
        .select()
        .from(evaluations)
        .innerJoin(monitoringSessions, eq(evaluations.monitoringSessionId, monitoringSessions.id))
        .innerJoin(campaigns, eq(monitoringSessions.campaignId, campaigns.id))
        .where(and(
          companyId ? eq(campaigns.companyId, companyId) : undefined,
          agentId ? eq(monitoringSessions.agentId, agentId) : undefined
        ).filter(Boolean) as any);
      
      return evaluationsWithSessions.map(result => result.evaluations);
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
      .set({ ...criteria, updatedAt: new Date() })
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
      .values({ userId, rewardId })
      .returning();

    return purchase;
  }

  async getDashboardMetrics(companyId?: number): Promise<{
    todayMonitorings: number;
    averageScore: number;
    pendingForms: number;
    activeAgents: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's monitoring sessions count
    let todayQuery = db
      .select({ count: count() })
      .from(monitoringSessions);

    if (companyId) {
      todayQuery = todayQuery
        .innerJoin(campaigns, eq(monitoringSessions.campaignId, campaigns.id))
        .where(and(
          eq(campaigns.companyId, companyId),
          sql`${monitoringSessions.createdAt} >= ${today}`
        ));
    } else {
      todayQuery = todayQuery.where(sql`${monitoringSessions.createdAt} >= ${today}`);
    }

    const [todayResult] = await todayQuery;

    // Average score
    let avgQuery = db
      .select({ avg: avg(evaluations.finalScore) })
      .from(evaluations)
      .innerJoin(monitoringSessions, eq(evaluations.monitoringSessionId, monitoringSessions.id));

    if (companyId) {
      avgQuery = avgQuery
        .innerJoin(campaigns, eq(monitoringSessions.campaignId, campaigns.id))
        .where(eq(campaigns.companyId, companyId));
    }

    const [avgResult] = await avgQuery;

    // Pending forms count
    let pendingQuery = db
      .select({ count: count() })
      .from(evaluations)
      .innerJoin(monitoringSessions, eq(evaluations.monitoringSessionId, monitoringSessions.id));

    if (companyId) {
      pendingQuery = pendingQuery
        .innerJoin(campaigns, eq(monitoringSessions.campaignId, campaigns.id))
        .where(and(
          eq(campaigns.companyId, companyId),
          eq(evaluations.status, 'pending')
        ));
    } else {
      pendingQuery = pendingQuery.where(eq(evaluations.status, 'pending'));
    }

    const [pendingResult] = await pendingQuery;

    // Active agents count
    let agentsQuery = db
      .select({ count: count() })
      .from(users);

    if (companyId) {
      agentsQuery = agentsQuery.where(and(
        eq(users.role, 'agent'),
        eq(users.isActive, true),
        eq(users.companyId, companyId)
      ));
    } else {
      agentsQuery = agentsQuery.where(and(
        eq(users.role, 'agent'),
        eq(users.isActive, true)
      ));
    }

    const [agentsResult] = await agentsQuery;

    return {
      todayMonitorings: todayResult.count || 0,
      averageScore: Number(avgResult.avg) || 0,
      pendingForms: pendingResult.count || 0,
      activeAgents: agentsResult.count || 0,
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
    const baseQuery = db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        virtualCoins: users.virtualCoins,
        averageScore: sql<number>`COALESCE(AVG(CAST(${evaluations.finalScore} AS DECIMAL)), 0)`,
      })
      .from(users)
      .leftJoin(monitoringSessions, eq(users.id, monitoringSessions.agentId))
      .leftJoin(evaluations, eq(monitoringSessions.id, evaluations.monitoringSessionId))
      .where(and(
        eq(users.role, "agent"),
        eq(users.isActive, true),
        companyId ? eq(users.companyId, companyId) : undefined
      ).filter(Boolean) as any)
      .groupBy(users.id, users.firstName, users.lastName, users.virtualCoins)
      .orderBy(sql`COALESCE(AVG(CAST(${evaluations.finalScore} AS DECIMAL)), 0) DESC`);

    const results = await baseQuery;

    return results.map((result, index) => ({
      userId: result.userId,
      firstName: result.firstName || "",
      lastName: result.lastName || "",
      averageScore: result.averageScore,
      virtualCoins: result.virtualCoins || 0,
      rank: index + 1,
    }));
  }
}

export const storage = new DatabaseStorage();