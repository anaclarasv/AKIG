import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, Volume2, Download, Upload, Plus, MoreVertical, Trash2, Archive } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { safeAnalysisValue, formatScore, formatDuration } from "@/lib/safeAccess";
import { User } from "@/types";
import type { MonitoringSession, Campaign } from "@/types";
import MonitoringEvaluationForm from "@/components/monitoring/MonitoringEvaluationForm";
import DynamicEvaluationForm from "@/components/monitoring/DynamicEvaluationForm";

export default function Monitoring() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcriptionProgress, setTranscriptionProgress] = useState<{[key: number]: number}>({});
  const [processingStatuses, setProcessingStatuses] = useState<{[key: number]: string}>({});
  const [formData, setFormData] = useState({
    agentId: "",
    campaignId: "",
  });
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user can create new monitoring sessions - only evaluators and admins
  const canCreateMonitoring = user?.role === 'admin' || user?.role === 'evaluator';
  
  // Check if user can view all sessions or only their own
  const canViewAllSessions = user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'evaluator';

  const { data: sessions, isLoading } = useQuery<MonitoringSession[]>({
    queryKey: ['/api/monitoring-sessions'],
    refetchInterval: selectedSession ? 2000 : false, // Poll every 2 seconds when viewing a session
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data
  });

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
  });

  const { data: agents } = useQuery<User[]>({
    queryKey: ['/api/agents'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest('POST', '/api/monitoring-sessions', data);
    },
    onSuccess: async (response) => {
      const newSession = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring-sessions'] });
      setIsUploadDialogOpen(false);
      setAudioFile(null);
      setFormData({ agentId: "", campaignId: "" });
      
      // Automatically select the new session to show transcription progress
      if (newSession?.id) {
        setSelectedSession(newSession.id);
      }
      
      toast({
        title: "Sucesso",
        description: "Áudio enviado com sucesso! Transcrição em andamento...",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao enviar áudio. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return await apiRequest('DELETE', `/api/monitoring-sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring-sessions'] });
      toast({
        title: "Sucesso",
        description: "Monitoria excluída com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir monitoria. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Archive session mutation
  const archiveMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return await apiRequest('PATCH', `/api/monitoring-sessions/${sessionId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring-sessions'] });
      toast({
        title: "Sucesso",
        description: "Monitoria arquivada com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error('Archive error:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao arquivar monitoria. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Handler functions with confirmation
  const handleDeleteSession = (sessionId: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta monitoria? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate(sessionId);
    }
  };

  const handleArchiveSession = (sessionId: number) => {
    if (window.confirm("Tem certeza que deseja arquivar esta monitoria?")) {
      archiveMutation.mutate(sessionId);
    }
  };

  // Enhanced transcription mutation with progress monitoring
  const transcribingMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      setProcessingStatuses(prev => ({ ...prev, [sessionId]: "processing" }));
      setTranscriptionProgress(prev => ({ ...prev, [sessionId]: 0 }));
      
      const response = await apiRequest("POST", `/api/monitoring-sessions/${sessionId}/transcribe`);
      const result = await response.json();
      
      // Start polling for progress if processing
      if (result.status === "processing") {
        pollTranscriptionStatus(sessionId);
      }
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Transcrição Iniciada",
        description: "Processamento em segundo plano iniciado. Você pode reproduzir o áudio enquanto aguarda.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na transcrição",
        description: "Falha ao iniciar transcrição. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Function to poll transcription status with real-time updates
  const pollTranscriptionStatus = async (sessionId: number) => {
    const maxAttempts = 30; // 1 minute maximum
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await apiRequest("GET", `/api/monitoring-sessions/${sessionId}/transcription-status`);
        const status = await response.json();
        
        if (status.progress !== undefined) {
          setTranscriptionProgress(prev => ({ ...prev, [sessionId]: status.progress }));
        }
        
        if (status.status === "completed") {
          setProcessingStatuses(prev => ({ ...prev, [sessionId]: "completed" }));
          setTranscriptionProgress(prev => ({ ...prev, [sessionId]: 100 }));
          queryClient.invalidateQueries({ queryKey: ['/api/monitoring-sessions'] });
          
          toast({
            title: "Transcrição Concluída",
            description: "A transcrição foi processada com sucesso e está disponível para análise!",
          });
          return;
        }
        
        if (status.status === "error") {
          setProcessingStatuses(prev => ({ ...prev, [sessionId]: "error" }));
          toast({
            title: "Erro na Transcrição",
            description: "Falha no processamento. Tente novamente.",
            variant: "destructive",
          });
          return;
        }
        
        // Continue polling if still processing
        if (status.status === "processing" && attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000); // Poll every 2 seconds
        }
      } catch (error) {
        console.error("Error polling transcription status:", error);
      }
    };
    
    poll();
  };

  const handleStartTranscription = (sessionId: number) => {
    transcribingMutation.mutate(sessionId);
  };

  const handleNewMonitoring = () => {
    setIsUploadDialogOpen(true);
  };

  // Function to automatically select agent based on campaign
  const handleCampaignChange = (campaignId: string) => {
    setFormData({ ...formData, campaignId });
    
    // Find the selected campaign to get its company
    const selectedCampaign = campaigns?.find(c => c.id.toString() === campaignId);
    if (selectedCampaign && agents) {
      // Find agents from the same company as the campaign
      const companyAgents = agents.filter(agent => agent.companyId === selectedCampaign.companyId);
      
      // Automatically select the first available agent
      if (companyAgents.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          campaignId, 
          agentId: companyAgents[0].id 
        }));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Accept any audio file or files with audio extensions
      const isAudioFile = file.type.startsWith('audio/') || 
                         /\.(mp3|wav|flac|aac|ogg|webm|m4a|mp4|amr|3gp|aiff)$/i.test(file.name);
      
      if (isAudioFile) {
        console.log('File selected:', file.name, file.type, file.size);
        setAudioFile(file);
      } else {
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo de áudio válido.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = () => {
    console.log('handleSubmit called');
    console.log('audioFile:', audioFile);
    console.log('formData:', formData);
    
    if (!audioFile || !formData.agentId || !formData.campaignId) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const uploadData = new FormData();
    uploadData.append('audio', audioFile);
    uploadData.append('agentId', formData.agentId);
    uploadData.append('campaignId', formData.campaignId);

    console.log('FormData contents:');
    console.log('- agentId:', uploadData.get('agentId'));
    console.log('- campaignId:', uploadData.get('campaignId'));
    console.log('- audio file:', uploadData.get('audio'));

    uploadMutation.mutate(uploadData);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Concluída</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800">Em andamento</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Header 
          title="Monitorias"
          subtitle="Sessões de monitoramento de atendimento"
        />
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="akig-card-shadow">
              <CardContent className="pt-6">
                <div className="loading-shimmer h-32 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Get selected session data with safe property access
  const selectedSessionData = sessions?.find(s => s.id === selectedSession);

  // If a session is selected, show detailed view
  if (selectedSession && selectedSessionData) {
    return (
      <div className="p-6">
        <Header 
          title={`Monitoria #${selectedSession}`}
          subtitle={`Status: ${selectedSessionData.status === 'pending' ? 'Transcrição em andamento' : 'Concluída'}`}
          action={{
            label: "Voltar",
            onClick: () => setSelectedSession(null)
          }}
        />
        
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audio Player and Controls */}
          <Card className="lg:col-span-1 akig-card-shadow">
            <CardHeader>
              <CardTitle>Controles de Áudio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSessionData.audioUrl && (
                <div className="space-y-4">
                  <audio 
                    controls 
                    className="w-full"
                    preload="metadata"
                  >
                    <source src={`/uploads/${selectedSessionData.audioUrl?.split('/').pop()}`} type="audio/mpeg" />
                    Seu navegador não suporta o elemento de áudio.
                  </audio>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duração:</span>
                    <span className="font-medium">
                      {selectedSessionData.duration ? 
                        `${Math.floor(selectedSessionData.duration / 60)}:${String(selectedSessionData.duration % 60).padStart(2, '0')}` 
                        : 'Calculando...'}
                    </span>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `/uploads/${selectedSessionData.audioUrl?.split('/').pop()}`;
                      link.download = `audio_sessao_${selectedSession}.mp3`;
                      link.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Áudio
                  </Button>
                </div>
              )}
              
              {selectedSessionData.transcription?.analysis && (
                <div className="space-y-3">
                  <h4 className="font-medium">Análise IA</h4>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-red-50 rounded">
                      <p className="text-red-600 font-semibold text-sm">
                        {selectedSessionData.transcription.analysis.criticas || 0}
                      </p>
                      <p className="text-xs text-red-700">Expressões Críticas</p>
                    </div>
                    <div className="p-2 bg-amber-50 rounded">
                      <p className="text-amber-600 font-semibold text-sm">
                        {selectedSessionData.transcription.analysis.neutras || 0}
                      </p>
                      <p className="text-xs text-amber-700">Expressões Neutras</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <p className="text-green-600 font-semibold text-sm">
                        {selectedSessionData.transcription.analysis.positivas || 0}
                      </p>
                      <p className="text-xs text-green-700">Expressões Positivas</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-gray-600 font-semibold text-sm">
                        {selectedSessionData.transcription.analysis.silencioSegundos || 0}s
                      </p>
                      <p className="text-xs text-gray-700">Silêncio total</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcription Display */}
          <Card className="lg:col-span-2 akig-card-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Transcrição com IA Local</CardTitle>
                {(selectedSessionData.status === 'in_progress' || processingStatuses[selectedSessionData.id] === 'processing') && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-muted-foreground">Processando com Whisper local...</span>
                    </div>
                    <Progress 
                      value={transcriptionProgress[selectedSessionData.id] || 0} 
                      className="w-full"
                    />
                    <span className="text-xs text-muted-foreground">
                      {transcriptionProgress[selectedSessionData.id] || 0}% concluído
                    </span>
                  </div>
                )}
              </div>
              <Button 
                onClick={() => handleStartTranscription(selectedSessionData.id)}
                disabled={transcribingMutation.isPending || processingStatuses[selectedSessionData.id] === 'processing'}
                size="sm"
                variant="outline"
              >
                {(transcribingMutation.isPending || processingStatuses[selectedSessionData.id] === 'processing') ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Transcrevendo...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    {selectedSessionData.transcription?.segments?.length ? 'Retranscrever' : 'Transcrever Agora'}
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-96 overflow-y-auto space-y-3">
                {selectedSessionData.transcription?.segments?.length ? (
                  selectedSessionData.transcription.segments.map((segment, index) => (
                    <div 
                      key={segment.id || index} 
                      className={`p-3 rounded-lg ${
                        segment.speaker === 'agent' 
                          ? 'bg-blue-50 border-l-4 border-blue-400' 
                          : 'bg-gray-50 border-l-4 border-gray-400'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-medium ${
                          segment.speaker === 'agent' ? 'text-blue-700' : 'text-gray-700'
                        }`}>
                          {segment.speaker === 'agent' ? 'Atendente' : 'Cliente'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.floor(segment.startTime / 60)}:{String(Math.floor(segment.startTime % 60)).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="text-sm">{segment.text}</p>
                      {segment.criticalWords && segment.criticalWords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {segment.criticalWords.map((word, i) => (
                            <Badge key={i} variant="destructive" className="text-xs">
                              {word}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : selectedSessionData.status === 'pending' ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto"></div>
                    </div>
                    <p className="text-muted-foreground mt-4">Aguardando transcrição...</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhuma transcrição disponível</p>
                    <Button 
                      onClick={() => handleStartTranscription(selectedSessionData.id)}
                      className="mt-4"
                      disabled={transcribingMutation.isPending}
                    >
                      {transcribingMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Transcrevendo...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Iniciar Transcrição
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Evaluation Form */}
          {showEvaluationForm && selectedSessionData.transcription && (
            <Card className="lg:col-span-3 akig-card-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Ficha de Monitoria Dinâmica</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowEvaluationForm(false)}
                  >
                    Fechar Ficha
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <MonitoringEvaluationForm 
                  monitoringSessionId={selectedSessionData.id}
                  onEvaluationSaved={(evaluationId) => {
                    toast({
                      title: "Avaliação salva",
                      description: `Ficha de monitoria #${evaluationId} criada com sucesso.`,
                    });
                    setShowEvaluationForm(false);
                    queryClient.invalidateQueries({ queryKey: ['/api/monitoring-sessions'] });
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header 
        title="Monitorias"
        subtitle="Sessões de monitoramento de atendimento"
        action={canCreateMonitoring ? {
          label: "Nova Monitoria",
          onClick: handleNewMonitoring
        } : undefined}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sessions?.map((session) => (
          <Card key={session.id} className="akig-card-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Sessão #{session.id}</CardTitle>
                <div className="flex items-center gap-2">
                  {getStatusBadge(session.status)}
                  {(user?.role === 'admin' || user?.role === 'supervisor') && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleArchiveSession(session.id)}
                          disabled={archiveMutation.isPending || session.status === 'archived'}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Arquivar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteSession(session.id)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Criada em: {new Date(session.createdAt).toLocaleString('pt-BR')}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="font-medium">
                    {session.duration ? `${Math.floor(session.duration / 60)}:${String(session.duration % 60).padStart(2, '0')}` : 'N/A'}
                  </span>
                </div>
                
                {session.aiAnalysis && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-red-50 rounded">
                      <p className="text-red-600 font-semibold text-sm">
                        {safeAnalysisValue(session, 'criticalWordsCount')}
                      </p>
                      <p className="text-xs text-red-700">Críticas</p>
                    </div>
                    <div className="p-2 bg-amber-50 rounded">
                      <p className="text-amber-600 font-semibold text-sm">
                        {safeAnalysisValue(session, 'totalSilenceTime')}s
                      </p>
                      <p className="text-xs text-amber-700">Silêncio</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-blue-600 font-semibold text-sm">
                        {formatScore(safeAnalysisValue(session, 'averageToneScore'))}
                      </p>
                      <p className="text-xs text-blue-700">Tom</p>
                    </div>
                  </div>
                )}

                {session.audioUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={togglePlayback}
                        className="w-8 h-8 p-0"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                      <Progress value={33} className="flex-1" />
                      <span className="text-xs text-muted-foreground">1:23 / 3:45</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  {/* Botão de Avaliar para evaluators/admin e botão Ver para agentes */}
                  {session.transcription && (
                    <Button 
                      variant="default" 
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedSession(session.id);
                        setShowEvaluationForm(true);
                      }}
                    >
                      {(user?.role === 'evaluator' || user?.role === 'admin') ? 'Avaliar' : 'Ver Avaliação'}
                    </Button>
                  )}
                  
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!sessions || sessions.length === 0) && (
        <Card className="mt-6 akig-card-shadow">
          <CardContent className="pt-6 text-center">
            <div className="py-12">
              <Volume2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma monitoria encontrada
              </h3>
              <p className="text-muted-foreground mb-4">
                {canCreateMonitoring 
                  ? "Comece criando sua primeira sessão de monitoramento"
                  : "Aguarde que uma monitoria seja criada"
                }
              </p>
              {canCreateMonitoring && (
                <Button onClick={handleNewMonitoring} className="akig-bg-primary hover:opacity-90">
                  Criar Nova Monitoria
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Monitoria</DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo de áudio para iniciar uma nova sessão de monitoramento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="campaign">Campanha *</Label>
              <Select value={formData.campaignId} onValueChange={handleCampaignChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma campanha" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns?.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                  {(!campaigns || campaigns.length === 0) && (
                    <SelectItem value="placeholder" disabled>
                      Nenhuma campanha encontrada
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="agent">Agente *</Label>
              <Select value={formData.agentId} onValueChange={(value) => setFormData({ ...formData, agentId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Agente será selecionado automaticamente" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const selectedCampaign = campaigns?.find(c => c.id.toString() === formData.campaignId);
                    const availableAgents = agents?.filter(agent => 
                      selectedCampaign ? agent.companyId === selectedCampaign.companyId : true
                    ) || [];
                    
                    return availableAgents.length > 0 ? (
                      availableAgents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.firstName} {agent.lastName} ({agent.email})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="placeholder" disabled>
                        {formData.campaignId ? "Nenhum agente disponível para esta empresa" : "Selecione uma campanha primeiro"}
                      </SelectItem>
                    );
                  })()}
                </SelectContent>
              </Select>
              {formData.agentId && (
                <p className="text-sm text-muted-foreground mt-1">
                  Agente selecionado automaticamente baseado na empresa da campanha
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="audio">Arquivo de Áudio *</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="audio"
                  type="file"
                  accept=".mp3,.wav,.flac,.aac,.ogg,.webm,.m4a,.mp4,.amr,.3gp,.aiff,audio/*"
                  onChange={handleFileChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                />
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos suportados: MP3, WAV, FLAC, AAC, OGG, WEBM, M4A, AMR, AIFF (máx. 100MB)
              </p>
              {audioFile && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Arquivo selecionado: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(1)}MB)
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={uploadMutation.isPending}
              className="akig-bg-primary hover:opacity-90"
            >
              {uploadMutation.isPending ? "Enviando..." : "Enviar Áudio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
