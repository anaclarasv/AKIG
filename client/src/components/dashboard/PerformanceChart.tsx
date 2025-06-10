import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";

interface PerformanceChartProps {
  agentId: string;
}

type TimePeriod = "3" | "6" | "12";

export default function PerformanceChart({ agentId }: PerformanceChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("3");

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["/api/performance-evolution", agentId, selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/performance-evolution?agentId=${agentId}&months=${selectedPeriod}`);
      if (!response.ok) throw new Error("Failed to fetch performance data");
      return response.json();
    }
  });

  const chartData = performanceData?.data || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">Evolução do Desempenho</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedPeriod} onValueChange={(value: TimePeriod) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 10]}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}`, "Pontuação"]}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#2563eb", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-lg font-medium">Dados insuficientes</p>
            <p className="text-sm">Realize mais avaliações para visualizar sua evolução</p>
          </div>
        )}
        
        {chartData.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Média Geral</p>
              <p className="text-xl font-bold text-blue-600">
                {(chartData.reduce((acc: number, item: any) => acc + item.score, 0) / chartData.length).toFixed(1)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Melhor Pontuação</p>
              <p className="text-xl font-bold text-green-600">
                {Math.max(...chartData.map((item: any) => item.score)).toFixed(1)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Avaliações</p>
              <p className="text-xl font-bold text-gray-600">
                {chartData.reduce((acc: number, item: any) => acc + item.evaluations, 0)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}