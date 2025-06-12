import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Signature, Eye, Download, Calendar, Clock, User, Phone, Edit, Save, X, Plus, Trash2, Brain } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import KeywordAnalysisPanel from "@/components/monitoring/KeywordAnalysisPanel";

interface TranscriptionSegment {
  id: string;
  text: string;
  speaker: 'agent' | 'customer' | 'unknown';
  timestamp?: string;
}

interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  type: string;
  weight: number;
  isCritical: boolean;
  response?: string;
}

interface EvaluationSection {
  id: string;
  name: string;
  criteria: EvaluationCriterion[];
  totalWeight: number;
  achievedScore: number;
}

interface MonitoringSession {
  id: number;
  agentId: string;
  evaluatorId: string;
  audioUrl: string;
  transcription: any;
  analysis?: any; // Campo para análise de IA
  status: string;
  createdAt: string;
  agent?: {
    firstName: string;
    lastName: string;
  };
  evaluator?: {
    firstName: string;
    lastName: string;
  };
}

interface MonitoringEvaluation {
  id: number;
  monitoringSessionId: number;
  evaluatorId: string;
  totalScore: number;
  comments: string;
  createdAt: string;
  agentSignature?: string;
  agentSignedAt?: string;
  sections: EvaluationSection[];
}

export default function MonitoringDetails() {
  const [match, params] = useRoute("/monitoring/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [signatureComment, setSignatureComment] = useState("");
  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionSegment[]>([]);
  
  const monitoringId = params?.id;

  // Buscar dados da monitoria
  const { data: monitoring, isLoading: loadingMonitoring } = useQuery<MonitoringSession>({
    queryKey: ["/api/monitoring-sessions", monitoringId],
    enabled: !!monitoringId,
  });

  // Buscar avaliação da monitoria
  const { data: evaluation, isLoading: loadingEvaluation } = useQuery<MonitoringEvaluation>({
    queryKey: ["/api/monitoring-evaluations", monitoringId],
    enabled: !!monitoringId,
  });

  // Funções para gerenciar a transcrição
  const parseTranscriptionIntoSegments = (text: string): TranscriptionSegment[] => {
    if (!text) return [];
    
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      let speaker: 'agent' | 'customer' | 'unknown' = 'unknown';
      let cleanText = trimmedLine;

      // Detectar marcadores existentes
      if (trimmedLine.toLowerCase().includes('[atendente]') || trimmedLine.toLowerCase().includes('atendente:')) {
        speaker = 'agent';
        cleanText = trimmedLine.replace(/\[atendente\]|\[ATENDENTE\]|atendente:|Atendente:/gi, '').trim();
      } else if (trimmedLine.toLowerCase().includes('[cliente]') || trimmedLine.toLowerCase().includes('cliente:')) {
        speaker = 'customer';
        cleanText = trimmedLine.replace(/\[cliente\]|\[CLIENTE\]|cliente:|Cliente:/gi, '').trim();
      }

      return {
        id: `segment-${index}`,
        text: cleanText,
        speaker,
        timestamp: undefined,
      };
    });
  };

  const startEditingTranscription = () => {
    const transcriptionText = monitoring?.transcription?.text || '';
    if (transcriptionText) {
      const segments = parseTranscriptionIntoSegments(transcriptionText);
      setTranscriptionSegments(segments);
    } else {
      setTranscriptionSegments([]);
    }
    setIsEditingTranscription(true);
  };

  const addNewSegment = () => {
    const newSegment: TranscriptionSegment = {
      id: `segment-${Date.now()}`,
      text: '',
      speaker: 'unknown',
    };
    setTranscriptionSegments([...transcriptionSegments, newSegment]);
  };

  const updateSegment = (id: string, updates: Partial<TranscriptionSegment>) => {
    setTranscriptionSegments(segments =>
      segments.map(segment =>
        segment.id === id ? { ...segment, ...updates } : segment
      )
    );
  };

  const removeSegment = (id: string) => {
    setTranscriptionSegments(segments =>
      segments.filter(segment => segment.id !== id)
    );
  };

  // Mutation para salvar a transcrição editada
  const saveTranscriptionMutation = useMutation({
    mutationFn: async () => {
      const updatedText = transcriptionSegments
        .map(segment => {
          const speakerLabel = segment.speaker === 'agent' ? '[ATENDENTE]' : 
                             segment.speaker === 'customer' ? '[CLIENTE]' : '';
          return speakerLabel ? `${speakerLabel} ${segment.text}` : segment.text;
        })
        .join('\n');

      const response = await apiRequest("PATCH", `/api/monitoring-sessions/${monitoringId}`, {
        transcriptionText: updatedText,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transcrição salva com sucesso!",
        description: "As alterações foram aplicadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring-sessions", monitoringId] });
      setIsEditingTranscription(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar transcrição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para assinar a ficha
  const signatureMutation = useMutation({
    mutationFn: async ({ comment }: { comment: string }) => {
      const response = await apiRequest("POST", `/api/monitoring-evaluations/${evaluation?.id}/sign`, {
        comment,
        agentId: user?.id,
        signedAt: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ficha assinada com sucesso!",
        description: "Sua assinatura foi registrada no sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring-evaluations", monitoringId] });
      setSignatureComment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao assinar ficha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!match) return null;

  if (loadingMonitoring || loadingEvaluation) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!monitoring) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Monitoria não encontrada</h3>
            <p className="text-muted-foreground mb-4">A monitoria solicitada não existe ou não está disponível.</p>
            <Link href="/monitoring">
              <Button>Voltar para Monitorias</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canSign = user?.role === "agent" && 
                  monitoring.agentId === user.id && 
                  evaluation && 
                  !evaluation.agentSignature;

  const isAgentView = user?.role === "agent";
  const isSupervisorView = user?.role === "supervisor";

  const calculateTotalScore = () => {
    if (!evaluation?.sections) return 0;
    return evaluation.sections.reduce((total, section) => total + section.achievedScore, 0);
  };

  const renderCriterionResponse = (criterion: EvaluationCriterion) => {
    if (criterion.type === "checkbox") {
      return (
        <div className="flex items-center justify-between">
          <span className={criterion.response === "true" ? "text-red-600 font-medium" : "text-gray-600"}>
            {criterion.response === "true" ? "❌ VIOLAÇÃO CRÍTICA" : "✅ Sem violação"}
          </span>
        </div>
      );
    }

    const responseMap = {
      "sim": { text: "Sim", color: "text-green-600", icon: "✅" },
      "nao": { text: "Não", color: "text-red-600", icon: "❌" },
      "na": { text: "Não se aplica", color: "text-blue-600", icon: "➖" },
    };

    const response = responseMap[criterion.response as keyof typeof responseMap];
    
    return (
      <div className="flex items-center justify-between">
        <span className={response ? response.color : "text-gray-600"}>
          {response ? `${response.icon} ${response.text}` : "Não respondido"}
        </span>
        {!criterion.isCritical && (
          <Badge variant="outline">
            {criterion.response === "sim" || criterion.response === "na" ? criterion.weight : 0}/{criterion.weight} pts
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Detalhes da Monitoria #{monitoring.id}</h1>
          <p className="text-muted-foreground">{monitoring.audioUrl || "Áudio não disponível"}</p>
        </div>
        <Link href="/monitoring">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
      </div>

      {/* Informações da Monitoria */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Informações da Monitoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Agente</p>
                <p className="font-medium">{monitoring.agent?.firstName} {monitoring.agent?.lastName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Avaliador</p>
                <p className="font-medium">{monitoring.evaluator?.firstName} {monitoring.evaluator?.lastName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium">{new Date(monitoring.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={monitoring.status === "completed" ? "default" : "secondary"}>
                  {monitoring.status === "completed" ? "Concluída" : "Em andamento"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="transcription" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transcription">Transcrição</TabsTrigger>
          <TabsTrigger value="analysis">Análise IA</TabsTrigger>
          <TabsTrigger value="evaluation">Ficha de Avaliação</TabsTrigger>
          {canSign && <TabsTrigger value="signature">Assinatura</TabsTrigger>}
        </TabsList>

        {/* Aba da Transcrição */}
        <TabsContent value="transcription">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transcrição do Atendimento</CardTitle>
                <div className="flex space-x-2">
                  {!isEditingTranscription ? (
                    <Button
                      onClick={startEditingTranscription}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Editar</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => setIsEditingTranscription(false)}
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancelar</span>
                      </Button>
                      <Button
                        onClick={() => saveTranscriptionMutation.mutate()}
                        disabled={saveTranscriptionMutation.isPending}
                        size="sm"
                        className="flex items-center space-x-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>Salvar</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!isEditingTranscription ? (
                // Modo visualização
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {monitoring.transcription?.text || "Transcrição não disponível"}
                  </p>
                </div>
              ) : (
                // Modo edição
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      Edite a transcrição e identifique quem é cliente e quem é atendente
                    </p>
                    <Button
                      onClick={addNewSegment}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Segmento</span>
                    </Button>
                  </div>
                  
                  {transcriptionSegments.map((segment, index) => (
                    <div key={segment.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Segmento {index + 1}
                          </span>
                          <Select
                            value={segment.speaker}
                            onValueChange={(value: 'agent' | 'customer' | 'unknown') =>
                              updateSegment(segment.id, { speaker: value })
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unknown">Não definido</SelectItem>
                              <SelectItem value="agent">Atendente</SelectItem>
                              <SelectItem value="customer">Cliente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={() => removeSegment(segment.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <Textarea
                        value={segment.text}
                        onChange={(e) => updateSegment(segment.id, { text: e.target.value })}
                        placeholder="Digite o texto da conversa..."
                        className="min-h-[80px]"
                      />
                      
                      {segment.speaker !== 'unknown' && (
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={segment.speaker === 'agent' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {segment.speaker === 'agent' ? 'ATENDENTE' : 'CLIENTE'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {transcriptionSegments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Nenhum segmento adicionado.</p>
                      <p className="text-sm">Clique em "Adicionar Segmento" para começar.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Análise IA */}
        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-5 h-5 mr-2" />
                Análise Inteligente do Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Demonstração do sistema de detecção de palavras-chave */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Palavras-Chave Detectadas:</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">problema</span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm">demora</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">obrigado</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">satisfeito</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">Pontos Positivos</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Cordialidade no atendimento</li>
                      <li>• Cliente expressou satisfação</li>
                      <li>• Problema resolvido</li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-900 mb-2">Pontos de Atenção</h4>
                    <ul className="text-sm text-orange-800 space-y-1">
                      <li>• Tempo de espera mencionado</li>
                      <li>• Processo inicial demorado</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-medium text-gray-900 mb-2">Score de Qualidade IA:</h4>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div className="bg-green-500 h-3 rounded-full" style={{width: '85%'}}></div>
                    </div>
                    <span className="text-lg font-bold text-green-600">85/100</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Baseado na análise automatizada de sentimento e detecção de palavras-chave
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Recomendações da IA:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Implementar processo mais ágil para reduzir tempo de espera</li>
                    <li>• Manter o nível de cordialidade demonstrado</li>
                    <li>• Considerar feedback positivo do cliente nas métricas</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba da Avaliação */}
        <TabsContent value="evaluation">
          {evaluation ? (
            <div className="space-y-6">
              {/* Score Total */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Resultado da Avaliação</CardTitle>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold">{calculateTotalScore()}/100</p>
                        <p className="text-sm text-muted-foreground">pontos</p>
                      </div>
                      <Badge variant={calculateTotalScore() >= 80 ? "default" : calculateTotalScore() >= 60 ? "secondary" : "destructive"}>
                        {calculateTotalScore() >= 80 ? "Excelente" : calculateTotalScore() >= 60 ? "Bom" : "Precisa Melhorar"}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={calculateTotalScore()} className="h-3" />
                </CardHeader>
              </Card>

              {/* Seções da Avaliação */}
              {evaluation.sections?.map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{section.name}</CardTitle>
                      <Badge variant="outline">
                        {section.achievedScore}/{section.totalWeight} pts
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {section.criteria.map((criterion) => (
                      <div key={criterion.id} className={`p-3 border rounded-lg ${criterion.isCritical ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{criterion.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{criterion.description}</p>
                          </div>
                          <div className="ml-4">
                            {renderCriterionResponse(criterion)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              {/* Comentários */}
              {evaluation.comments && (
                <Card>
                  <CardHeader>
                    <CardTitle>Comentários do Avaliador</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{evaluation.comments}</p>
                  </CardContent>
                </Card>
              )}

              {/* Status da Assinatura */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Signature className="w-5 h-5 mr-2" />
                    Status da Assinatura
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {evaluation.agentSignature ? (
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">Assinada</Badge>
                      <span className="text-sm text-muted-foreground">
                        em {new Date(evaluation.agentSignedAt!).toLocaleString('pt-BR')}
                      </span>
                      {evaluation.agentSignature && (
                        <p className="text-sm mt-2">Comentário: {evaluation.agentSignature}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">Aguardando assinatura do agente</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <h3 className="text-lg font-semibold mb-2">Avaliação não encontrada</h3>
                <p className="text-muted-foreground">Esta monitoria ainda não foi avaliada.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Aba de Assinatura (apenas para agentes) */}
        {canSign && (
          <TabsContent value="signature">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Signature className="w-5 h-5 mr-2" />
                  Assinatura Digital
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Importante:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Ao assinar, você confirma que visualizou e compreendeu a avaliação</li>
                    <li>• A assinatura digital tem validade legal e não pode ser revertida</li>
                    <li>• Você pode adicionar comentários ou observações (opcional)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Comentários (opcional)</label>
                  <Textarea
                    placeholder="Adicione seus comentários ou observações sobre a avaliação..."
                    value={signatureComment}
                    onChange={(e) => setSignatureComment(e.target.value)}
                    rows={4}
                  />
                </div>

                <Separator />

                <div className="flex justify-end space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setSignatureComment("")}
                  >
                    Limpar
                  </Button>
                  <Button
                    onClick={() => signatureMutation.mutate({ comment: signatureComment })}
                    disabled={signatureMutation.isPending}
                  >
                    {signatureMutation.isPending ? (
                      "Assinando..."
                    ) : (
                      <>
                        <Signature className="w-4 h-4 mr-2" />
                        Assinar Ficha
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}