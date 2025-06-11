import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MonitoringEvaluationForm from "@/components/monitoring/MonitoringEvaluationForm";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TestEvaluationForm() {
  const [showForm, setShowForm] = useState(true);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ficha de Monitoria Dinâmica - Teste</h1>
          <p className="text-muted-foreground">Demonstração do sistema de avaliação dinâmica</p>
        </div>
        <Link href="/monitoring">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Monitorias
          </Button>
        </Link>
      </div>

      {showForm ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Monitoria #34 - TESTECX.mp3</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Avaliação usando ficha dinâmica configurável
                  </p>
                </div>
                <Badge variant="secondary">Transcrição Completa</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">Como funciona:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Sim:</strong> Ganha pontos completos do critério</li>
                  <li>• <strong>Não:</strong> Não ganha pontos (0 pontos)</li>
                  <li>• <strong>Não se aplica:</strong> Ganha pontos completos automaticamente</li>
                  <li>• <strong>Critérios ZERA:</strong> Se marcados, anulam toda a avaliação (nota = 0)</li>
                  <li>• <strong>Pontuação final:</strong> Soma dos pontos obtidos (máximo 100)</li>
                </ul>
              </div>

              <MonitoringEvaluationForm 
                monitoringSessionId={34}
                onEvaluationSaved={(evaluationId) => {
                  alert(`Avaliação #${evaluationId} salva com sucesso!`);
                }}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Avaliação Concluída</h3>
            <p className="text-muted-foreground mb-4">
              A ficha de monitoria foi salva no banco de dados.
            </p>
            <Button onClick={() => setShowForm(true)}>
              Criar Nova Avaliação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}