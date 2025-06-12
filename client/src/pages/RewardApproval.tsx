import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, User, Gift, Calendar } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface RewardRequest {
  id: number;
  userId: string;
  rewardId: number;
  cost: number;
  status: string;
  requestedAt: string;
  userName: string;
  userEmail: string;
  rewardName: string;
  rewardDescription: string;
}

export default function RewardApproval() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<RewardRequest | null>(null);
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: pendingRequests = [], isLoading } = useQuery<RewardRequest[]>({
    queryKey: ["/api/reward-requests/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const response = await fetch(`/api/reward-requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error("Falha ao aprovar solicitação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reward-requests/pending"] });
      toast({
        title: "Solicitação aprovada",
        description: "A solicitação de resgate foi aprovada com sucesso.",
      });
      setSelectedRequest(null);
      setNotes("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao aprovar a solicitação.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, rejectionReason }: { id: number; rejectionReason: string }) => {
      const response = await fetch(`/api/reward-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason }),
      });
      if (!response.ok) throw new Error("Falha ao rejeitar solicitação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reward-requests/pending"] });
      toast({
        title: "Solicitação rejeitada",
        description: "A solicitação foi rejeitada e as moedas foram devolvidas ao usuário.",
      });
      setSelectedRequest(null);
      setRejectionReason("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao rejeitar a solicitação.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (request: RewardRequest) => {
    setSelectedRequest(request);
  };

  const handleReject = (request: RewardRequest) => {
    setSelectedRequest(request);
  };

  const confirmApproval = () => {
    if (selectedRequest) {
      approveMutation.mutate({ id: selectedRequest.id, notes });
    }
  };

  const confirmRejection = () => {
    if (selectedRequest && rejectionReason.trim()) {
      rejectMutation.mutate({ id: selectedRequest.id, rejectionReason });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Gift className="h-8 w-8 text-orange-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Aprovação de Resgates
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie solicitações de resgate de recompensas
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhuma solicitação pendente
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Todas as solicitações de resgate foram processadas.
              </p>
            </CardContent>
          </Card>
        ) : (
          pendingRequests.map((request) => (
            <Card key={request.id} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {request.userName}
                  </CardTitle>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Usuário</Label>
                    <p className="text-sm">{request.userEmail}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Solicitado em</Label>
                    <p className="text-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(request.requestedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{request.rewardName}</h4>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {request.cost} moedas
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {request.rewardDescription}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => handleApprove(request)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Aprovar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Aprovar Solicitação de Resgate</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Usuário</Label>
                          <p className="text-sm text-gray-600">{selectedRequest?.userName}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Recompensa</Label>
                          <p className="text-sm text-gray-600">{selectedRequest?.rewardName}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Custo</Label>
                          <p className="text-sm text-gray-600">{selectedRequest?.cost} moedas virtuais</p>
                        </div>
                        <div>
                          <Label htmlFor="notes">Notas (opcional)</Label>
                          <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Adicione observações sobre a aprovação..."
                            className="mt-1"
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={confirmApproval}
                            disabled={approveMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {approveMutation.isPending ? "Aprovando..." : "Confirmar Aprovação"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => handleReject(request)}
                        variant="destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Rejeitar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rejeitar Solicitação de Resgate</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Usuário</Label>
                          <p className="text-sm text-gray-600">{selectedRequest?.userName}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Recompensa</Label>
                          <p className="text-sm text-gray-600">{selectedRequest?.rewardName}</p>
                        </div>
                        <div>
                          <Label htmlFor="rejectionReason">Motivo da rejeição *</Label>
                          <Textarea
                            id="rejectionReason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Explique o motivo da rejeição..."
                            className="mt-1"
                            required
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={confirmRejection}
                            disabled={rejectMutation.isPending || !rejectionReason.trim()}
                            variant="destructive"
                          >
                            {rejectMutation.isPending ? "Rejeitando..." : "Confirmar Rejeição"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}