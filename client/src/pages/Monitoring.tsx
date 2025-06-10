import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, Volume2, Download, Upload, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { MonitoringSession, Campaign } from "@/types";

export default function Monitoring() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    agentId: "",
    campaignId: "",
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user can create new monitoring sessions - only evaluators and admins
  const canCreateMonitoring = user?.role === 'admin' || user?.role === 'evaluator';
  
  // Check if user can view all sessions or only their own
  const canViewAllSessions = user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'evaluator';

  // Redirect agents away from this page
  if (user?.role === 'agent') {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-4">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  const { data: sessions, isLoading } = useQuery<MonitoringSession[]>({
    queryKey: ['/api/monitoring-sessions'],
  });

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest('POST', '/api/monitoring-sessions', data);
    },
    onSuccess: (response) => {
      const newSession = response;
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

  const handleNewMonitoring = () => {
    setIsUploadDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
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
                {getStatusBadge(session.status)}
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
                        {session.aiAnalysis.criticalWordsCount}
                      </p>
                      <p className="text-xs text-red-700">Críticas</p>
                    </div>
                    <div className="p-2 bg-amber-50 rounded">
                      <p className="text-amber-600 font-semibold text-sm">
                        {session.aiAnalysis.totalSilenceTime}s
                      </p>
                      <p className="text-xs text-amber-700">Silêncio</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-blue-600 font-semibold text-sm">
                        {session.aiAnalysis.averageToneScore.toFixed(1)}
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSelectedSession(session.id)}
                  >
                    {session.status === 'pending' ? 'Acompanhar Transcrição' : 'Ver Detalhes'}
                  </Button>
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
              <Label htmlFor="agent">Agente *</Label>
              <Input
                id="agent"
                placeholder="ID do Agente"
                value={formData.agentId}
                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="campaign">Campanha *</Label>
              <Select value={formData.campaignId} onValueChange={(value) => setFormData({ ...formData, campaignId: value })}>
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
              <Label htmlFor="audio">Arquivo de Áudio *</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="audio"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                />
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
              {audioFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Arquivo selecionado: {audioFile.name}
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
