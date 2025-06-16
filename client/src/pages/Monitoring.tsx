import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { SafeSelect, SelectItem } from "@/components/ui/safe-select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Phone, MessageSquare, Mail, Eye, MoreVertical, Download, Archive, Trash2,
  ClipboardList, CheckCircle, AlertCircle, XCircle, Brain, Volume2, Play,
  ArrowLeft, User, Building2, Calendar, Clock
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/Header";
import ConversationFlow from "@/components/monitoring/ConversationFlow";
import MonitoringEvaluationForm from "@/components/monitoring/MonitoringEvaluationForm";

interface MonitoringSession {
  id: number;
  agentId: string;
  campaignId: number;
  channelType: 'voice' | 'chat' | 'email';
  status: 'pending' | 'completed' | 'processing' | 'in_progress';
  audioUrl?: string;
  chatContent?: string;
  emailContent?: string;
  transcription?: any;
  aiAnalysis?: any;
  duration: number;
  createdAt: string;
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

interface Campaign {
  id: number;
  name: string;
}

export default function Monitoring() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    channelType: 'all'
  });
  const [createFormData, setCreateFormData] = useState({
    agentId: '',
    campaignId: null as number | null,
    channelType: '' as 'voice' | 'chat' | 'email' | ''
  });
  const [processingStatuses, setProcessingStatuses] = useState<Record<number, string>>({});
  const [transcriptionProgress, setTranscriptionProgress] = useState<Record<number, number>>({});

  // Fetch monitoring sessions
  const { data: monitoringSessions, isLoading } = useQuery<MonitoringSession[]>({
    queryKey: ['/api/monitoring-sessions'],
  });

  // Fetch agents
  const { data: agents } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  // Fetch campaigns
  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
  });

  // Create monitoring session mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/monitoring-sessions', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring-sessions'] });
      setShowCreateModal(false);
      setCreateFormData({ agentId: '', campaignId: null, channelType: '' });
      toast({
        title: "Sucesso",
        description: "Sessão de monitoria criada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar sessão de monitoria",
        variant: "destructive",
      });
    },
  });

  // Transcription mutation
  const transcribingMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest('POST', `/api/monitoring-sessions/${sessionId}/transcribe`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring-sessions'] });
      toast({
        title: "Sucesso",
        description: "Processamento iniciado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao iniciar processamento",
        variant: "destructive",
      });
    },
  });

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.agentId || !createFormData.campaignId || !createFormData.channelType) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(createFormData);
  };

  const handleStartTranscription = (sessionId: number) => {
    transcribingMutation.mutate(sessionId);
  };

  // Filter sessions
  const filteredSessions = monitoringSessions?.filter(session => {
    const statusMatch = filters.status === 'all' || session.status === filters.status;
    const channelMatch = filters.channelType === 'all' || session.channelType === filters.channelType;
    return statusMatch && channelMatch;
  }) || [];

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (!seconds) return '--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Safe analysis value access
  const safeAnalysisValue = (session: MonitoringSession, key: string, defaultValue: number = 0): number => {
    try {
      return session.aiAnalysis?.[key] ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // Format score
  const formatScore = (score: number): string => {
    return score ? score.toFixed(1) : '0.0';
  };

  // Get selected session data
  const selectedSessionData = selectedSession 
    ? monitoringSessions?.find(s => s.id === selectedSession)
    : null;

  // Show session details if selected
  if (selectedSession && selectedSessionData) {
    return (
      <>
        <Header 
          title={`Monitoria #${selectedSession}`}
          subtitle={`Status: ${selectedSessionData.status === 'pending' ? 'Transcrição em andamento' : 'Concluída'}`}
          action={{
            label: "Voltar",
            onClick: () => setSelectedSession(null)
          }}
        />
        
        <div className="mt-8 space-y-8">
          {/* Top Section - Transcription/Content Display */}
          <Card className="akig-card-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                {selectedSessionData.channelType === 'voice' ? 'Transcrição e Análise' : 
                 selectedSessionData.channelType === 'chat' ? 'Análise de Chat' : 'Análise de E-mail'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedSessionData.channelType === 'voice' ? (
                // Voice channel content
                <div className="space-y-6">
                  {/* Audio Controls */}
                  {selectedSessionData.audioUrl && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Volume2 className="h-4 w-4" />
                          Controles de Áudio
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `/uploads/${selectedSessionData.audioUrl?.split('/').pop()}`;
                            link.download = `audio_sessao_${selectedSession}.mp3`;
                            link.click();
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Baixar
                        </Button>
                      </div>
                      <audio 
                        controls 
                        className="w-full"
                        preload="metadata"
                      >
                        <source src={`/uploads/${selectedSessionData.audioUrl?.split('/').pop()}`} type="audio/mpeg" />
                        Seu navegador não suporta o elemento de áudio.
                      </audio>
                      <div className="flex items-center justify-between text-sm bg-blue-50 p-3 rounded-lg mt-3">
                        <span className="text-blue-700 font-medium">Duração:</span>
                        <span className="font-semibold text-blue-800">
                          {selectedSessionData.duration ? 
                            `${Math.floor(selectedSessionData.duration / 60)}:${String(selectedSessionData.duration % 60).padStart(2, '0')}` 
                            : 'Calculando...'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* AI Analysis Display */}
                  {selectedSessionData.aiAnalysis && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Análise IA
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-white rounded border">
                          <p className="text-red-600 font-bold text-lg text-center">
                            {safeAnalysisValue(selectedSessionData, 'criticalWordsCount')}
                          </p>
                          <p className="text-xs text-red-700 text-center font-medium">Palavras Críticas</p>
                        </div>
                        <div className="p-3 bg-white rounded border">
                          <p className="text-amber-600 font-bold text-lg text-center">
                            {Math.round(safeAnalysisValue(selectedSessionData, 'totalSilenceTime'))}s
                          </p>
                          <p className="text-xs text-amber-700 text-center font-medium">Silêncio Total</p>
                        </div>
                        <div className="p-3 bg-white rounded border">
                          <p className="text-blue-600 font-bold text-lg text-center">
                            {formatScore(safeAnalysisValue(selectedSessionData, 'averageToneScore'))}
                          </p>
                          <p className="text-xs text-blue-700 text-center font-medium">Tom Médio</p>
                        </div>
                        <div className="p-3 bg-white rounded border">
                          <p className="text-green-600 font-bold text-lg text-center">
                            {formatScore(safeAnalysisValue(selectedSessionData, 'sentimentScore'))}
                          </p>
                          <p className="text-xs text-green-700 text-center font-medium">Sentimento</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Chat/Email channel content
                <div className="min-h-[400px] h-auto overflow-y-auto border rounded-lg p-4">
                  {selectedSessionData.status === 'completed' && (selectedSessionData.transcription as any)?.conversationFlow?.length ? (
                    <ConversationFlow
                      messages={(selectedSessionData.transcription as any).conversationFlow}
                      channelType={selectedSessionData.channelType}
                      speakerAnalysis={(selectedSessionData.transcription as any).speakerAnalysis}
                    />
                  ) : selectedSessionData.status === 'completed' ? (
                    <div className="space-y-4 p-4">
                      <h4 className="font-medium text-green-600">Análise Concluída</h4>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-800">
                          A análise foi processada com sucesso. Use a ficha de monitoria abaixo para avaliar o atendimento.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <Brain className="h-12 w-12 mb-2 opacity-50" />
                      <p className="text-center">Aguardando processamento do conteúdo</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Section - Monitoring Evaluation Form */}
          <Card className="akig-card-shadow">
            <CardHeader className="pb-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <ClipboardList className="w-6 h-6 text-green-600" />
                <span className="text-xl">Ficha de Monitoria - {selectedSessionData.channelType === 'voice' ? 'Voz' : selectedSessionData.channelType === 'chat' ? 'Chat' : 'E-mail'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <MonitoringEvaluationForm monitoringSessionId={selectedSession} />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Header 
        title="Sistema de Monitoria"
        subtitle="Gerencie e avalie sessões de atendimento multicanal"
        action={{
          label: "Nova Monitoria",
          onClick: () => setShowCreateModal(true)
        }}
      />

      {/* Create Monitoring Session Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nova Monitoria
            </DialogTitle>
            <DialogDescription>
              Selecione o agente e canal para iniciar uma nova sessão de monitoria
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateSession} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agentId">Agente *</Label>
                <SafeSelect
                  value={createFormData.agentId}
                  onValueChange={(value) => setCreateFormData(prev => ({ ...prev, agentId: value }))}
                  required
                  placeholder="Selecione um agente..."
                  emptyState="Nenhum agente encontrado"
                >
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName}
                    </SelectItem>
                  ))}
                </SafeSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaignId">Campanha *</Label>
                <SafeSelect
                  value={createFormData.campaignId?.toString() || ''}
                  onValueChange={(value) => setCreateFormData(prev => ({ ...prev, campaignId: parseInt(value) }))}
                  required
                  placeholder="Selecione uma campanha..."
                  emptyState="Nenhuma campanha encontrada"
                >
                  {campaigns?.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SafeSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="channelType">Canal *</Label>
                <SafeSelect
                  value={createFormData.channelType}
                  onValueChange={(value: 'voice' | 'chat' | 'email') => setCreateFormData(prev => ({ ...prev, channelType: value }))}
                  required
                  placeholder="Selecione o canal..."
                  emptyState="Nenhum canal disponível"
                >
                  <SelectItem value="voice">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Voz
                    </div>
                  </SelectItem>
                  <SelectItem value="chat">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      E-mail
                    </div>
                  </SelectItem>
                </SafeSelect>
              </div>
            </div>

            <div className="flex justify-between space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Monitoria
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Monitoring Sessions Table */}
      <Card className="akig-card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Sessões de Monitoria
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({monitoringSessions?.length || 0} sessões)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="statusFilter" className="text-sm font-medium">Status</Label>
                <SafeSelect
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  placeholder="Todos os status"
                  emptyState="Nenhum status disponível"
                >
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                </SafeSelect>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="channelFilter" className="text-sm font-medium">Canal</Label>
                <SafeSelect
                  value={filters.channelType}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, channelType: value }))}
                  placeholder="Todos os canais"
                  emptyState="Nenhum canal disponível"
                >
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="voice">Voz</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                </SafeSelect>
              </div>
            </div>
            
            {/* Sessions Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Carregando sessões...</span>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma sessão encontrada</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comece criando uma nova sessão de monitoria.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Monitoria
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Agente</TableHead>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session) => (
                      <TableRow key={session.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">#{session.id}</TableCell>
                        <TableCell>
                          {agents?.find(a => a.id === session.agentId)?.firstName || 'N/A'} {agents?.find(a => a.id === session.agentId)?.lastName || ''}
                        </TableCell>
                        <TableCell>
                          {campaigns?.find(c => c.id === session.campaignId)?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {session.channelType === 'voice' && <Phone className="h-4 w-4 text-blue-600" />}
                            {session.channelType === 'chat' && <MessageSquare className="h-4 w-4 text-green-600" />}
                            {session.channelType === 'email' && <Mail className="h-4 w-4 text-purple-600" />}
                            <span className="capitalize">
                              {session.channelType === 'voice' ? 'Voz' : 
                               session.channelType === 'chat' ? 'Chat' : 'E-mail'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            session.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : session.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {session.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {session.status === 'processing' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {session.status === 'pending' && <XCircle className="h-3 w-3 mr-1" />}
                            {session.status === 'completed' ? 'Concluída' : 
                             session.status === 'processing' ? 'Processando' : 'Pendente'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(session.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {formatDuration(session.duration)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedSession(session.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setSelectedSession(session.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Baixar Dados
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Arquivar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}