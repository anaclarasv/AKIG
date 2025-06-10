import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen akig-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold akig-text-primary">A</span>
          </div>
          <CardTitle className="text-2xl font-bold">AKIG Solutions</CardTitle>
          <p className="text-muted-foreground">Monitoria Inteligente com IA</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Sistema de monitoria de atendimento com:</p>
            <ul className="mt-2 space-y-1">
              <li>• Transcrição automática com IA</li>
              <li>• Avaliações personalizáveis</li>
              <li>• Gamificação e ranking</li>
              <li>• Relatórios avançados</li>
            </ul>
          </div>
          <Button onClick={handleLogin} className="w-full akig-bg-primary hover:opacity-90">
            Entrar com Replit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
