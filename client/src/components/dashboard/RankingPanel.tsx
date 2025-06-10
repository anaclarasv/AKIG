import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Coins } from "lucide-react";
import type { RankingEntry } from "@/types";

export default function RankingPanel() {
  const { data: ranking, isLoading } = useQuery<RankingEntry[]>({
    queryKey: ['/api/ranking'],
  });

  if (isLoading) {
    return (
      <Card className="akig-card-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Ranking Mensal</CardTitle>
          <p className="text-muted-foreground text-sm">Top performers do mês</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="loading-shimmer h-16 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const topThree = ranking?.slice(0, 3) || [];

  return (
    <Card className="akig-card-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Ranking Mensal</CardTitle>
        <p className="text-muted-foreground text-sm">Top performers do mês</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topThree.map((entry, index) => (
            <div 
              key={entry.userId} 
              className={`flex items-center space-x-4 p-3 rounded-lg rank-card ${
                index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : 'rank-3'
              } ${index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200' : 'bg-muted'}`}
            >
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                  index === 1 ? 'bg-gray-300' : 'bg-orange-200'
                }`}>
                  {index === 0 ? (
                    <Crown className="w-4 h-4 text-white" />
                  ) : (
                    <span className={`font-bold text-sm ${
                      index === 1 ? 'text-gray-700' : 'text-orange-700'
                    }`}>
                      {index + 1}
                    </span>
                  )}
                </div>
              </div>
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {entry.firstName[0]}{entry.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {entry.firstName} {entry.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {entry.averageScore.toFixed(1)} ⭐ • {entry.virtualCoins} moedas
                </p>
              </div>
              {index === 0 && (
                <div className="text-right">
                  <span className="text-2xl font-bold text-amber-600">1º</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Virtual Coins Section */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-foreground">Moedas Virtuais</h4>
            <Coins className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Troque por brindes e recompensas
          </p>
          <Button className="w-full akig-bg-primary hover:opacity-90 text-sm font-medium">
            Ver Loja de Brindes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
