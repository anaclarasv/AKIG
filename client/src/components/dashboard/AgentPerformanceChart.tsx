import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AgentPerformanceChart() {
  const { user } = useAuth();

  const { data: evaluations = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/my-evaluations'],
    enabled: user?.role === 'agent',
  });

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <CardContent className="pt-6">
          <div className="animate-pulse h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const totalEvaluations = Array.isArray(evaluations) ? evaluations.length : 0;
  const averageScore = totalEvaluations > 0 
    ? evaluations.reduce((sum: number, evaluation: any) => sum + (evaluation.finalScore || 0), 0) / totalEvaluations 
    : 0;

  const recentEvaluations = Array.isArray(evaluations) ? evaluations.slice(-5) : [];
  const previousAverage = recentEvaluations.length > 1 
    ? recentEvaluations.slice(0, -1).reduce((sum: number, evaluation: any) => sum + (evaluation.finalScore || 0), 0) / (recentEvaluations.length - 1)
    : 0;
  
  const trend = averageScore - previousAverage;

  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = () => {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Evolução de Desempenho
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Performance */}
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Média Geral</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-100">
                {averageScore.toFixed(1)} pts
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <span className={`font-semibold ${getTrendColor()}`}>
                {trend > 0 ? '+' : ''}{Math.abs(trend).toFixed(1)}
              </span>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{totalEvaluations}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total de Avaliações</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {Array.isArray(evaluations) ? evaluations.filter((e: any) => e.status === 'signed').length : 0}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Avaliações Assinadas</p>
            </div>
          </div>

          {/* Recent Evaluations */}
          {recentEvaluations.length > 0 ? (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Últimas Avaliações</h4>
              <div className="space-y-2">
                {recentEvaluations.slice(-3).map((evaluation: any, index: number) => (
                  <div key={evaluation.id || index} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm font-medium">#{evaluation.id || 'N/A'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{(evaluation.finalScore || 0).toFixed(1)} pts</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        evaluation.status === 'signed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {evaluation.status === 'signed' ? 'Assinada' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nenhuma avaliação encontrada</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Seus dados de desempenho aparecerão aqui após as primeiras avaliações
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}