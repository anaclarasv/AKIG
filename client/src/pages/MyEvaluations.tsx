import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Star, 
  Target,
  Lightbulb,
  AlertTriangle,
  Award,
  MessageCircle,
  Phone,
  Mail,
  Video,
  ChevronRight,
  CheckCircle,
  XCircle,
  BarChart3
} from "lucide-react";
import type { Evaluation, MonitoringSession } from "@/types";

interface EvaluationWithSession extends Evaluation {
  session: MonitoringSession;
}

interface EvaluationScores {
  [criteriaId: string]: {
    score: number;
    maxScore: number;
    criteriaName: string;
    comment?: string;
  };
}

export default function MyEvaluationsPage() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("30");

  const { data: evaluations, isLoading } = useQuery<EvaluationWithSession[]>({
    queryKey: ['/api/my-evaluations', selectedPeriod],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
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

  const calculateOverallScore = (evaluation: any): number => {
    return evaluation?.finalScore || 0;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel?.toLowerCase()) {
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <BarChart3 className="w-4 h-4 text-gray-600" />;
  };

  const overallStats = evaluations ? {
    averageScore: evaluations.reduce((sum, evaluation) => {
      return sum + calculateOverallScore(evaluation);
    }, 0) / evaluations.length,
    totalEvaluations: evaluations.length,
    criticalFailures: evaluations.filter(e => e.hasCriticalFailure).length,
    completedEvaluations: evaluations.filter(e => e.status === 'completed').length,
    averageScoreDisplay: evaluations.length > 0 ? (evaluations.reduce((sum, evaluation) => sum + calculateOverallScore(evaluation), 0) / evaluations.length).toFixed(1) : '0'
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header da Página */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                Minhas Monitorias
              </h1>
              <p className="text-muted-foreground mt-2">
                Acompanhe seu desempenho e evolução profissional
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {evaluations?.length || 0} avaliações
              </Badge>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas Gamificadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="akig-card-shadow bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-300">Pontuação Média</p>
                  <p className="text-3xl font-bold text-blue-800 dark:text-blue-100">
                    {overallStats?.averageScoreDisplay || '0'} pts
                  </p>
                </div>
                <Award className="w-12 h-12 text-blue-600" />
              </div>
              <Progress 
                value={overallStats?.averageScore || 0} 
                className="mt-4" 
              />
            </CardContent>
          </Card>

          <Card className="akig-card-shadow bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-300">Avaliações Concluídas</p>
                  <p className="text-3xl font-bold text-green-800 dark:text-green-100 flex items-center gap-2">
                    {overallStats?.completedEvaluations || 0}
                    <CheckCircle className="w-6 h-6" />
                  </p>
                </div>
                <Target className="w-12 h-12 text-green-600" />
              </div>
              <p className="text-sm text-green-600 mt-2">finalizadas com sucesso</p>
            </CardContent>
          </Card>

          <Card className="akig-card-shadow bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-300">Total de Avaliações</p>
                  <p className="text-3xl font-bold text-purple-800 dark:text-purple-100">
                    {overallStats?.totalEvaluations || 0}
                  </p>
                </div>
                <Star className="w-12 h-12 text-purple-600" />
              </div>
              <p className="text-sm text-purple-600 mt-2">últimos 30 dias</p>
            </CardContent>
          </Card>

          <Card className="akig-card-shadow bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-300">Pontos Fortes</p>
                  <p className="text-lg font-bold text-orange-800 dark:text-orange-100">
                    {overallStats?.strongPoints.length || 0} identificados
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-orange-600" />
              </div>
              <p className="text-sm text-orange-600 mt-2">continue assim!</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de Avaliações */}
          <div className="lg:col-span-2">
            <Card className="akig-card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Histórico de Avaliações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {evaluations?.map((evaluation) => {
                    const overallScore = calculateOverallScore(evaluation);
                    
                    return (
                      <Card key={evaluation.id} className="border border-border hover:border-primary/20 transition-colors">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                  #{evaluation.session.id}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold text-foreground">
                                  Atendimento #{evaluation.session.id}
                                </h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {getChannelIcon('phone')}
                                  <span>{new Date(evaluation.createdAt).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getScoreBadgeColor(overallScore)}>
                                {overallScore.toFixed(1)} pts
                              </Badge>
                              {evaluation.hasCriticalFailure && (
                                <Badge className="bg-red-100 text-red-800 border-red-200">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Falha Crítica
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Status da Avaliação */}
                          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-foreground">
                                  <strong>Pontuação:</strong> {evaluation.finalScore} pontos (de 100)
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Status: {evaluation.status === 'completed' ? 'Concluída' : evaluation.status === 'draft' ? 'Rascunho' : 'Assinada'}
                                </p>
                              </div>
                              <Progress value={overallScore} className="w-24 h-2" />
                            </div>
                          </div>

                          {/* Resumo do Atendimento */}
                          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm text-foreground">
                              <strong>Duração:</strong> {evaluation.session.duration ? Math.floor(evaluation.session.duration / 60) + " minutos" : "Não informado"}
                            </p>
                            {evaluation.session.audioUrl && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Áudio disponível para revisão
                              </p>
                            )}
                          </div>

                          {/* Comentários do Avaliador */}
                          {evaluation.observations && (
                            <div className="border-t pt-3">
                              <p className="text-sm text-muted-foreground">
                                <strong>Observações do Avaliador:</strong> {evaluation.observations}
                              </p>
                            </div>
                          )}

                          {/* Falha Crítica */}
                          {evaluation.hasCriticalFailure && evaluation.criticalFailureReason && (
                            <div className="border-t pt-3 border-red-200">
                              <p className="text-sm text-red-600">
                                <strong>Motivo da Falha Crítica:</strong> {evaluation.criticalFailureReason}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {(!evaluations || evaluations.length === 0) && (
                    <div className="text-center py-12">
                      <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Nenhuma avaliação encontrada
                      </h3>
                      <p className="text-muted-foreground">
                        Suas avaliações aparecerão aqui assim que forem realizadas.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Painel Lateral - Insights e Dicas */}
          <div className="space-y-6">
            {/* Pontos Fortes */}
            <Card className="akig-card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Pontos Fortes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overallStats?.strongPoints.map((point, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-foreground">{point}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pontos a Melhorar */}
            <Card className="akig-card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <Target className="w-5 h-5" />
                  Pontos a Melhorar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overallStats?.improvementAreas.map((area, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm text-foreground">{area}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dicas Personalizadas */}
            <Card className="akig-card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Lightbulb className="w-5 h-5" />
                  Dicas Personalizadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>💡 Comunicação:</strong> Continue utilizando linguagem clara e objetiva. Sua empatia tem sido muito elogiada!
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>⚡ Agilidade:</strong> Tente reduzir o tempo de resposta em 10%. Use os atalhos do sistema para ser mais eficiente.
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>📚 Conhecimento:</strong> Participe dos treinamentos mensais para ampliar seu conhecimento técnico.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alertas de Reincidência */}
            <Card className="akig-card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Atenção Especial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      <strong>⚠️ Padrão Identificado:</strong> Tempo de resposta acima da meta em 3 das últimas 5 avaliações.
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-2">
                      Recomendação: Revisar processo de busca de informações
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}