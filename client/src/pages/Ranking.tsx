import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Medal, Award, Coins, Gift, TrendingUp, Calendar, Trophy } from "lucide-react";
import type { RankingEntry, Reward } from "@/types";

export default function Ranking() {
  const [period, setPeriod] = useState("monthly");
  const [activeTab, setActiveTab] = useState("ranking");

  const { data: ranking, isLoading: rankingLoading } = useQuery<RankingEntry[]>({
    queryKey: ['/api/ranking'],
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ['/api/rewards'],
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500" />;
      default:
        return (
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-muted-foreground">{rank}</span>
          </div>
        );
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-amber-500 text-white";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700";
      case 3:
        return "bg-gradient-to-r from-orange-400 to-orange-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };



  if (rankingLoading) {
    return (
      <div className="p-6">
        <Header 
          title="Ranking e Gamificação"
          subtitle="Sistema de reconhecimento e recompensas"
        />
        <div className="mt-6">
          <div className="loading-shimmer h-96 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header 
        title="Ranking e Gamificação"
        subtitle="Sistema de reconhecimento e recompensas"
      />

      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList className="grid w-auto grid-cols-2">
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
              <TabsTrigger value="evolution">Evolução</TabsTrigger>
            </TabsList>

            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-48">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Esta Semana</SelectItem>
                <SelectItem value="monthly">Este Mês</SelectItem>
                <SelectItem value="quarterly">Este Trimestre</SelectItem>
                <SelectItem value="yearly">Este Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="ranking" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top 3 Podium */}
              <div className="lg:col-span-2">
                <Card className="akig-card-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                      Top Performers - {period === "monthly" ? "Mensal" : period === "weekly" ? "Semanal" : period === "quarterly" ? "Trimestral" : "Anual"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ranking && ranking.length >= 3 ? (
                      <div className="flex items-end justify-center space-x-4 mb-8">
                        {/* Second Place */}
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center mb-3">
                            <Medal className="w-10 h-10 text-white" />
                          </div>
                          <Avatar className="w-12 h-12 mx-auto mb-2">
                            <AvatarFallback>
                              {ranking[1]?.firstName[0]}{ranking[1]?.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-semibold text-sm">{ranking[1]?.firstName} {ranking[1]?.lastName}</p>
                          <p className="text-xs text-muted-foreground">{ranking[1]?.averageScore.toFixed(1)} ⭐</p>
                          <Badge className="mt-1 bg-gray-100 text-gray-700">2º</Badge>
                        </div>

                        {/* First Place */}
                        <div className="text-center">
                          <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mb-3">
                            <Crown className="w-12 h-12 text-white" />
                          </div>
                          <Avatar className="w-16 h-16 mx-auto mb-2 border-4 border-yellow-400">
                            <AvatarFallback>
                              {ranking[0]?.firstName[0]}{ranking[0]?.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-bold">{ranking[0]?.firstName} {ranking[0]?.lastName}</p>
                          <p className="text-sm text-muted-foreground">{ranking[0]?.averageScore.toFixed(1)} ⭐</p>
                          <Badge className="mt-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white">1º</Badge>
                        </div>

                        {/* Third Place */}
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center mb-3">
                            <Award className="w-10 h-10 text-white" />
                          </div>
                          <Avatar className="w-12 h-12 mx-auto mb-2">
                            <AvatarFallback>
                              {ranking[2]?.firstName[0]}{ranking[2]?.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-semibold text-sm">{ranking[2]?.firstName} {ranking[2]?.lastName}</p>
                          <p className="text-xs text-muted-foreground">{ranking[2]?.averageScore.toFixed(1)} ⭐</p>
                          <Badge className="mt-1 bg-orange-100 text-orange-700">3º</Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Dados insuficientes para ranking</p>
                      </div>
                    )}

                    {/* Full Ranking List */}
                    <div className="space-y-2">
                      {ranking?.slice(3).map((entry) => (
                        <div key={entry.userId} className="flex items-center space-x-3 p-3 bg-muted rounded-lg rank-card">
                          <div className="flex-shrink-0">
                            {getRankIcon(entry.rank)}
                          </div>
                          <Avatar className="w-10 h-10">
                            <AvatarFallback>
                              {entry.firstName[0]}{entry.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{entry.firstName} {entry.lastName}</p>
                            <p className="text-sm text-muted-foreground">
                              {entry.averageScore.toFixed(1)} ⭐ • {entry.virtualCoins} moedas
                            </p>
                          </div>
                          <Badge className={getRankBadgeColor(entry.rank)}>
                            {entry.rank}º
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Ranking Statistics */}
              <div className="space-y-6">
                <Card className="akig-card-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Estatísticas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total de Participantes:</span>
                        <span className="font-semibold">{ranking?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Média Geral:</span>
                        <span className="font-semibold">
                          {ranking?.length ? (ranking.reduce((acc, r) => acc + r.averageScore, 0) / ranking.length).toFixed(1) : "0.0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Maior Pontuação:</span>
                        <span className="font-semibold">
                          {ranking?.length ? Math.max(...ranking.map(r => r.averageScore)).toFixed(1) : "0.0"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="akig-card-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Coins className="w-5 h-5 mr-2 text-yellow-500" />
                      Moedas em Circulação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-yellow-600">
                        {ranking?.reduce((acc, r) => acc + r.virtualCoins, 0) || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">moedas virtuais</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>



          <TabsContent value="evolution" className="mt-6">
            <Card className="akig-card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Evolução de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Gráfico de Evolução
                  </h3>
                  <p className="text-muted-foreground">
                    Funcionalidade em desenvolvimento - em breve você poderá acompanhar sua evolução ao longo do tempo
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
