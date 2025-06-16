import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, AlertTriangle, FileSignature, Eye, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Evaluation } from "@/types";

export default function EvaluationsSimplified() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [selectedContest, setSelectedContest] = useState<any>(null);
  const [contestReason, setContestReason] = useState("");
  const [contestResponse, setContestResponse] = useState("");
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isContestDialogOpen, setIsContestDialogOpen] = useState(false);
  const [isContestReviewDialogOpen, setIsContestReviewDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar avaliações baseado no role do usuário
  const { data: evaluations = [], isLoading } = useQuery<Evaluation[]>({
    queryKey: user?.role === 'agent' ? ['/api/evaluations', 'agent', user.id] : ['/api/evaluations'],
  });

  // Buscar contestações para roles administrativos
  const { data: contests = [] } = useQuery<any[]>({
    queryKey: ['/api/evaluation-contests'],
    enabled: ['admin', 'evaluator', 'supervisor'].includes(user?.role || ''),
  });

  // Mutation para assinar avaliações (apenas agentes)
  const signEvaluationMutation = useMutation({
    mutationFn: async (evaluationId: number) => {
      const res = await apiRequest("PATCH", `/api/evaluations/${evaluationId}/sign`, {});
      return res.json();
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

  // Mutation para contestar avaliações
  const solicitContestMutation = useMutation({
    mutationFn: async ({ evaluationId, reason }: { evaluationId: number, reason: string }) => {
      const res = await apiRequest("POST", "/api/evaluation-contests", {
        evaluationId,
        reason
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Contestação enviada",
        description: "Sua contestação foi enviada para análise.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations'] });
      setIsContestDialogOpen(false);
      setContestReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao contestar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para revisar contestações (supervisores e avaliadores)
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

  // Filtrar avaliações com base na aba ativa
  const filteredEvaluations = evaluations.filter((evaluation) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return evaluation.status === "pending";
    return evaluation.status === activeTab;
  });

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

  const handleReviewContest = (contest: any) => {
    setSelectedContest(contest);
    setIsContestReviewDialogOpen(true);
  };

  const handleSubmitContest = () => {
    if (selectedEvaluation && contestReason.trim()) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "signed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending":
      case "unsigned":
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
      case "unsigned":
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

  // Contadores para as abas
  const allCount = evaluations.length;
  const pendingCount = evaluations.filter(e => e.status === "pending").length;
  const signedCount = evaluations.filter(e => e.status === "signed").length;
  const contestedCount = evaluations.filter(e => e.status === "contested").length;

  // Header baseado no role do usuário
  const headerTitle = user?.role === 'agent' ? 'Minhas Avaliações' : 'Avaliações';
  const headerSubtitle = user?.role === 'agent' 
    ? 'Visualize suas avaliações de atendimento'
    : 'Visualize avaliações de atendimento e gerencie contestações';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title={headerTitle} subtitle={headerSubtitle} />
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="akig-card-shadow">
                <CardContent className="pt-6">
                  <div className="loading-shimmer h-32 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title={headerTitle} subtitle={headerSubtitle} />
      
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="relative">
              Todas
              {allCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {allCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              Pendentes
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="signed">
              Assinadas
              {signedCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {signedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="contested">
              Contestadas
              {contestedCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {contestedCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {filteredEvaluations.length === 0 ? (
              <Card className="akig-card-shadow">
                <CardContent className="py-12">
                  <div className="text-center">
                    <FileSignature className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Nenhuma avaliação encontrada
                    </h3>
                    <p className="text-muted-foreground">
                      {activeTab === "pending" 
                        ? "Não há avaliações pendentes no momento."
                        : "Não há avaliações nesta categoria."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredEvaluations.map((evaluation) => (
                  <Card key={evaluation.id} className="akig-card-shadow hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                              AG
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">
                              Avaliação #{evaluation.id}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Sessão: #{evaluation.monitoringSessionId}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(evaluation.status)}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">
                            Pontuação Final
                          </Label>
                          <div className={`text-2xl font-bold ${getScoreColor(Number(evaluation.finalScore))}`}>
                            {Number(evaluation.finalScore).toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">
                            Avaliador
                          </Label>
                          <p className="text-sm font-medium">
                            {evaluation.evaluatorId}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewEvaluation(evaluation)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Visualizar
                        </Button>

                        {user?.role === 'agent' && evaluation.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleSignEvaluation(evaluation.id)}
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                            disabled={signEvaluationMutation.isPending}
                          >
                            <FileSignature className="w-4 h-4" />
                            Assinar
                          </Button>
                        )}

                        {user?.role === 'agent' && evaluation.status === 'signed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleContestEvaluation(evaluation)}
                            className="border-amber-500 text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Contestar
                          </Button>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Criada em: {new Date(evaluation.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Lista de contestações para revisão (apenas para supervisores/avaliadores) */}
        {['admin', 'supervisor', 'evaluator'].includes(user?.role || '') && contests.length > 0 && (
          <Card className="mt-8 akig-card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Contestações Pendentes de Revisão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contests.filter(contest => contest.status === 'pending').map((contest) => (
                  <div key={contest.id} className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-900/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">
                          Contestação da Avaliação #{contest.evaluationId}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Agente: {contest.agentId}
                        </p>
                        <p className="text-sm mt-2">
                          <strong>Motivo:</strong> {contest.reason}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewContest(contest)}
                      >
                        Revisar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog para visualizar detalhes da avaliação */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Avaliação #{selectedEvaluation?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Sessão de Monitoramento</Label>
                <p className="text-sm font-semibold">#{selectedEvaluation?.monitoringSessionId}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Avaliador</Label>
                <p className="text-sm font-semibold">{selectedEvaluation?.evaluatorId}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Pontuação Final</Label>
                <p className={`text-lg font-bold ${
                  selectedEvaluation && Number(selectedEvaluation.finalScore) >= 8 ? 'text-green-600' :
                  selectedEvaluation && Number(selectedEvaluation.finalScore) >= 6 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {selectedEvaluation?.finalScore ? Number(selectedEvaluation.finalScore).toFixed(1) : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <div className="mt-1">
                  {selectedEvaluation && getStatusBadge(selectedEvaluation.status)}
                </div>
              </div>
            </div>
            
            {selectedEvaluation?.supervisorComment && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Comentário do Supervisor</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                  {selectedEvaluation.supervisorComment}
                </p>
              </div>
            )}



            <div className="text-xs text-muted-foreground">
              <strong>Criada em:</strong> {selectedEvaluation && new Date(selectedEvaluation.createdAt).toLocaleString('pt-BR')}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para contestar avaliação */}
      <Dialog open={isContestDialogOpen} onOpenChange={setIsContestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contestar Avaliação #{selectedEvaluation?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo da Contestação</Label>
              <Textarea
                value={contestReason}
                onChange={(e) => setContestReason(e.target.value)}
                placeholder="Descreva detalhadamente o motivo da sua contestação..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsContestDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmitContest}
                disabled={!contestReason.trim() || solicitContestMutation.isPending}
              >
                Enviar Contestação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para revisar contestação */}
      <Dialog open={isContestReviewDialogOpen} onOpenChange={setIsContestReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar Contestação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Avaliação:</Label>
              <p>#{selectedContest?.evaluationId}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Agente:</Label>
              <p>{selectedContest?.agentId}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Motivo da Contestação:</Label>
              <p className="text-sm p-3 bg-muted rounded-md">{selectedContest?.reason}</p>
            </div>
            <div>
              <Label>Resposta da Análise</Label>
              <Textarea
                value={contestResponse}
                onChange={(e) => setContestResponse(e.target.value)}
                placeholder="Digite sua análise da contestação..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsContestReviewDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleSubmitContestReview('rejected')}
                disabled={!contestResponse.trim() || reviewContestMutation.isPending}
              >
                Rejeitar
              </Button>
              <Button 
                onClick={() => handleSubmitContestReview('approved')}
                disabled={!contestResponse.trim() || reviewContestMutation.isPending}
              >
                Aprovar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}