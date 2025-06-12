import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, Calendar, Users } from "lucide-react";

interface TeamPerformanceData {
  month: string;
  averageScore: number;
  evaluationCount: number;
  trend: number;
}

export default function TeamPerformanceChart() {
  const { data: teamPerformance = [], isLoading } = useQuery<TeamPerformanceData[]>({
    queryKey: ["/api/team-performance"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Evolução da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (teamPerformance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Evolução da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum dado de performance disponível</p>
            <p className="text-sm">Os dados aparecerão conforme as avaliações forem realizadas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for charts
  const chartData = teamPerformance.map(item => ({
    ...item,
    monthLabel: new Date(item.month + '-01').toLocaleDateString('pt-BR', { 
      month: 'short', 
      year: '2-digit' 
    }),
  }));

  // Calculate overall trend
  const latestScore = teamPerformance[teamPerformance.length - 1]?.averageScore || 0;
  const previousScore = teamPerformance[teamPerformance.length - 2]?.averageScore || latestScore;
  const overallTrend = previousScore > 0 ? ((latestScore - previousScore) / previousScore) * 100 : 0;

  // Total evaluations
  const totalEvaluations = teamPerformance.reduce((sum, item) => sum + item.evaluationCount, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-orange-600">Score Médio:</span> {payload[0]?.value?.toFixed(1)} pts
            </p>
            <p className="text-sm">
              <span className="text-blue-600">Avaliações:</span> {payload[1]?.value || 0}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Evolução da Equipe
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              {overallTrend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={overallTrend >= 0 ? 'text-green-600' : 'text-red-600'}>
                {overallTrend > 0 ? '+' : ''}{overallTrend.toFixed(1)}%
              </span>
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {totalEvaluations} avaliações total
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Performance Score Line Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Score Médio da Equipe
            </h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="monthLabel" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[60, 100]}
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="averageScore"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ fill: "#f97316", strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: "#f97316", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Evaluation Count Bar Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Volume de Avaliações
            </h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="monthLabel" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Avaliações']}
                    labelFormatter={(label) => `Período: ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar
                    dataKey="evaluationCount"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {latestScore.toFixed(1)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Score Atual</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {teamPerformance[teamPerformance.length - 1]?.evaluationCount || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Avaliações/Mês</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${overallTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {overallTrend > 0 ? '+' : ''}{overallTrend.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Tendência</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}