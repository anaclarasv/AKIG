import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, BarChart3, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface PerformanceData {
  month: string;
  qualityScore: number;
  operationScore: number;
  qualityTrend: number;
  operationTrend: number;
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
  const averageQuality = chartData.length > 0 
    ? chartData.reduce((sum, item) => sum + item.qualityScore, 0) / chartData.length 
    : 0;
  const averageOperation = chartData.length > 0 
    ? chartData.reduce((sum, item) => sum + item.operationScore, 0) / chartData.length 
    : 0;

  const recentQuality = chartData.length > 0 ? chartData[chartData.length - 1].qualityScore : 0;
  const previousQuality = chartData.length > 1 ? chartData[chartData.length - 2].qualityScore : 0;
  const qualityTrend = recentQuality - previousQuality;

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-gray-600";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const monthYear = label;
      const [year, month] = monthYear.split('-');
      const monthNames = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];
      const monthName = monthNames[parseInt(month) - 1];
      const formattedDate = `${monthName}/${year}`;
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800 dark:text-gray-200">{formattedDate}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mt-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {entry.value?.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

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
            Histórico de Desempenho
          </CardTitle>
          
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
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg border border-orange-200 dark:border-orange-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 dark:text-orange-300 font-medium">Notas de Qualidade</p>
                  <p className="text-2xl font-bold text-orange-800 dark:text-orange-100">
                    {averageQuality.toFixed(1)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(qualityTrend)}
                  <span className={`font-semibold ${getTrendColor(qualityTrend)}`}>
                    {qualityTrend > 0 ? '+' : ''}{Math.abs(qualityTrend).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Avaliações de Operação</p>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-100">
                    {averageOperation.toFixed(1)}
                  </p>
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300">
                  {chartData.reduce((sum, item) => sum + item.evaluations, 0)} total
                </div>
              </div>
            </div>
          </div>

          {/* Performance Chart */}
          {chartData.length > 0 ? (
            <div className="h-80 bg-gradient-to-b from-green-50/20 to-yellow-50/20 dark:from-green-900/10 dark:to-yellow-900/10 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  {/* Zonas de Performance com gradientes */}
                  <defs>
                    <linearGradient id="excellentZone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="goodZone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="improvementZone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  
                  {/* Linhas de referência para zonas de performance */}
                  <ReferenceLine y={90} stroke="#10B981" strokeDasharray="8 4" strokeWidth={1.5} />
                  <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="8 4" strokeWidth={1.5} />
                  <ReferenceLine y={50} stroke="#EF4444" strokeDasharray="8 4" strokeWidth={1.5} />
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" className="opacity-40" />
                  
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={{ stroke: '#D1D5DB' }}
                    tickLine={{ stroke: '#D1D5DB' }}
                    tickFormatter={formatMonthLabel}
                  />
                  
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={{ stroke: '#D1D5DB' }}
                    tickLine={{ stroke: '#D1D5DB' }}
                  />
                  
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Barras de Qualidade - principal */}
                  <Bar 
                    dataKey="qualityScore" 
                    fill="#F97316"
                    radius={[3, 3, 0, 0]}
                    name="Notas de Qualidade"
                    fillOpacity={0.9}
                    maxBarSize={40}
                  />
                  
                  {/* Linha de Tendência de Qualidade - amarela */}
                  <Line 
                    type="monotone" 
                    dataKey="qualityTrend" 
                    stroke="#EAB308" 
                    strokeWidth={4}
                    dot={{ fill: '#EAB308', strokeWidth: 3, r: 5 }}
                    activeDot={{ r: 7, fill: '#EAB308', strokeWidth: 2, stroke: '#fff' }}
                    name="Avaliações de Qualidade"
                  />
                  
                  {/* Linha de Tendência de Operação - azul tracejada */}
                  <Line 
                    type="monotone" 
                    dataKey="operationTrend" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                    name="Avaliações de Operação"
                  />
                </ComposedChart>
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

          {/* Legenda */}
          <div className="flex flex-wrap gap-6 justify-center text-sm bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-sm"></div>
              <span className="text-gray-700 dark:text-gray-300">Notas de Qualidade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">Avaliações de Qualidade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-blue-500 rounded-full border-2 border-dashed border-blue-500 bg-transparent"></div>
              <span className="text-gray-700 dark:text-gray-300">Avaliações de Operação</span>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-70">
              <div className="w-3 h-1 bg-green-500 rounded"></div>
              <span>90+ Excelente</span>
              <div className="w-3 h-1 bg-yellow-500 rounded"></div>
              <span>70+ Bom</span>
              <div className="w-3 h-1 bg-red-500 rounded"></div>
              <span>50+ A melhorar</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}