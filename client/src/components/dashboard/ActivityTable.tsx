import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Filter, Download, Eye, Edit, TriangleAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Mock data - in real app this would come from API
const mockActivities = [
  {
    id: 1,
    agentName: "Maria Silva",
    agentId: "MS",
    campaignName: "Vendas Digitais",
    evaluatorName: "João Avaliador",
    score: 8.5,
    status: "signed" as const,
    createdAt: "2024-01-15 14:30"
  },
  {
    id: 2,
    agentName: "Carlos Santos",
    agentId: "CS",
    campaignName: "Suporte Técnico",
    evaluatorName: "Ana Avaliadora",
    score: 6.2,
    status: "pending" as const,
    createdAt: "2024-01-15 13:15"
  },
  {
    id: 3,
    agentName: "Julia Oliveira",
    agentId: "JO",
    campaignName: "Retenção",
    evaluatorName: "Pedro Avaliador",
    score: 9.1,
    status: "contested" as const,
    createdAt: "2024-01-15 11:20"
  },
  {
    id: 4,
    agentName: "Roberto Lima",
    agentId: "RL",
    campaignName: "Vendas Digitais",
    evaluatorName: "João Avaliador",
    score: 7.8,
    status: "signed" as const,
    createdAt: "2024-01-15 10:45"
  }
];

export default function ActivityTable() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [contestModalOpen, setContestModalOpen] = useState(false);
  const [contestReason, setContestReason] = useState("");
  const totalPages = 25; // Mock total pages
  
  // Define permissions based on user role
  const canEdit = user?.role === 'supervisor' || user?.role === 'evaluator';
  const canContest = user?.role === 'agent' || user?.role === 'supervisor';

  const getStatusBadge = (status: string, score: number) => {
    switch (status) {
      case "signed":
        return (
          <Badge className="bg-green-100 text-green-800">
            Assinado
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            Pendente
          </Badge>
        );
      case "contested":
        return (
          <Badge className="bg-red-100 text-red-800">
            Contestado
          </Badge>
        );
      default:
        return null;
    }
  };

  const getScoreBadge = (score: number) => {
    const colorClass = score >= 8 ? "bg-green-100 text-green-800" :
                      score >= 6 ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800";
    
    return (
      <Badge className={colorClass}>
        {score.toFixed(1)}
      </Badge>
    );
  };

  return (
    <Card className="mt-8 akig-card-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Atividades Recentes</CardTitle>
            <p className="text-muted-foreground text-sm">Últimas monitorias e avaliações</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Atendente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Campanha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Avaliador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Nota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {mockActivities.map((activity) => (
                <tr key={activity.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar className="w-8 h-8 mr-3">
                        <AvatarFallback className="text-sm bg-blue-100 text-blue-600">
                          {activity.agentId}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{activity.agentName}</p>
                        <p className="text-sm text-muted-foreground">ID: {activity.id.toString().padStart(4, '0')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {activity.campaignName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {activity.evaluatorName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getScoreBadge(activity.score)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(activity.status, activity.score)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {activity.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          setSelectedActivity(activity);
                          setViewModalOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canEdit && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelectedActivity(activity);
                            setEditModalOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canContest && activity.status === "signed" && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-amber-600 hover:text-amber-800"
                          onClick={() => {
                            setSelectedActivity(activity);
                            setContestModalOpen(true);
                          }}
                        >
                          <TriangleAlert className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Visualizar */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Avaliação #{selectedActivity?.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Atendente</label>
                  <p className="text-sm text-muted-foreground">{selectedActivity?.agentName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Campanha</label>
                  <p className="text-sm text-muted-foreground">{selectedActivity?.campaignName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Avaliador</label>
                  <p className="text-sm text-muted-foreground">{selectedActivity?.evaluatorName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Nota Final</label>
                  <p className="text-sm text-muted-foreground">{selectedActivity?.score}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Editar */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Avaliação #{selectedActivity?.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Atendente</label>
                  <p className="text-sm text-muted-foreground p-2 bg-muted rounded">{selectedActivity?.agentName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Campanha</label>
                  <p className="text-sm text-muted-foreground p-2 bg-muted rounded">{selectedActivity?.campaignName}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-2">Nova Nota</label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      className={`w-8 h-8 rounded-full border-2 transition-colors text-sm font-medium ${
                        score === Math.floor(selectedActivity?.score || 0)
                          ? 'border-blue-500 bg-blue-50 text-blue-600' 
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Observações</label>
                <Textarea
                  placeholder="Adicione observações sobre a reavaliação..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => {
                  // Aqui seria implementada a lógica de salvar
                  setEditModalOpen(false);
                }}>
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Contestação */}
        <Dialog open={contestModalOpen} onOpenChange={setContestModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contestar Avaliação #{selectedActivity?.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Motivo da Contestação</label>
                <Textarea
                  placeholder="Descreva o motivo da contestação..."
                  value={contestReason}
                  onChange={(e) => setContestReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setContestModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => {
                  console.log('Contestação enviada:', contestReason);
                  setContestModalOpen(false);
                  setContestReason("");
                }}>
                  Enviar Contestação
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="px-6 py-3 border-t border-border bg-muted/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando <span className="font-medium">1</span> a <span className="font-medium">10</span> de{" "}
              <span className="font-medium">247</span> resultados
            </p>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <Button 
                variant={currentPage === 1 ? "default" : "outline"} 
                size="sm"
                className={currentPage === 1 ? "akig-bg-primary" : ""}
                onClick={() => setCurrentPage(1)}
              >
                1
              </Button>
              <Button 
                variant={currentPage === 2 ? "default" : "outline"} 
                size="sm"
                className={currentPage === 2 ? "akig-bg-primary" : ""}
                onClick={() => setCurrentPage(2)}
              >
                2
              </Button>
              <Button 
                variant={currentPage === 3 ? "default" : "outline"} 
                size="sm"
                className={currentPage === 3 ? "akig-bg-primary" : ""}
                onClick={() => setCurrentPage(3)}
              >
                3
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Próximo
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
