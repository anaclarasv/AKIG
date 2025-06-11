import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

interface FormCriterion {
  id: string;
  name: string;
  description: string;
  type: 'sim_nao_na' | 'checkbox';
  weight: number;
  isCritical: boolean;
}

interface FormSection {
  id: string;
  name: string;
  criteria: FormCriterion[];
  totalWeight: number;
}

const evaluationForm: FormSection[] = [
  {
    id: "abertura",
    name: "Abertura do Atendimento",
    totalWeight: 20,
    criteria: [
      {
        id: "saudacao",
        name: "Saudação adequada e cordial",
        description: "Cumprimentou o cliente de forma profissional e amigável",
        type: "sim_nao_na",
        weight: 8,
        isCritical: false
      },
      {
        id: "identificacao",
        name: "Identificou-se corretamente",
        description: "Apresentou nome e empresa conforme protocolo",
        type: "sim_nao_na",
        weight: 7,
        isCritical: false
      },
      {
        id: "disponibilidade",
        name: "Demonstrou disponibilidade para ajudar",
        description: "Mostrou proatividade e interesse genuíno",
        type: "sim_nao_na",
        weight: 5,
        isCritical: false
      },
      {
        id: "linguagem_grosseira",
        name: "Utilizou linguagem grosseira ou inadequada",
        description: "Palavrões, gírias ou tratamento desrespeitoso",
        type: "checkbox",
        weight: 0,
        isCritical: true
      }
    ]
  },
  {
    id: "conducao",
    name: "Condução do Atendimento",
    totalWeight: 45,
    criteria: [
      {
        id: "escuta_ativa",
        name: "Escutou ativamente o cliente",
        description: "Demonstrou atenção plena às necessidades e preocupações",
        type: "sim_nao_na",
        weight: 12,
        isCritical: false
      },
      {
        id: "perguntas_assertivas",
        name: "Fez perguntas assertivas para entender o problema",
        description: "Conduziu investigação adequada da demanda",
        type: "sim_nao_na",
        weight: 10,
        isCritical: false
      },
      {
        id: "informacoes_claras",
        name: "Forneceu informações claras e precisas",
        description: "Explicações compreensíveis e corretas",
        type: "sim_nao_na",
        weight: 12,
        isCritical: false
      },
      {
        id: "tom_profissional",
        name: "Manteve tom de voz profissional",
        description: "Tom adequado durante toda a conversa",
        type: "sim_nao_na",
        weight: 6,
        isCritical: false
      },
      {
        id: "empatia",
        name: "Demonstrou empatia com a situação",
        description: "Mostrou compreensão e sensibilidade",
        type: "sim_nao_na",
        weight: 5,
        isCritical: false
      },
      {
        id: "grosseria",
        name: "Demonstrou grosseria, impaciência ou desrespeito",
        description: "Comportamento inadequado que prejudica a experiência",
        type: "checkbox",
        weight: 0,
        isCritical: true
      }
    ]
  },
  {
    id: "encerramento",
    name: "Encerramento",
    totalWeight: 20,
    criteria: [
      {
        id: "confirmou_resolucao",
        name: "Confirmou se a demanda foi resolvida",
        description: "Verificou satisfação e resolução completa",
        type: "sim_nao_na",
        weight: 8,
        isCritical: false
      },
      {
        id: "ajuda_adicional",
        name: "Ofereceu ajuda adicional",
        description: "Perguntou se precisava de mais alguma coisa",
        type: "sim_nao_na",
        weight: 5,
        isCritical: false
      },
      {
        id: "agradecimento",
        name: "Agradeceu pelo contato",
        description: "Demonstrou gratidão pela oportunidade",
        type: "sim_nao_na",
        weight: 4,
        isCritical: false
      },
      {
        id: "despedida",
        name: "Despediu-se adequadamente",
        description: "Encerramento cordial e profissional",
        type: "sim_nao_na",
        weight: 3,
        isCritical: false
      },
      {
        id: "encerramento_abrupto",
        name: "Encerrou abruptamente sem despedida",
        description: "Finalizou a ligação de forma inadequada",
        type: "checkbox",
        weight: 0,
        isCritical: true
      }
    ]
  },
  {
    id: "aspectos_tecnicos",
    name: "Aspectos Técnicos",
    totalWeight: 15,
    criteria: [
      {
        id: "conhecimento_tecnico",
        name: "Demonstrou conhecimento técnico adequado",
        description: "Mostrou domínio sobre produtos/serviços/procedimentos",
        type: "sim_nao_na",
        weight: 8,
        isCritical: false
      },
      {
        id: "protocolos",
        name: "Seguiu protocolos e procedimentos corretos",
        description: "Aderiu às normas estabelecidas pela empresa",
        type: "sim_nao_na",
        weight: 7,
        isCritical: false
      },
      {
        id: "informacoes_incorretas",
        name: "Forneceu informações incorretas ou enganosas",
        description: "Passou dados errados que podem prejudicar o cliente",
        type: "checkbox",
        weight: 0,
        isCritical: true
      }
    ]
  }
];

export default function SimpleTestForm() {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [comments, setComments] = useState("");
  const [showResults, setShowResults] = useState(false);

  const handleResponse = (criterionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [criterionId]: value }));
  };

  const calculateScore = () => {
    let totalScore = 0;
    let hasCriticalFailure = false;

    // Verificar falhas críticas
    evaluationForm.forEach(section => {
      section.criteria.forEach(criterion => {
        if (criterion.isCritical && responses[criterion.id] === "true") {
          hasCriticalFailure = true;
        }
      });
    });

    if (hasCriticalFailure) {
      return { score: 0, breakdown: "ZERA - Falha crítica detectada" };
    }

    // Calcular pontuação normal
    const breakdown: string[] = [];
    evaluationForm.forEach(section => {
      let sectionScore = 0;
      section.criteria.forEach(criterion => {
        if (!criterion.isCritical) {
          const response = responses[criterion.id];
          if (response === "sim" || response === "na") {
            sectionScore += criterion.weight;
          }
        }
      });
      breakdown.push(`${section.name}: ${sectionScore}/${section.totalWeight} pts`);
      totalScore += sectionScore;
    });

    return { score: totalScore, breakdown: breakdown.join(" | ") };
  };

  const { score, breakdown } = calculateScore();

  const renderCriterion = (criterion: FormCriterion) => {
    if (criterion.type === "checkbox") {
      return (
        <div key={criterion.id} className="space-y-2 p-3 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <Checkbox
              id={criterion.id}
              checked={responses[criterion.id] === "true"}
              onCheckedChange={(checked) => 
                handleResponse(criterion.id, checked ? "true" : "false")
              }
            />
            <div className="flex-1">
              <Label htmlFor={criterion.id} className="text-red-800 font-medium">
                ❌ ZERA: {criterion.name}
              </Label>
              <p className="text-sm text-red-600 mt-1">{criterion.description}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={criterion.id} className="space-y-3 p-3 border rounded-lg">
        <div>
          <h4 className="font-medium">{criterion.name} ({criterion.weight} pts)</h4>
          <p className="text-sm text-muted-foreground">{criterion.description}</p>
        </div>
        <RadioGroup
          value={responses[criterion.id] || ""}
          onValueChange={(value) => handleResponse(criterion.id, value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="sim" id={`${criterion.id}-sim`} />
            <Label htmlFor={`${criterion.id}-sim`} className="text-green-600">Sim</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="nao" id={`${criterion.id}-nao`} />
            <Label htmlFor={`${criterion.id}-nao`} className="text-red-600">Não</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="na" id={`${criterion.id}-na`} />
            <Label htmlFor={`${criterion.id}-na`} className="text-blue-600">Não se aplica</Label>
          </div>
        </RadioGroup>
      </div>
    );
  };

  const handleSubmit = () => {
    setShowResults(true);
    alert(`Avaliação finalizada!\nPontuação: ${score}/100\nDetalhes: ${breakdown}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ficha de Monitoria Dinâmica - Demonstração</h1>
          <p className="text-muted-foreground">Sistema de avaliação com 100 pontos otimizado</p>
        </div>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pontuação Atual: {score}/100</CardTitle>
              <div className="flex items-center space-x-2">
                {score === 0 && Object.keys(responses).length > 0 ? (
                  <Badge variant="destructive">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    ZERA
                  </Badge>
                ) : (
                  <Badge variant={score >= 80 ? "default" : score >= 60 ? "secondary" : "destructive"}>
                    {score >= 80 ? "Excelente" : score >= 60 ? "Bom" : "Precisa Melhorar"}
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={score} className="h-2" />
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-6">
        {evaluationForm.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {section.name}
                <Badge variant="outline">{section.totalWeight} pontos</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.criteria.map(renderCriterion)}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Comentários Adicionais</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Observações e feedbacks sobre o atendimento..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => {
            setResponses({});
            setComments("");
            setShowResults(false);
          }}>
            Limpar Formulário
          </Button>
          <Button onClick={handleSubmit}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Finalizar Avaliação
          </Button>
        </div>
      </div>
    </div>
  );
}