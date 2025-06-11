import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Contest {
  id: number;
  evaluationId: number;
  agentId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  response?: string;
  createdAt: string;
  updatedAt: string;
  evaluation: {
    id: number;
    finalScore: number;
    monitoringSessionId: number;
    observations?: string;
  };
}

export default function AgentContestPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: contests = [], isLoading } = useQuery<Contest[]>({
    queryKey: ['/api/evaluation-contests'],
    enabled: user?.role === 'agent',
  });

  const { data: evaluations = [] } = useQuery<any[]>({
    queryKey: ['/api/my-evaluations'],
    enabled: user?.role === 'agent',
  });

  const contestMutation = useMutation({
    mutationFn: async ({ evaluationId, reason }: { evaluationId: number; reason: string }) => {
      const response = await apiRequest("POST", "/api/evaluation-contests", {
        evaluationId,
        reason
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contestação enviada",
        description: "Sua contestação foi enviada para análise.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evaluation-contests'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar contestação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Aprovada</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejeitada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const recentContests = contests.slice(0, 3);
  const contestableEvaluations = evaluations.filter((evaluation: any) => 
    evaluation.status === 'signed' && !contests.some(contest => contest.evaluationId === evaluation.id)
  );

  if (isLoading) {
    return (
      <Card className="akig-card-shadow">
        <CardContent className="pt-6">
          <div className="loading-shimmer h-40 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="akig-card-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-orange-600" />
            Contestação de Avaliações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                  {contests.filter(c => c.status === 'pending').length}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-300">Pendentes</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <p className="text-lg font-bold text-green-800 dark:text-green-200">
                  {contests.filter(c => c.status === 'approved').length}
                </p>
                <p className="text-xs text-green-600 dark:text-green-300">Aprovadas</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <p className="text-lg font-bold text-red-800 dark:text-red-200">
                  {contests.filter(c => c.status === 'rejected').length}
                </p>
                <p className="text-xs text-red-600 dark:text-red-300">Rejeitadas</p>
              </div>
            </div>

            {/* Recent Contests */}
            {recentContests.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Contestações Recentes</h4>
                {recentContests.map((contest) => (
                  <div
                    key={contest.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => {
                      setSelectedContest(contest);
                      setIsDialogOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(contest.status)}
                      <div>
                        <p className="text-sm font-medium">
                          Avaliação #{contest.evaluationId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(contest.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(contest.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma contestação ainda</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Você pode contestar avaliações assinadas que considere inadequadas
                </p>
              </div>
            )}

            {/* Quick contest for available evaluations */}
            {contestableEvaluations.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Avaliações disponíveis para contestação: {contestableEvaluations.length}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-orange-600 hover:text-orange-800"
                  onClick={() => {
                    // Navigate to evaluations page
                    window.location.href = '/my-evaluations';
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Ver Minhas Avaliações
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contest Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Contestação #{selectedContest?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedContest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Avaliação #{selectedContest.evaluationId}</p>
                  <p className="text-sm text-muted-foreground">
                    Sessão #{selectedContest.evaluation.monitoringSessionId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {selectedContest.evaluation.finalScore.toFixed(1)} pts
                  </p>
                  {getStatusBadge(selectedContest.status)}
                </div>
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
                <Label className="text-orange-700 dark:text-orange-300 font-medium">
                  Motivo da Contestação:
                </Label>
                <p className="text-sm text-orange-600 dark:text-orange-200 mt-1">
                  {selectedContest.reason}
                </p>
              </div>

              {selectedContest.response && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Label className="text-blue-700 dark:text-blue-300 font-medium">
                    Resposta da Análise:
                  </Label>
                  <p className="text-sm text-blue-600 dark:text-blue-200 mt-1">
                    {selectedContest.response}
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                <p>Criada em: {new Date(selectedContest.createdAt).toLocaleString('pt-BR')}</p>
                <p>Atualizada em: {new Date(selectedContest.updatedAt).toLocaleString('pt-BR')}</p>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}