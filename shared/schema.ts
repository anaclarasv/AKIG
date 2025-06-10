import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for username/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("agent"), // admin, supervisor, evaluator, agent
  companyId: integer("company_id").references(() => companies.id),
  virtualCoins: integer("virtual_coins").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies table for multi-tenant architecture
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  logoUrl: varchar("logo_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Monitoring sessions table
export const monitoringSessions = pgTable("monitoring_sessions", {
  id: serial("id").primaryKey(),
  agentId: varchar("agent_id").references(() => users.id).notNull(),
  evaluatorId: varchar("evaluator_id").references(() => users.id),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  audioUrl: varchar("audio_url"),
  transcription: jsonb("transcription"), // AI transcription data
  duration: integer("duration"), // in seconds
  criticalMoments: jsonb("critical_moments"), // timestamps of critical moments
  aiAnalysis: jsonb("ai_analysis"), // AI analysis results
  status: varchar("status").default("pending"), // pending, in_progress, completed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Evaluation criteria template
export const evaluationCriteria = pgTable("evaluation_criteria", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(), // percentage weight
  maxScore: integer("max_score").default(10),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Evaluations table
export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  monitoringSessionId: integer("monitoring_session_id").references(() => monitoringSessions.id).notNull(),
  evaluatorId: varchar("evaluator_id").references(() => users.id).notNull(),
  scores: jsonb("scores"), // criteria scores
  observations: text("observations"),
  finalScore: decimal("final_score", { precision: 4, scale: 2 }),
  status: varchar("status").default("pending"), // pending, signed, contested
  agentSignature: varchar("agent_signature"),
  signedAt: timestamp("signed_at"),
  contestedAt: timestamp("contested_at"),
  contestReason: text("contest_reason"),
  supervisorComment: text("supervisor_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rewards and gamification
export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  cost: integer("cost").notNull(), // cost in virtual coins
  imageUrl: varchar("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reward purchases
export const rewardPurchases = pgTable("reward_purchases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  rewardId: integer("reward_id").references(() => rewards.id).notNull(),
  cost: integer("cost").notNull(),
  status: varchar("status").default("pending"), // pending, delivered, cancelled
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

// Evaluation contests
export const evaluationContests = pgTable("evaluation_contests", {
  id: serial("id").primaryKey(),
  evaluationId: integer("evaluation_id").references(() => evaluations.id).notNull(),
  agentId: varchar("agent_id").notNull(),
  reason: text("reason").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected
  response: text("response"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull().default("info"), // info, success, warning, error
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  relatedId: integer("related_id"),
  relatedType: varchar("related_type"), // evaluation, contest, monitoring, etc
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMonitoringSessionSchema = createInsertSchema(monitoringSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEvaluationSchema = createInsertSchema(evaluations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEvaluationCriteriaSchema = createInsertSchema(evaluationCriteria).omit({
  id: true,
  createdAt: true,
});

export const insertRewardSchema = createInsertSchema(rewards).omit({
  id: true,
  createdAt: true,
});

export const insertEvaluationContestSchema = createInsertSchema(evaluationContests).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type MonitoringSession = typeof monitoringSessions.$inferSelect;
export type InsertMonitoringSession = z.infer<typeof insertMonitoringSessionSchema>;
export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
export type EvaluationCriteria = typeof evaluationCriteria.$inferSelect;
export type InsertEvaluationCriteria = z.infer<typeof insertEvaluationCriteriaSchema>;
export type Reward = typeof rewards.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type RewardPurchase = typeof rewardPurchases.$inferSelect;
export type EvaluationContest = typeof evaluationContests.$inferSelect;
export type InsertEvaluationContest = z.infer<typeof insertEvaluationContestSchema>;
