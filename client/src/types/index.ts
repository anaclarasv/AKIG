export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'supervisor' | 'evaluator' | 'agent';
  companyId?: number;
  virtualCoins: number;
  isActive: boolean;
}

export interface Company {
  id: number;
  name: string;
  logoUrl?: string;
  isActive: boolean;
}

export interface Campaign {
  id: number;
  name: string;
  description?: string;
  companyId: number;
  isActive: boolean;
}

export interface MonitoringSession {
  id: number;
  agentId: string;
  evaluatorId?: string;
  campaignId: number;
  audioUrl?: string;
  transcription?: TranscriptionData;
  duration?: number;
  criticalMoments?: CriticalMoment[];
  aiAnalysis?: AIAnalysis;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface TranscriptionData {
  segments: TranscriptionSegment[];
  totalDuration: number;
}

export interface TranscriptionSegment {
  id: string;
  speaker: 'agent' | 'client';
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  criticalWords?: string[];
}

export interface CriticalMoment {
  id: string;
  timestamp: number;
  type: 'critical_word' | 'silence' | 'tone_issue' | 'interruption';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AIAnalysis {
  criticalWordsCount: number;
  totalSilenceTime: number;
  averageToneScore: number;
  sentimentScore: number;
  recommendations: string[];
}

export interface EvaluationCriteria {
  id: number;
  name: string;
  description?: string;
  weight: number;
  maxScore: number;
  companyId: number;
}

export interface Evaluation {
  id: number;
  monitoringSessionId: number;
  evaluatorId: string;
  scores: Record<string, number>;
  observations?: string;
  finalScore: number;
  status: 'pending' | 'signed' | 'contested';
  agentSignature?: string;
  signedAt?: string;
  contestedAt?: string;
  contestReason?: string;
  createdAt: string;
}

export interface Reward {
  id: number;
  name: string;
  description?: string;
  cost: number;
  imageUrl?: string;
  companyId: number;
}

export interface RankingEntry {
  userId: string;
  firstName: string;
  lastName: string;
  averageScore: number;
  virtualCoins: number;
  rank: number;
}

export interface DashboardMetrics {
  todayMonitorings: number;
  averageScore: number;
  pendingForms: number;
  activeAgents: number;
}

export interface ActivityEntry {
  id: number;
  agentName: string;
  agentId: string;
  campaignName: string;
  evaluatorName: string;
  score: number;
  status: 'pending' | 'signed' | 'contested';
  createdAt: string;
}
