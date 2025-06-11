import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, BarChart3, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface PerformanceData {
  month: string;
  score: number;
  evaluations: number;
}

export default function AgentPerformanceChart() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<3 | 6 | 12>(6);

  const { data: performanceData, isLoading } = useQuery<PerformanceData[]>({
    queryKey: [`/api/performance-evolution/${user?.id}?months=${selectedPeriod}`, selectedPeriod],
    enabled: user?.role === 'agent' && !!user?.id,
  });

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <CardContent className="pt-6">
          <div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const chartData = performanceData || [];
  const averageScore = chartData.length > 0 
    ? chartData.reduce((sum, item) => sum + item.score, 0) / chartData.length 
    : 0;

  const recentScore = chartData.length > 0 ? chartData[chartData.length - 1].score : 0;
  const previousScore = chartData.length > 1 ? chartData[chartData.length - 2].score : 0;
  const trend = recentScore - previousScore;

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const monthYear = label; // Format: YYYY-MM
      const [year, month] = monthYear.split('-');
      const monthNames = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];
      const monthName = monthNames[parseInt(month) - 1];
      const formattedDate = `${monthName}/${year}`;
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium">{formattedDate}</p>
          <p className="text-blue-600">
            {`Nota: ${payload[0].value.toFixed(1)}`}
          </p>
          <p className="text-gray-600 text-sm">
            {`${payload[0].payload.evaluations} avaliação(ões)`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Format month labels for display
  const formatMonthLabel = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    const monthName = monthNames[parseInt(month) - 1];
    return `${monthName}`;
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Evolução de Desempenho
          </CardTitle>
          
          {/* Period Filter Buttons */}
          <div className="flex gap-1">
            {[3, 6, 12].map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod(period as 3 | 6 | 12)}
                className="text-xs px-3 py-1"
              >
                {period}m
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Performance Summary */}
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Média dos Últimos {selectedPeriod} Meses</p>
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

          {/* Performance Chart */}
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    className="text-gray-600 dark:text-gray-400"
                    tickFormatter={formatMonthLabel}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="score" 
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                    className="hover:opacity-80"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Dados de desempenho não disponíveis</p>
                <p className="text-sm">Complete algumas avaliações para ver seu progresso</p>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {chartData.reduce((sum, item) => sum + item.evaluations, 0)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total de Avaliações</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {recentScore.toFixed(1)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Última Nota</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}