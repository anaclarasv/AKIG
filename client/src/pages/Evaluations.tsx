import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, AlertTriangle, FileSignature } from "lucide-react";
import type { Evaluation } from "@/types";

export default function Evaluations() {
  const [activeTab, setActiveTab] = useState("all");
  const { user } = useAuth();

  // For agents, only fetch their own evaluations
  const { data: evaluations, isLoading } = useQuery<Evaluation[]>({
    queryKey: user?.role === 'agent' ? ['/api/evaluations', 'agent', user.id] : ['/api/evaluations'],
  });

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="signed">Assinadas</TabsTrigger>
            <TabsTrigger value="contested">Contestadas</TabsTrigger>
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
                        <Button variant="outline" size="sm" className="flex-1">
                          Ver Detalhes
                        </Button>
                        {evaluation.status === "pending" && (
                          <Button size="sm" className="akig-bg-primary hover:opacity-90">
                            Assinar
                          </Button>
                        )}
                        {evaluation.status === "signed" && (
                          <Button variant="outline" size="sm" className="text-amber-600 hover:text-amber-800">
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
    </div>
  );
}
