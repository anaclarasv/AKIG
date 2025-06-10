import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, FileSignature } from "lucide-react";
import type { EvaluationCriteria } from "@/types";

export default function EvaluationForm() {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [signatureRequested, setSignatureRequested] = useState(false);

  const { data: criteria, isLoading } = useQuery<EvaluationCriteria[]>({
    queryKey: ['/api/evaluation-criteria'],
  });

  const handleScoreChange = (criteriaId: string, score: number) => {
    setScores(prev => ({ ...prev, [criteriaId]: score }));
  };

  const handleObservationChange = (criteriaId: string, observation: string) => {
    setObservations(prev => ({ ...prev, [criteriaId]: observation }));
  };

  const calculateFinalScore = () => {
    if (!criteria || Object.keys(scores).length === 0) return 0;
    
    let totalScore = 0;
    let totalWeight = 0;
    
    criteria.forEach(criterion => {
      const score = scores[criterion.id.toString()];
      if (score !== undefined) {
        totalScore += score * (criterion.weight / 100);
        totalWeight += criterion.weight / 100;
      }
    });
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  };

  const finalScore = calculateFinalScore();

  const handleRequestSignature = () => {
    setSignatureRequested(true);
  };

  if (isLoading) {
    return (
      <Card className="mt-8 akig-card-shadow">
        <CardContent className="pt-6">
          <div className="loading-shimmer h-96 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8 akig-card-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Formulário de Avaliação</CardTitle>
            <p className="text-muted-foreground text-sm">Critérios personalizáveis para monitoria</p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            Finalizar Avaliação
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Evaluation Criteria */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Critérios de Avaliação</h4>
            <div className="space-y-6">
              {criteria?.map((criterion) => (
                <div key={criterion.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-foreground">{criterion.name}</label>
                    <span className="text-sm text-muted-foreground">Peso: {criterion.weight}%</span>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    {[...Array(criterion.maxScore)].map((_, index) => {
                      const score = index + 1;
                      const isSelected = scores[criterion.id.toString()] === score;
                      return (
                        <button
                          key={score}
                          onClick={() => handleScoreChange(criterion.id.toString(), score)}
                          className={`w-8 h-8 rounded-full border-2 transition-colors text-sm font-medium ${
                            isSelected 
                              ? 'akig-border-primary bg-blue-50 akig-text-primary' 
                              : 'border-border hover:akig-border-primary hover:bg-blue-50'
                          }`}
                        >
                          {score}
                        </button>
                      );
                    })}
                  </div>
                  <Textarea
                    placeholder={`Observações sobre ${criterion.name.toLowerCase()}...`}
                    value={observations[criterion.id.toString()] || ''}
                    onChange={(e) => handleObservationChange(criterion.id.toString(), e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Evaluation Summary */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Resumo da Avaliação</h4>
            <div className="bg-muted rounded-lg p-6">
              <div className="text-center mb-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-4">
                  <span className="text-white text-2xl font-bold">
                    {finalScore.toFixed(1)}
                  </span>
                </div>
                <p className="text-lg font-semibold text-foreground">Nota Final</p>
                <p className="text-sm text-muted-foreground">
                  {finalScore >= 7 ? 'Aprovado - Bom desempenho' : 
                   finalScore >= 5 ? 'Regular - Necessita melhoria' : 
                   'Reprovado - Treinamento necessário'}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {criteria?.map((criterion) => {
                  const score = scores[criterion.id.toString()];
                  return (
                    <div key={criterion.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {criterion.name} ({criterion.weight}%)
                      </span>
                      <span className="font-medium">
                        {score ? `${score}.0` : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Agent Signature */}
              <div className="border-t border-border pt-4">
                <h5 className="font-medium text-foreground mb-3">Assinatura do Atendente</h5>
                <div className={`signature-pad ${signatureRequested ? 'signed' : ''}`}>
                  <FileSignature className={`w-6 h-6 mb-2 mx-auto ${
                    signatureRequested ? 'text-green-500' : 'text-muted-foreground'
                  }`} />
                  <p className={`text-sm mb-2 ${
                    signatureRequested ? 'text-green-600 font-medium' : 'text-muted-foreground'
                  }`}>
                    {signatureRequested ? 'Assinatura solicitada' : 'Aguardando assinatura digital'}
                  </p>
                  {signatureRequested && (
                    <p className="text-xs text-muted-foreground">
                      Aguardando confirmação do atendente
                    </p>
                  )}
                  {!signatureRequested && (
                    <Button 
                      onClick={handleRequestSignature}
                      className="mt-2 akig-bg-primary hover:opacity-90 text-sm"
                    >
                      Solicitar Assinatura
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
