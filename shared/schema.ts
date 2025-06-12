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

// Companies table for multi-tenant architecture
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  logoUrl: varchar("logo_url"),
  domain: varchar("domain"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  supervisorId: varchar("supervisor_id").references(() => users.id), // For agents to reference their supervisor
  virtualCoins: integer("virtual_coins").default(0),
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
  status: varchar("status").default("pending"), // pending, in_progress, completed, archived, deleted
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by").references(() => users.id),
  archiveReason: text("archive_reason"),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by").references(() => users.id),
  deleteReason: text("delete_reason"),
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Monitoring forms for dynamic evaluation templates
export const monitoringForms = pgTable("monitoring_forms", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  name: varchar("name").notNull(),
  version: varchar("version").default("1.0"),
  formData: jsonb("form_data").notNull(), // Dynamic form structure
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Monitoring evaluations
export const monitoringEvaluations = pgTable("monitoring_evaluations", {
  id: serial("id").primaryKey(),
  monitoringSessionId: integer("monitoring_session_id").references(() => monitoringSessions.id).notNull(),
  evaluatorId: varchar("evaluator_id").references(() => users.id).notNull(),
  formId: integer("form_id").references(() => monitoringForms.id),
  evaluationData: jsonb("evaluation_data").notNull(), // Dynamic evaluation responses
  totalScore: decimal("total_score", { precision: 5, scale: 2 }),
  comments: text("comments"),
  agentSignature: text("agent_signature"), // Digital signature content
  agentSignedAt: timestamp("agent_signed_at"),
  contestedAt: timestamp("contested_at"),
  contestReason: text("contest_reason"),
  contestResolvedAt: timestamp("contest_resolved_at"),
  contestResolvedBy: varchar("contest_resolved_by").references(() => users.id),
  contestResolution: text("contest_resolution"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rewards store products
export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  imageUrl: varchar("image_url"),
  cost: integer("cost").notNull(), // in virtual coins
  category: varchar("category"),
  isActive: boolean("is_active").default(true),
  stock: integer("stock"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reward purchases/redemptions
export const rewardPurchases = pgTable("reward_purchases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  rewardId: integer("reward_id").references(() => rewards.id).notNull(),
  cost: integer("cost").notNull(),
  status: varchar("status").default("pending"), // pending, approved, denied, delivered
  adminNotes: text("admin_notes"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coin transactions for audit trail
export const coinTransactions = pgTable("coin_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(), // positive for earning, negative for spending
  type: varchar("type").notNull(), // evaluation_bonus, reward_purchase, manual_adjustment
  referenceId: integer("reference_id"), // ID of related record (evaluation, purchase, etc)
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contests/campaigns for gamification
export const contests = pgTable("contests", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  prizes: jsonb("prizes"), // Array of prize objects
  rules: text("rules"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contest participants
export const contestParticipants = pgTable("contest_participants", {
  id: serial("id").primaryKey(),
  contestId: integer("contest_id").references(() => contests.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  score: decimal("score", { precision: 10, scale: 2 }).default("0"),
  rank: integer("rank"),
  isEligible: boolean("is_eligible").default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications for users
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").default("info"), // info, success, warning, error
  isRead: boolean("is_read").default(false),
  relatedId: integer("related_id"),
  relatedType: varchar("related_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Form sections for dynamic monitoring forms
export const formSections = pgTable("form_sections", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => monitoringForms.id),
  name: varchar("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Form criteria for evaluation
export const formCriteria = pgTable("form_criteria", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").references(() => formSections.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // evaluation, signature, etc
  criterionType: varchar("criterion_type").default("checkbox"), // checkbox, radio, text
  options: jsonb("options"),
  maxScore: integer("max_score").default(10),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull().default("1.00"),
  isRequired: boolean("is_required").default(false),
  isCritical: boolean("is_critical").default(false), // ZERA criteria
  orderIndex: integer("order_index").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// LGPD compliance logs
export const lgpdLogs = pgTable("lgpd_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(), // data_export, data_deletion, consent_granted, consent_revoked
  details: jsonb("details"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Data retention policies
export const dataRetentionPolicies = pgTable("data_retention_policies", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  dataType: varchar("data_type").notNull(), // monitoring_sessions, evaluations, etc
  retentionPeriodDays: integer("retention_period_days").notNull(),
  autoDelete: boolean("auto_delete").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;
export type MonitoringSession = typeof monitoringSessions.$inferSelect;
export type InsertMonitoringSession = typeof monitoringSessions.$inferInsert;
export type MonitoringEvaluation = typeof monitoringEvaluations.$inferSelect;
export type InsertMonitoringEvaluation = typeof monitoringEvaluations.$inferInsert;
export type MonitoringForm = typeof monitoringForms.$inferSelect;
export type InsertMonitoringForm = typeof monitoringForms.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;
export type Reward = typeof rewards.$inferSelect;
export type InsertReward = typeof rewards.$inferInsert;
export type RewardPurchase = typeof rewardPurchases.$inferSelect;
export type InsertRewardPurchase = typeof rewardPurchases.$inferInsert;
export type CoinTransaction = typeof coinTransactions.$inferSelect;
export type InsertCoinTransaction = typeof coinTransactions.$inferInsert;
export type Contest = typeof contests.$inferSelect;
export type InsertContest = typeof contests.$inferInsert;
export type ContestParticipant = typeof contestParticipants.$inferSelect;
export type InsertContestParticipant = typeof contestParticipants.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type EvaluationCriteria = typeof evaluationCriteria.$inferSelect;
export type InsertEvaluationCriteria = typeof evaluationCriteria.$inferInsert;

// Aliases for backward compatibility
export type Evaluation = MonitoringEvaluation;
export type InsertEvaluation = InsertMonitoringEvaluation;
export type EvaluationContest = Contest;
export type InsertEvaluationContest = InsertContest;
export type UpsertUser = InsertUser;

// Zod schemas for validation
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

export const insertMonitoringSessionSchema = createInsertSchema(monitoringSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMonitoringEvaluationSchema = createInsertSchema(monitoringEvaluations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMonitoringFormSchema = createInsertSchema(monitoringForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEvaluationCriteriaSchema = createInsertSchema(evaluationCriteria).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRewardSchema = createInsertSchema(rewards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRewardPurchaseSchema = createInsertSchema(rewardPurchases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCoinTransactionSchema = createInsertSchema(coinTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertContestSchema = createInsertSchema(contests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Alias for backward compatibility
export const insertEvaluationSchema = insertMonitoringEvaluationSchema;