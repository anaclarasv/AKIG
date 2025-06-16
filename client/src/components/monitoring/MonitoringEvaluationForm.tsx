import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Save, FileDown, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface MonitoringEvaluationFormProps {
  monitoringSessionId: number;
  onEvaluationSaved?: (evaluationId: number) => void;
}

interface FormData {
  [key: string]: string;
}

interface EvaluationSummary {
  partialScore: number;
  finalScore: number;
  hasCriticalFailure: boolean;
  criticalFailures: string[];
  totalPossiblePoints: number;
}

const evaluationSchema = z.object({
  observations: z.string().optional(),
});

export default function MonitoringEvaluationForm({ 
  monitoringSessionId, 
  onEvaluationSaved 
}: MonitoringEvaluationFormProps) {
  const [responses, setResponses] = useState<FormData>({});
  const [evaluationSummary, setEvaluationSummary] = useState<EvaluationSummary>({
    partialScore: 0,
    finalScore: 0,
    hasCriticalFailure: false,
    criticalFailures: [],
    totalPossiblePoints: 0,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      observations: "",
    },
  });

  // Fetch monitoring form with sections and criteria
  const { data: monitoringForm, isLoading, error } = useQuery({
    queryKey: ['/api/monitoring-forms', 'active'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/monitoring-forms/active');
      return response.json();
    },
    retry: 3,
    refetchOnMount: true,
  });

  // Calculate evaluation scores when responses change
  useEffect(() => {
    if (!monitoringForm) return;
    
    let partialScore = 0;
    let totalPossiblePoints = 0;
    let hasCriticalFailure = false;
    const criticalFailures: string[] = [];

    monitoringForm.sections?.forEach((section: any) => {
      section.criteria?.forEach((criteria: any) => {
        const response = responses[`criteria_${criteria.id}`];
        totalPossiblePoints += Number(criteria.weight);

        if (criteria.isCriticalFailure && response === 'checked') {
          hasCriticalFailure = true;
          criticalFailures.push(criteria.name);
        } else if (criteria.type === 'sim_nao_na') {
          if (response === 'sim' || response === 'na') {
            partialScore += Number(criteria.weight);
          }
        } else if (criteria.type === 'score') {
          const scoreValue = Number(response) || 0;
          partialScore += scoreValue;
        }
      });
    });

    const finalScore = hasCriticalFailure ? 0 : partialScore;

    setEvaluationSummary({
      partialScore,
      finalScore,
      hasCriticalFailure,
      criticalFailures,
      totalPossiblePoints,
    });
  }, [responses, monitoringForm]);

  const handleResponseChange = (criteriaId: number, value: string) => {
    setResponses(prev => ({
      ...prev,
      [`criteria_${criteriaId}`]: value,
    }));
  };

  // Save evaluation mutation
  const saveEvaluationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/monitoring-evaluations', {
        monitoringSessionId,
        formId: monitoringForm.id,
        partialScore: evaluationSummary.partialScore,
        finalScore: evaluationSummary.finalScore,
        hasCriticalFailure: evaluationSummary.hasCriticalFailure,
        criticalFailureReason: evaluationSummary.criticalFailures.join(', '),
        observations: data.observations,
        responses: Object.entries(responses).map(([key, value]) => ({
          criteriaId: parseInt(key.replace('criteria_', '')),
          response: value,
          pointsEarned: calculatePointsForResponse(key, value),
        })),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Avaliação salva",
        description: "A ficha de monitoria foi salva com sucesso.",
      });
      onEvaluationSaved?.(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring-sessions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const calculatePointsForResponse = (criteriaKey: string, response: string): number => {
    const criteriaId = parseInt(criteriaKey.replace('criteria_', ''));
    const criteria = monitoringForm?.sections
      ?.flatMap((s: any) => s.criteria)
      ?.find((c: any) => c.id === criteriaId);

    if (!criteria) return 0;

    if (criteria.isCriticalFailure && response === 'checked') {
      return 0;
    } else if (criteria.type === 'sim_nao_na') {
      return response === 'sim' || response === 'na' ? Number(criteria.weight) : 0;
    } else if (criteria.type === 'score') {
      return Number(response) || 0;
    }

    return 0;
  };

  const onSubmit = (data: any) => {
    // Validate that all required criteria have responses
    const missingResponses = monitoringForm?.sections
      ?.flatMap((s: any) => s.criteria)
      ?.filter((c: any) => c.isRequired && !responses[`criteria_${c.id}`]);

    if (missingResponses?.length > 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, responda todos os critérios obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    saveEvaluationMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando ficha de monitoria...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!monitoringForm && !isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma ficha encontrada</h3>
            <p className="text-muted-foreground">
              Não foi possível carregar a ficha de monitoria.
            </p>
            {error && (
              <p className="text-red-500 text-xs mt-2">
                Erro: {error.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Evaluation Summary */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Resumo da Avaliação</span>
            <Badge variant={evaluationSummary.hasCriticalFailure ? "destructive" : "default"}>
              Nota: {evaluationSummary.finalScore.toFixed(1)}/{evaluationSummary.totalPossiblePoints}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Pontuação Parcial</p>
              <p className="text-2xl font-bold text-blue-600">
                {evaluationSummary.partialScore.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pontuação Final</p>
              <p className={`text-2xl font-bold ${
                evaluationSummary.hasCriticalFailure ? 'text-red-600' : 'text-green-600'
              }`}>
                {evaluationSummary.finalScore.toFixed(1)}
              </p>
            </div>
          </div>

          <Progress 
            value={(evaluationSummary.finalScore / evaluationSummary.totalPossiblePoints) * 100} 
            className="h-3"
          />

          {evaluationSummary.hasCriticalFailure && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center mb-2">
                <XCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="font-semibold text-red-800">Falha Grave Detectada</span>
              </div>
              <p className="text-sm text-red-700">
                A nota foi zerada devido às seguintes falhas graves:
              </p>
              <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                {evaluationSummary.criticalFailures.map((failure, index) => (
                  <li key={index}>{failure}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Evaluation Sections */}
          {monitoringForm.sections?.map((section: any) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="text-lg">{section.name}</CardTitle>
                {section.description && (
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {section.criteria?.map((criteria: any) => (
                  <div key={criteria.id} className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="text-sm font-medium">
                          {criteria.name}
                          {criteria.isRequired && <span className="text-red-500 ml-1">*</span>}
                          {criteria.isCriticalFailure && (
                            <Badge variant="destructive" className="ml-2 text-xs">ZERA</Badge>
                          )}
                        </label>
                        {criteria.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {criteria.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {criteria.weight} pts
                      </Badge>
                    </div>

                    {/* Render different input types based on criteria type */}
                    {criteria.type === 'sim_nao_na' && (
                      <RadioGroup
                        value={responses[`criteria_${criteria.id}`] || ''}
                        onValueChange={(value) => handleResponseChange(criteria.id, value)}
                        className="flex space-x-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id={`${criteria.id}_sim`} />
                          <label htmlFor={`${criteria.id}_sim`} className="text-sm cursor-pointer">
                            Sim
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id={`${criteria.id}_nao`} />
                          <label htmlFor={`${criteria.id}_nao`} className="text-sm cursor-pointer">
                            Não
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="na" id={`${criteria.id}_na`} />
                          <label htmlFor={`${criteria.id}_na`} className="text-sm cursor-pointer">
                            Não se aplica
                          </label>
                        </div>
                      </RadioGroup>
                    )}

                    {criteria.type === 'checkbox' && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={responses[`criteria_${criteria.id}`] === 'checked'}
                          onCheckedChange={(checked) => 
                            handleResponseChange(criteria.id, checked ? 'checked' : 'unchecked')
                          }
                        />
                        <label className="text-sm cursor-pointer">
                          Marcar se aplicável
                        </label>
                      </div>
                    )}

                    {criteria.type === 'score' && (
                      <Select
                        value={responses[`criteria_${criteria.id}`] || ''}
                        onValueChange={(value) => handleResponseChange(criteria.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Nota" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: Math.ceil(Number(criteria.weight)) + 1 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Separator className="my-3" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Observations */}
          <Card>
            <CardHeader>
              <CardTitle>Observações Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentários sobre a avaliação</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Adicione observações relevantes sobre o atendimento..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {evaluationSummary.hasCriticalFailure ? (
                <span className="text-red-600 font-medium">
                  ⚠️ Avaliação zerada por falha grave
                </span>
              ) : (
                <span>
                  Pontuação: {evaluationSummary.finalScore.toFixed(1)}/{evaluationSummary.totalPossiblePoints}
                </span>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                disabled={saveEvaluationMutation.isPending}
              >
                <FileDown className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              
              <Button
                type="submit"
                disabled={saveEvaluationMutation.isPending}
              >
                {saveEvaluationMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Avaliação
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}