import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, AlertTriangle, FileSignature, Eye, Edit, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Evaluation } from "@/types";

export default function Evaluations() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [selectedContest, setSelectedContest] = useState<any>(null);
  const [contestReason, setContestReason] = useState("");
  const [contestResponse, setContestResponse] = useState("");
  const [editComment, setEditComment] = useState("");
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isContestDialogOpen, setIsContestDialogOpen] = useState(false);
  const [isContestReviewDialogOpen, setIsContestReviewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // For agents, only fetch their own evaluations
  const { data: evaluations, isLoading } = useQuery<Evaluation[]>({
    queryKey: user?.role === 'agent' ? ['/api/evaluations', 'agent', user.id] : ['/api/evaluations'],
  });

  // Fetch evaluation contests for admin and evaluator roles
  const { data: contests } = useQuery({
    queryKey: ['/api/evaluation-contests'],
    enabled: ['admin', 'evaluator'].includes(user?.role || ''),
  });

  // Mutation for signing evaluations
  const signEvaluationMutation = useMutation({
    mutationFn: async (evaluationId: number) => {
      const response = await apiRequest("PATCH", `/api/evaluations/${evaluationId}`, {
        status: "signed"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Avaliação assinada",
        description: "A avaliação foi assinada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao assinar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for soliciting contestations (agent/supervisor)
  const solicitContestMutation = useMutation({
    mutationFn: async ({ evaluationId, reason }: { evaluationId: number, reason: string }) => {
      const response = await apiRequest("POST", "/api/evaluation-contests", {
        evaluationId,
        reason
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contestação solicitada",
        description: "Sua solicitação de contestação foi enviada para análise.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations'] });
      setIsContestDialogOpen(false);
      setContestReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao solicitar contestação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for reviewing contestations (admin/evaluator)
  const reviewContestMutation = useMutation({
    mutationFn: async ({ contestId, status, response }: { contestId: number, status: string, response: string }) => {
      const res = await apiRequest("PATCH", `/api/evaluation-contests/${contestId}`, {
        status,
        response
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Contestação analisada",
        description: "A análise da contestação foi registrada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evaluation-contests'] });
      setIsContestReviewDialogOpen(false);
      setContestResponse("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao analisar contestação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for editing evaluation comments
  const editEvaluationMutation = useMutation({
    mutationFn: async ({ evaluationId, comment }: { evaluationId: number; comment: string }) => {
      const response = await apiRequest("PATCH", `/api/evaluations/${evaluationId}`, {
        supervisorComment: comment
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Comentário salvo",
        description: "O comentário do supervisor foi salvo com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations'] });
      setIsEditDialogOpen(false);
      setEditComment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar comentário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler functions
  const handleViewEvaluation = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setIsViewDialogOpen(true);
  };

  const handleSignEvaluation = (evaluationId: number) => {
    signEvaluationMutation.mutate(evaluationId);
  };

  const handleContestEvaluation = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setIsContestDialogOpen(true);
  };

  const handleEditEvaluation = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setEditComment(evaluation.supervisorComment || "");
    setIsEditDialogOpen(true);
  };

  const handleReviewContest = (contest: any) => {
    setSelectedContest(contest);
    setIsContestReviewDialogOpen(true);
  };

  const handleSubmitContest = () => {
    if (selectedEvaluation && contestReason.trim()) {
      // Agent/Supervisor solicita contestação
      solicitContestMutation.mutate({
        evaluationId: selectedEvaluation.id,
        reason: contestReason.trim()
      });
    }
  };

  const handleSubmitContestReview = (status: 'approved' | 'rejected') => {
    if (selectedContest && contestResponse.trim()) {
      reviewContestMutation.mutate({
        contestId: selectedContest.id,
        status,
        response: contestResponse.trim()
      });
    }
  };

  const handleSubmitEdit = () => {
    if (selectedEvaluation && editComment.trim()) {
      editEvaluationMutation.mutate({
        evaluationId: selectedEvaluation.id,
        comment: editComment.trim()
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "signed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "contested":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <FileSignature className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "signed":
        return <Badge className="bg-green-100 text-green-800">Assinada</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case "contested":
        return <Badge className="bg-red-100 text-red-800">Contestada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const filteredEvaluations = evaluations?.filter(evaluation => {
    if (activeTab === "all") return true;
    return evaluation.status === activeTab;
  });

  const headerTitle = user?.role === 'agent' ? 'Minhas Avaliações' : 'Avaliações';
  const headerSubtitle = user?.role === 'agent' ? 'Visualize suas avaliações de atendimento' : 'Gerenciamento de avaliações de monitoria';

  if (isLoading) {
    return (
      <div className="p-6">
        <Header 
          title={headerTitle}
          subtitle={headerSubtitle}
        />
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="akig-card-shadow">
              <CardContent className="pt-6">
                <div className="loading-shimmer h-40 rounded"></div>
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
        title={headerTitle}
        subtitle={headerSubtitle}
      />

      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${['admin', 'evaluator'].includes(user?.role || '') ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="signed">Assinadas</TabsTrigger>
            {['admin', 'evaluator'].includes(user?.role || '') && (
              <TabsTrigger value="contests">Contestações Recebidas</TabsTrigger>
            )}
            {['agent', 'supervisor'].includes(user?.role || '') && (
              <TabsTrigger value="contested">Contestadas</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredEvaluations?.map((evaluation) => (
                <Card key={evaluation.id} className="akig-card-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center">
                        {getStatusIcon(evaluation.status)}
                        <span className="ml-2">Avaliação #{evaluation.id}</span>
                      </CardTitle>
                      {getStatusBadge(evaluation.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Criada em: {new Date(evaluation.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Nota Final:</span>
                        <span className={`text-xl font-bold ${getScoreColor(Number(evaluation.finalScore))}`}>
                          {Number(evaluation.finalScore).toFixed(1)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                            AG
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Agente #123</p>
                          <p className="text-xs text-muted-foreground">
                            Avaliador: {evaluation.evaluatorId}
                          </p>
                        </div>
                      </div>

                      {evaluation.observations && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground font-medium mb-1">Observações:</p>
                          <p className="text-sm">{evaluation.observations}</p>
                        </div>
                      )}

                      {evaluation.status === "contested" && evaluation.contestReason && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-sm text-red-700 font-medium mb-1">Motivo da Contestação:</p>
                          <p className="text-sm text-red-600">{evaluation.contestReason}</p>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 pt-2">
                        {/* Visualizar button - available for all roles */}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewEvaluation(evaluation)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>

                        {/* Botões sempre visíveis para teste - remover verificação de role temporariamente */}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            console.log('Clicou em Editar para avaliação:', evaluation.id);
                            handleEditEvaluation(evaluation);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-amber-600 hover:text-amber-800"
                          onClick={() => {
                            console.log('Clicou em Contestação para avaliação:', evaluation.id);
                            handleContestEvaluation(evaluation);
                          }}
                        >
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Contestação
                        </Button>



                        {/* Agent-specific buttons */}
                        {user?.role === 'agent' && evaluation.status === "pending" && (
                          <Button 
                            size="sm" 
                            className="akig-bg-primary hover:opacity-90"
                            onClick={() => handleSignEvaluation(evaluation.id)}
                            disabled={signEvaluationMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Assinar
                          </Button>
                        )}

                        {user?.role === 'agent' && evaluation.status === "signed" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-amber-600 hover:text-amber-800"
                            onClick={() => handleContestEvaluation(evaluation)}
                          >
                            <AlertCircle className="w-4 h-4 mr-1" />
                            Contestar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {(!filteredEvaluations || filteredEvaluations.length === 0) && (
              <Card className="akig-card-shadow">
                <CardContent className="pt-6 text-center">
                  <div className="py-12">
                    <FileSignature className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Nenhuma avaliação encontrada
                    </h3>
                    <p className="text-muted-foreground">
                      {activeTab === "all" 
                        ? "Nenhuma avaliação foi criada ainda" 
                        : `Nenhuma avaliação ${activeTab === "pending" ? "pendente" : activeTab === "signed" ? "assinada" : "contestada"} encontrada`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* View Evaluation Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Avaliação #{selectedEvaluation?.id}</DialogTitle>
          </DialogHeader>
          {selectedEvaluation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedEvaluation.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Nota Final</Label>
                  <div className={`text-2xl font-bold mt-1 ${getScoreColor(Number(selectedEvaluation.finalScore))}`}>
                    {Number(selectedEvaluation.finalScore).toFixed(1)}
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Avaliador</Label>
                <p className="mt-1 text-sm">{selectedEvaluation.evaluatorId}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Data de Criação</Label>
                <p className="mt-1 text-sm">{new Date(selectedEvaluation.createdAt).toLocaleString('pt-BR')}</p>
              </div>

              {selectedEvaluation.observations && (
                <div>
                  <Label className="text-sm font-medium">Observações</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedEvaluation.observations}</p>
                  </div>
                </div>
              )}

              {selectedEvaluation.contestReason && (
                <div>
                  <Label className="text-sm font-medium">Motivo da Contestação</Label>
                  <div className="mt-1 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-600">{selectedEvaluation.contestReason}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contest Evaluation Dialog */}
      <Dialog open={isContestDialogOpen} onOpenChange={setIsContestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contestar Avaliação #{selectedEvaluation?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contestReason">Motivo da Contestação *</Label>
              <Textarea
                id="contestReason"
                placeholder="Descreva o motivo da contestação desta avaliação..."
                value={contestReason}
                onChange={(e) => setContestReason(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsContestDialogOpen(false);
                  setContestReason("");
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmitContest}
                disabled={!contestReason.trim() || contestEvaluationMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {contestEvaluationMutation.isPending ? "Enviando..." : "Enviar Contestação"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Evaluation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Avaliação #{selectedEvaluation?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editComment">Comentário do Supervisor</Label>
              <Textarea
                id="editComment"
                placeholder="Adicione observações ou comentários sobre esta avaliação..."
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditComment("");
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmitEdit}
                disabled={editEvaluationMutation.isPending}
                className="akig-bg-primary hover:opacity-90"
              >
                {editEvaluationMutation.isPending ? "Salvando..." : "Salvar Comentário"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
