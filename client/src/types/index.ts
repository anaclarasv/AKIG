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
  campaignCount?: number;
  activeUserCount?: number;
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
  channelType: 'voice' | 'chat' | 'email';
  audioUrl?: string;
  chatContent?: string;
  emailContent?: string;
  transcription?: TranscriptionData;
  chatAnalysis?: ChatAnalysisData;
  emailAnalysis?: EmailAnalysisData;
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
  conversationFlow?: ConversationMessage[];
  speakerAnalysis?: SpeakerAnalysis;
}

export interface ConversationMessage {
  timestamp: string;
  speaker: 'agent' | 'client';
  message: string;
  sentiment: number;
  responseTime?: number;
}

export interface SpeakerAnalysis {
  agent: {
    messageCount: number;
    avgResponseTime: number;
    sentimentScore: number;
    professionalismScore: number;
  };
  client: {
    messageCount: number;
    sentimentScore: number;
    satisfactionLevel: number;
  };
}

export interface ChatAnalysisData {
  conversationFlow: ConversationMessage[];
  speakerAnalysis: SpeakerAnalysis;
  overallScore: number;
  recommendations: string[];
}

export interface EmailAnalysisData {
  conversationFlow: ConversationMessage[];
  speakerAnalysis: SpeakerAnalysis;
  overallScore: number;
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
  supervisorComment?: string;
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

export interface RewardPurchase {
  id: number;
  userId: string;
  rewardId: number;
  purchasedAt: string;
  reward?: Reward;
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
  todayMonitoringsChange: number;
  averageScore: number;
  averageScoreChange: number;
  pendingForms: number;
  pendingFormsChange: number;
  activeAgents: number;
  activeAgentsChange: number;
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
