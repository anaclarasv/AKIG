import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrendingUp, TrendingDown, Users, Star } from "lucide-react";

interface TeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  averageScore: number;
  virtualCoins: number;
  evaluationCount: number;
  rank: number;
}

export default function TeamRankingPanel() {
  const { data: teamRanking = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-ranking"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ranking da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const top3 = teamRanking.slice(0, 3);
  const bottom3 = teamRanking.slice(-3).reverse();

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return "bg-yellow-500 text-white";
      case 2: return "bg-gray-400 text-white";
      case 3: return "bg-orange-600 text-white";
      default: return "bg-gray-200 text-gray-700";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-yellow-600";
    if (score >= 70) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top 3 Melhores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <TrendingUp className="h-5 w-5" />
            Top 3 Melhores Avaliados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {top3.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum dado de avaliação disponível</p>
            </div>
          ) : (
            <div className="space-y-4">
              {top3.map((member) => (
                <div key={member.userId} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={getRankColor(member.rank)}>
                        {getInitials(member.firstName, member.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {member.rank}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {member.firstName} {member.lastName}
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className={`font-medium ${getScoreColor(member.averageScore)}`}>
                        {member.averageScore.toFixed(1)} pts
                      </span>
                      <span>{member.evaluationCount} avaliações</span>
                      <Badge variant="outline" className="text-xs">
                        {member.virtualCoins} moedas
                      </Badge>
                    </div>
                  </div>
                  <Star className="h-5 w-5 text-yellow-500" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 3 Piores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <TrendingDown className="h-5 w-5" />
            Necessitam Atenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bottom3.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum dado de avaliação disponível</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bottom3.map((member) => (
                <div key={member.userId} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-red-500 text-white">
                        {getInitials(member.firstName, member.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {member.rank}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {member.firstName} {member.lastName}
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className={`font-medium ${getScoreColor(member.averageScore)}`}>
                        {member.averageScore.toFixed(1)} pts
                      </span>
                      <span>{member.evaluationCount} avaliações</span>
                      <Badge variant="outline" className="text-xs">
                        {member.virtualCoins} moedas
                      </Badge>
                    </div>
                  </div>
                  <div className="text-red-500 text-xs font-medium bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                    Treinar
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}