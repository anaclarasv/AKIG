import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, FileCheck, Signature } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";

interface FormSection {
  id: number;
  name: string;
  description: string;
  criteria: FormCriterion[];
}

interface FormCriterion {
  id: number;
  name: string;
  description: string;
  criterion_type: string;
  max_score: number;
  weight: number;
  is_required: boolean;
  is_critical: boolean;
}

interface EvaluationResponse {
  criterionId: number;
  value: string; // "sim", "nao", "nao_se_aplica" for radio, "true"/"false" for checkbox
  score: number;
}

interface DynamicEvaluationFormProps {
  monitoringSessionId: number;
  onEvaluationComplete: () => void;
}

export default function DynamicEvaluationForm({ 
  monitoringSessionId, 
  onEvaluationComplete 
}: DynamicEvaluationFormProps) {
  const { toast } = useToast();
  const [responses, setResponses] = useState<Record<number, EvaluationResponse>>({});
  const [comments, setComments] = useState("");
  const [totalScore, setTotalScore] = useState(0);
  const [hasFailure, setHasFailure] = useState(false);
  const [failureReasons, setFailureReasons] = useState<string[]>([]);

  // Buscar formulário ativo
  const { data: formSections, isLoading } = useQuery<FormSection[]>({
    queryKey: ["/api/monitoring-forms/active"],
  });

  // Mutation para salvar avaliação
  const saveEvaluationMutation = useMutation({
    mutationFn: async (evaluationData: any) => {
      const res = await apiRequest("POST", "/api/monitoring-evaluations", evaluationData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Avaliação salva com sucesso",
        description: "A ficha de monitoria foi salva no sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring-sessions"] });
      onEvaluationComplete();
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar avaliação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calcular pontuação total
  useEffect(() => {
    if (!formSections) return;

    let totalPoints = 0;
    let hasFailures = false;
    const failures: string[] = [];

    formSections.forEach(section => {
      section.criteria.forEach(criterion => {
        const response = responses[criterion.id];
        if (response) {
          // Para checkboxes críticos (falhas graves)
          if (criterion.criterion_type === "checkbox" && criterion.is_critical) {
            if (response.value === "true") {
              hasFailures = true;
              failures.push(criterion.name);
            }
          }
          // Para radio buttons normais
          else if (criterion.criterion_type === "radio") {
            totalPoints += response.score;
          }
        } else if (criterion.is_required) {
          // Critério obrigatório não respondido
          return;
        }
      });
    });

    setTotalScore(hasFailures ? 0 : totalPoints);
    setHasFailure(hasFailures);
    setFailureReasons(failures);
  }, [responses, formSections]);

  const handleRadioChange = (criterionId: number, value: string, criterion: FormCriterion) => {
    let score = 0;
    
    switch (value) {
      case "sim":
        score = criterion.weight;
        break;
      case "nao":
        score = 0;
        break;
      case "nao_se_aplica":
        score = criterion.weight; // "Não se aplica" dá a pontuação total
        break;
    }

    setResponses(prev => ({
      ...prev,
      [criterionId]: {
        criterionId,
        value,
        score
      }
    }));
  };

  const handleCheckboxChange = (criterionId: number, checked: boolean) => {
    setResponses(prev => ({
      ...prev,
      [criterionId]: {
        criterionId,
        value: checked.toString(),
        score: 0
      }
    }));
  };

  const handleSubmit = () => {
    if (!formSections) return;

    // Validar campos obrigatórios
    const missingRequired = formSections
      .flatMap(section => section.criteria)
      .filter(criterion => criterion.is_required && !responses[criterion.id]);

    if (missingRequired.length > 0) {
      toast({
        title: "Campos obrigatórios não preenchidos",
        description: `Por favor, preencha todos os critérios obrigatórios.`,
        variant: "destructive",
      });
      return;
    }

    const evaluationData = {
      monitoringSessionId,
      evaluationData: {
        responses: Object.values(responses),
        totalScore,
        hasFailure,
        failureReasons,
        formVersion: "1.0"
      },
      totalScore,
      comments
    };

    saveEvaluationMutation.mutate(evaluationData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando formulário de avaliação...</div>
        </CardContent>
      </Card>
    );
  }

  if (!formSections || formSections.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Nenhum formulário de avaliação configurado.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com pontuação */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Ficha de Monitoria
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Avalie cada critério conforme o atendimento realizado
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {totalScore.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">/ 100 pontos</div>
              {hasFailure && (
                <Badge variant="destructive" className="mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Falha Grave
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alertas de falha grave */}
      {hasFailure && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Falhas Graves Detectadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {failureReasons.map((reason, index) => (
                <li key={index} className="text-destructive">
                  {reason}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              A pontuação foi zerada devido às falhas graves marcadas acima.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Seções do formulário */}
      {formSections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.name}</CardTitle>
            <p className="text-muted-foreground">{section.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {section.criteria.map((criterion) => (
              <div key={criterion.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Label className="text-base font-medium">
                      {criterion.name}
                      {criterion.is_required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                      {criterion.is_critical && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          ZERA
                        </Badge>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {criterion.description}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {criterion.weight} pts
                  </div>
                </div>

                {criterion.criterion_type === "radio" ? (
                  <RadioGroup
                    value={responses[criterion.id]?.value || ""}
                    onValueChange={(value) => handleRadioChange(criterion.id, value, criterion)}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id={`${criterion.id}-sim`} />
                      <Label htmlFor={`${criterion.id}-sim`}>Sim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id={`${criterion.id}-nao`} />
                      <Label htmlFor={`${criterion.id}-nao`}>Não</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao_se_aplica" id={`${criterion.id}-na`} />
                      <Label htmlFor={`${criterion.id}-na`}>Não se aplica</Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`checkbox-${criterion.id}`}
                      checked={responses[criterion.id]?.value === "true"}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange(criterion.id, Boolean(checked))
                      }
                    />
                    <Label htmlFor={`checkbox-${criterion.id}`}>
                      Marcar se esta falha foi identificada
                    </Label>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Comentários */}
      <Card>
        <CardHeader>
          <CardTitle>Observações Adicionais</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Digite aqui observações, comentários ou recomendações para o agente..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-3">
        <Button 
          onClick={handleSubmit}
          disabled={saveEvaluationMutation.isPending}
          className="flex-1"
        >
          {saveEvaluationMutation.isPending ? "Salvando..." : "Salvar Avaliação"}
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <Signature className="h-4 w-4" />
          Assinar Digitalmente
        </Button>
      </div>
    </div>
  );
}