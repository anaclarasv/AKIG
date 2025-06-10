import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Volume2, Download } from "lucide-react";
import type { MonitoringSession } from "@/types";

export default function Monitoring() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: sessions, isLoading } = useQuery<MonitoringSession[]>({
    queryKey: ['/api/monitoring-sessions'],
  });

  const handleNewMonitoring = () => {
    console.log("Creating new monitoring session...");
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
        action={{
          label: "Nova Monitoria",
          onClick: handleNewMonitoring
        }}
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
                  <Button variant="outline" size="sm" className="flex-1">
                    Ver Detalhes
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
                Comece criando sua primeira sessão de monitoramento
              </p>
              <Button onClick={handleNewMonitoring} className="akig-bg-primary hover:opacity-90">
                Criar Nova Monitoria
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
