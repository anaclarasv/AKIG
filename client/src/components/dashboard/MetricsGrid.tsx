import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Headphones, Star, Clock, Users } from "lucide-react";
import type { DashboardMetrics } from "@/types";

export default function MetricsGrid() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="akig-card-shadow">
            <CardContent className="pt-6">
              <div className="loading-shimmer h-20 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatTrend = (change: number) => {
    if (change === 0) return "0%";
    const sign = change > 0 ? "+" : "";
    return `${sign}${change}%`;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-500";
  };

  const metricCards = [
    {
      title: "Monitorias Hoje",
      value: metrics?.todayMonitorings || 0,
      icon: Headphones,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      trend: formatTrend(metrics?.todayMonitoringsChange || 0),
      trendLabel: "vs. ontem",
      trendColor: getTrendColor(metrics?.todayMonitoringsChange || 0)
    },
    {
      title: "Média Geral",
      value: metrics?.averageScore?.toFixed(1) || "0.0",
      icon: Star,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      trend: formatTrend(metrics?.averageScoreChange || 0),
      trendLabel: "vs. semana anterior",
      trendColor: getTrendColor(metrics?.averageScoreChange || 0)
    },
    {
      title: "Fichas Pendentes",
      value: metrics?.pendingForms || 0,
      icon: Clock,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      trend: formatTrend(metrics?.pendingFormsChange || 0),
      trendLabel: "vs. ontem",
      trendColor: getTrendColor(metrics?.pendingFormsChange || 0)
    },
    {
      title: "Atendentes Ativos",
      value: metrics?.activeAgents || 0,
      icon: Users,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      trend: formatTrend(metrics?.activeAgentsChange || 0),
      trendLabel: "total ativo",
      trendColor: "text-gray-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metricCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="akig-card-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">{card.title}</p>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                </div>
                <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${card.iconColor} w-6 h-6`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className={`${card.trendColor} font-medium`}>{card.trend}</span>
                <span className="text-muted-foreground ml-2">{card.trendLabel}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
