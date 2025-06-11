import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Archive, Trash2, RotateCcw, Calendar, User, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Header from "@/components/layout/Header";

interface MonitoringSession {
  id: number;
  agentId: string;
  campaignId: number;
  status: string;
  duration: number;
  audioUrl: string;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ArchivedSessionsPage() {
  const [selectedSession, setSelectedSession] = useState<MonitoringSession | null>(null);
  const [restoreReason, setRestoreReason] = useState("");
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch archived sessions
  const { data: archivedSessions, isLoading: loadingArchived } = useQuery<MonitoringSession[]>({
    queryKey: ['/api/monitoring-sessions/archived'],
  });

  // Fetch deleted sessions
  const { data: deletedSessions, isLoading: loadingDeleted } = useQuery<MonitoringSession[]>({
    queryKey: ['/api/monitoring-sessions/deleted'],
  });

  // Restore session mutation
  const restoreSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest("PATCH", `/api/monitoring-sessions/${sessionId}/restore`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sessão restaurada",
        description: "A monitoria foi restaurada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring-sessions/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring-sessions/deleted'] });
      setIsRestoreDialogOpen(false);
      setSelectedSession(null);
      setRestoreReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao restaurar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRestore = (session: MonitoringSession) => {
    setSelectedSession(session);
    setIsRestoreDialogOpen(true);
  };

  const confirmRestore = () => {
    if (selectedSession) {
      restoreSessionMutation.mutate(selectedSession.id);
    }
  };

  const getStatusBadge = (session: MonitoringSession) => {
    if (session.archivedAt) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Arquivada</Badge>;
    }
    if (session.deletedAt) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800">Excluída</Badge>;
    }
    return <Badge variant="outline">Ativa</Badge>;
  };

  const SessionCard = ({ session }: { session: MonitoringSession }) => (
    <Card className="akig-card-shadow hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg flex items-center gap-2">
            {session.archivedAt ? <Archive className="w-5 h-5 text-yellow-600" /> : <Trash2 className="w-5 h-5 text-red-600" />}
            Monitoria #{session.id}
          </CardTitle>
          {getStatusBadge(session)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span>Agente: {session.agentId}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>Duração: {Math.floor(session.duration / 60)}min</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span>Criada: {format(new Date(session.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
        </div>

        {session.archivedAt && (
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 mb-1">
              <Archive className="w-4 h-4" />
              Arquivada em {format(new Date(session.archivedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
            {session.archiveReason && (
              <p className="text-sm text-yellow-700">Motivo: {session.archiveReason}</p>
            )}
          </div>
        )}

        {session.deletedAt && (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 text-sm font-medium text-red-800 mb-1">
              <Trash2 className="w-4 h-4" />
              Excluída em {format(new Date(session.deletedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
            {session.deleteReason && (
              <p className="text-sm text-red-700">Motivo: {session.deleteReason}</p>
            )}
          </div>
        )}

        <div className="pt-3 border-t">
          <Button
            onClick={() => handleRestore(session)}
            disabled={restoreSessionMutation.isPending}
            className="w-full akig-bg-primary hover:opacity-90"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar Monitoria
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold akig-text-gradient mb-2">
            📁 Monitorias Arquivadas
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie monitorias arquivadas e excluídas com possibilidade de restauração
          </p>
        </div>

        <Tabs defaultValue="archived" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="archived" className="flex items-center gap-2">
              <Archive className="w-4 h-4" />
              Arquivadas ({archivedSessions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Excluídas ({deletedSessions?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="archived" className="space-y-6">
            {loadingArchived ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="akig-card-shadow">
                    <CardContent className="pt-6">
                      <div className="loading-shimmer h-32 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : archivedSessions?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archivedSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <Card className="akig-card-shadow">
                <CardContent className="pt-6 text-center">
                  <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Nenhuma monitoria arquivada
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    As monitorias arquivadas aparecerão aqui para restauração quando necessário.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="deleted" className="space-y-6">
            {loadingDeleted ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="akig-card-shadow">
                    <CardContent className="pt-6">
                      <div className="loading-shimmer h-32 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : deletedSessions?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deletedSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <Card className="akig-card-shadow">
                <CardContent className="pt-6 text-center">
                  <Trash2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Nenhuma monitoria excluída
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    As monitorias excluídas aparecerão aqui para restauração quando necessário.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Restore Dialog */}
        <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Restaurar Monitoria
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Confirmar Restauração
                </div>
                <p className="text-blue-700 text-sm">
                  A monitoria #{selectedSession?.id} será restaurada e voltará a aparecer na lista principal.
                  Esta ação pode ser revertida arquivando novamente.
                </p>
              </div>

              <div>
                <Label htmlFor="restoreReason">Motivo da Restauração (opcional)</Label>
                <Textarea
                  id="restoreReason"
                  placeholder="Descreva o motivo para restaurar esta monitoria..."
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsRestoreDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmRestore}
                  disabled={restoreSessionMutation.isPending}
                  className="akig-bg-primary hover:opacity-90"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}