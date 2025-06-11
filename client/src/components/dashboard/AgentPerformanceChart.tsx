import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface PerformanceData {
  month: string;
  score: number;
  evaluations: number;
}

export default function AgentPerformanceChart() {
  const { user } = useAuth();

  const { data: performanceData = [], isLoading } = useQuery<PerformanceData[]>({
    queryKey: ['/api/performance-evolution', user?.id],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card className="akig-card-shadow">
        <CardContent className="pt-6">
          <div className="loading-shimmer h-40 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const currentMonth = performanceData[performanceData.length - 1];
  const previousMonth = performanceData[performanceData.length - 2];
  
  const trend = currentMonth && previousMonth 
    ? currentMonth.score - previousMonth.score 
    : 0;

  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <BarChart3 className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = () => {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <Card className="akig-card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">Evolução de Desempenho</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Performance */}
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Desempenho Atual</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-100">
                {currentMonth?.score?.toFixed(1) || '0.0'} pts
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <span className={`font-semibold ${getTrendColor()}`}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Performance History */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Últimos 6 meses</h4>
            <div className="space-y-2">
              {performanceData.slice(-6).map((data, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm font-medium">{data.month}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{data.score.toFixed(1)} pts</span>
                    <span className="text-xs text-muted-foreground">
                      ({data.evaluations} avaliações)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {performanceData.length === 0 && (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum dado de desempenho disponível</p>
              <p className="text-sm text-muted-foreground mt-1">
                Os dados aparecerão após suas primeiras avaliações
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}