import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import akigLogo from "@/assets/akig-logo.png";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen akig-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-32 h-32 mx-auto mb-6 flex items-center justify-center">
            <img 
              src={akigLogo} 
              alt="AKIG Solutions Logo" 
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
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
            Fazer Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
