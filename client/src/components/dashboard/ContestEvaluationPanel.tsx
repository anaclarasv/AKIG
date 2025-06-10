import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContestEvaluationPanelProps {
  agentId: string;
}

interface Contest {
  id: number;
  evaluationId: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  response?: string;
  createdAt: string;
  evaluationScore: number;
  evaluatorName: string;
}

export default function ContestEvaluationPanel({ agentId }: ContestEvaluationPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [contestReason, setContestReason] = useState("");
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<number | null>(null);

  // Fetch agent's evaluations
  const { data: evaluations = [] } = useQuery({
    queryKey: ["/api/evaluations", agentId],
    queryFn: async () => {
      const response = await fetch(`/api/evaluations?agentId=${agentId}`);
      if (!response.ok) throw new Error("Failed to fetch evaluations");
      return response.json();
    }
  });

  // Fetch contest requests
  const { data: contests = [] } = useQuery({
    queryKey: ["/api/evaluation-contests", agentId],
    queryFn: async () => {
      const response = await fetch(`/api/evaluation-contests?agentId=${agentId}`);
      if (!response.ok) throw new Error("Failed to fetch contests");
      return response.json();
    }
  });

  // Submit contest mutation
  const contestMutation = useMutation({
    mutationFn: async (data: { evaluationId: number; reason: string }) => {
      const response = await fetch("/api/evaluation-contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to submit contest");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contestação enviada",
        description: "Sua solicitação de contestação foi enviada para análise."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-contests"] });
      setIsDialogOpen(false);
      setContestReason("");
      setSelectedEvaluationId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleContestSubmit = () => {
    if (!selectedEvaluationId || !contestReason.trim()) return;
    
    contestMutation.mutate({
      evaluationId: selectedEvaluationId,
      reason: contestReason.trim()
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'approved':
        return 'Aprovada';
      case 'rejected':
        return 'Rejeitada';
      default:
        return 'Desconhecido';
    }
  };

  const evaluationsToContest = evaluations.filter((evaluationItem: any) => 
    !contests.some((contest: Contest) => contest.evaluationId === evaluationItem.id)
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg">Contestação de Avaliações</CardTitle>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={evaluationsToContest.length === 0}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Nova Contestação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Solicitar Contestação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Selecionar Avaliação
                </label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedEvaluationId || ""}
                  onChange={(e) => setSelectedEvaluationId(Number(e.target.value))}
                >
                  <option value="">Escolha uma avaliação</option>
                  {evaluationsToContest.map((evaluation: any) => (
                    <option key={evaluation.id} value={evaluation.id}>
                      Avaliação #{evaluation.id} - Nota: {evaluation.score}/10
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Motivo da Contestação
                </label>
                <Textarea
                  placeholder="Descreva o motivo da sua contestação..."
                  value={contestReason}
                  onChange={(e) => setContestReason(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleContestSubmit}
                  disabled={!selectedEvaluationId || !contestReason.trim() || contestMutation.isPending}
                >
                  {contestMutation.isPending ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {contests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">Nenhuma contestação</p>
            <p className="text-sm">Você ainda não solicitou nenhuma contestação</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contests.map((contest: Contest) => (
              <div
                key={contest.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(contest.status)}
                    <span className="font-medium">
                      Avaliação #{contest.evaluationId}
                    </span>
                    <Badge variant={
                      contest.status === 'approved' ? 'default' :
                      contest.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {getStatusText(contest.status)}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(contest.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Motivo:
                  </p>
                  <p className="text-sm">{contest.reason}</p>
                </div>

                {contest.response && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Resposta do Avaliador:
                    </p>
                    <p className="text-sm bg-muted p-2 rounded">
                      {contest.response}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}