import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Calendar, 
  Phone, 
  User, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Download,
  Play,
  Pause
} from "lucide-react";

interface EvaluationSection {
  id: number;
  name: string;
  criteria: Array<{
    id: number;
    name: string;
    weight: number;
    score?: number;
    maxScore: number;
    comment?: string;
  }>;
}

interface EvaluationDetails {
  id: number;
  monitoringSessionId: number;
  finalScore: number;
  partialScore: number;
  observations: string;
  status: string;
  hasCriticalFailure: boolean;
  criticalFailureReason?: string;
  createdAt: string;
  session: {
    id: number;
    agentId: string;
    duration: number;
    audioUrl: string;
    createdAt: string;
    transcription?: {
      text: string;
      segments: Array<{
        start: number;
        end: number;
        speaker: string;
        text: string;
      }>;
    };
  };
  sections: EvaluationSection[];
}

export default function MonitoringEvaluationDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [signatureComment, setSignatureComment] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: evaluation, isLoading } = useQuery<EvaluationDetails>({
    queryKey: [`/api/monitoring-evaluations/${id}/details`],
    enabled: !!id,
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/monitoring-evaluations/${id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: signatureComment,
          agentId: user?.id,
          signedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao assinar avaliação');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Avaliação Assinada",
        description: "Sua assinatura foi registrada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/my-evaluations'] });
      setLocation('/my-evaluations');
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="loading-shimmer h-20 rounded-lg"></div>
            <div className="loading-shimmer h-96 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Avaliação não encontrada
          </h2>
          <Button onClick={() => setLocation('/my-evaluations')}>
            Voltar para Minhas Avaliações
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Monitoria de Atendimento
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Avaliação #{evaluation.id} - {formatDate(evaluation.session.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge className={getScoreBadgeColor(evaluation.finalScore)}>
                {evaluation.finalScore.toFixed(1)} pontos
              </Badge>
              <Badge variant={evaluation.status === 'pending' ? 'secondary' : 'default'}>
                {evaluation.status === 'pending' ? 'Pendente de Assinatura' : 'Assinada'}
              </Badge>
            </div>
          </div>
          
          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Data/Hora</p>
                    <p className="font-medium">{formatDate(evaluation.session.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Duração</p>
                    <p className="font-medium">{formatDuration(evaluation.session.duration)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Atendente</p>
                    <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Canal</p>
                    <p className="font-medium">Telefone</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="quality">Resumo da Qualidade</TabsTrigger>
            <TabsTrigger value="transcription">Transcrição</TabsTrigger>
            <TabsTrigger value="audit">Trilha de Auditoria</TabsTrigger>
            <TabsTrigger value="customer">Percursos do Cliente</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Métricas de Interação */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Métricas de Interação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Tipo de interação</p>
                      <p className="font-medium">Chamada</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Seleção</p>
                      <p className="font-medium">65.46%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Conversação do cliente</p>
                      <p className="font-medium">4.51%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Conversação do agente</p>
                      <p className="font-medium">4.51%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Informações da Gravação */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações da Gravação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Chamada Gravação 1</span>
                      <span className="text-sm">(Editada)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Data de início</span>
                      <span className="text-sm">{formatDate(evaluation.session.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Data de encerramento</span>
                      <span className="text-sm">Nenhum</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Protocolo</span>
                      <span className="text-sm">Não</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPlaying ? 'Pausar' : 'Reproduzir'}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Formulário de Avaliação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ficha de Monitoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {evaluation.sections?.map((section) => (
                    <div key={section.id} className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                        {section.name}
                      </h3>
                      <div className="grid gap-4">
                        {section.criteria.map((criterion) => (
                          <div key={criterion.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {criterion.name}
                              </p>
                              {criterion.comment && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {criterion.comment}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                Peso: {criterion.weight}
                              </Badge>
                              <div className="text-right">
                                <p className={`font-bold ${getScoreColor(criterion.score || 0)}`}>
                                  {criterion.score?.toFixed(1) || '0.0'}/{criterion.maxScore}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Observações Gerais */}
                  {evaluation.observations && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Observações Gerais
                      </h3>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300">
                          {evaluation.observations}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Nota Final */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Pontuação Final
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Resultado da avaliação de monitoria
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-bold ${getScoreColor(evaluation.finalScore)}`}>
                          {evaluation.finalScore.toFixed(1)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          de 100 pontos
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seção de Assinatura */}
            {evaluation.status === 'pending' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Assinatura Digital
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="signature-comment">
                      Comentários sobre a avaliação (opcional)
                    </Label>
                    <Textarea
                      id="signature-comment"
                      placeholder="Adicione seus comentários sobre esta avaliação..."
                      value={signatureComment}
                      onChange={(e) => setSignatureComment(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={() => signMutation.mutate()}
                      disabled={signMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {signMutation.isPending ? 'Assinando...' : 'Assinar Avaliação'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLocation('/my-evaluations')}
                    >
                      Voltar
                    </Button>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ao assinar, você confirma que revisou e concorda com esta avaliação.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transcription" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transcrição da Ligação</CardTitle>
              </CardHeader>
              <CardContent>
                {evaluation.session.transcription ? (
                  <div className="space-y-4">
                    {evaluation.session.transcription.segments?.map((segment, index) => (
                      <div key={index} className="flex gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="text-sm text-gray-500 w-16">
                          {Math.floor(segment.start / 60)}:{(segment.start % 60).toString().padStart(2, '0')}
                        </div>
                        <div className="flex-1">
                          <span className={`font-medium ${
                            segment.speaker === 'agente' ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {segment.speaker === 'agente' ? 'Atendente' : 'Cliente'}:
                          </span>
                          <span className="ml-2">{segment.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    Transcrição não disponível para esta ligação.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outras abas podem ser implementadas conforme necessário */}
          <TabsContent value="categories">
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500">Conteúdo em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality">
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500">Conteúdo em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500">Conteúdo em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customer">
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500">Conteúdo em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}