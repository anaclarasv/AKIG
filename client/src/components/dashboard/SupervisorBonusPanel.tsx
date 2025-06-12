import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingUp, Users, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function SupervisorBonusPanel() {
  const { user } = useAuth();

  if (user?.role !== 'supervisor') {
    return null;
  }

  return (
    <Card className="akig-card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-yellow-600" />
          Sistema de Bônus de Equipe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Como supervisor, você ganha moedas virtuais baseado no desempenho da sua equipe:
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-medium">Base</span>
            </div>
            <div className="text-sm space-y-1">
              <div>• 1 moeda por avaliação da equipe</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-600" />
              <span className="font-medium">Bônus por Performance</span>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>≥90% (Excelente):</span>
                <Badge variant="default" className="bg-green-100 text-green-800">+2x</Badge>
              </div>
              <div className="flex justify-between">
                <span>≥80% (Boa):</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">+1x</Badge>
              </div>
              <div className="flex justify-between">
                <span>≥70% (Regular):</span>
                <Badge variant="outline" className="bg-orange-100 text-orange-800">+0.5x</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="font-medium">Suas Moedas Atuais:</span>
            <Badge variant="default" className="bg-yellow-100 text-yellow-800">
              {user?.virtualCoins || 0} moedas
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Bônus calculados mensalmente com base na média da equipe
          </div>
        </div>
      </CardContent>
    </Card>
  );
}