import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  User,
  MessageSquare,
  BarChart3
} from "lucide-react";

interface DetectionResult {
  category: string;
  keywords: string[];
  count: number;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

interface KeywordAnalysis {
  overallScore: number;
  sentiment: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  detections: DetectionResult[];
  recommendations: string[];
  criticalIssues: string[];
}

interface KeywordAnalysisPanelProps {
  analysis?: {
    keywordAnalysis?: KeywordAnalysis;
    temperatureScore?: number;
    qualityLevel?: string;
    detectedCategories?: DetectionResult[];
    recommendations?: string[];
    criticalIssues?: string[];
  };
}

const getSentimentColor = (sentiment: string) => {
  switch (sentiment) {
    case 'excellent': return 'text-green-600 dark:text-green-400';
    case 'good': return 'text-blue-600 dark:text-blue-400';
    case 'average': return 'text-yellow-600 dark:text-yellow-400';
    case 'poor': return 'text-orange-600 dark:text-orange-400';
    case 'critical': return 'text-red-600 dark:text-red-400';
    default: return 'text-gray-600 dark:text-gray-400';
  }
};

const getSentimentIcon = (sentiment: string) => {
  switch (sentiment) {
    case 'excellent': return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'good': return <TrendingUp className="h-5 w-5 text-blue-600" />;
    case 'average': return <BarChart3 className="h-5 w-5 text-yellow-600" />;
    case 'poor': return <TrendingDown className="h-5 w-5 text-orange-600" />;
    case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
    default: return <MessageSquare className="h-5 w-5 text-gray-600" />;
  }
};

const getImpactBadgeVariant = (impact: string) => {
  switch (impact) {
    case 'positive': return 'default';
    case 'negative': return 'destructive';
    default: return 'secondary';
  }
};

export default function KeywordAnalysisPanel({ analysis }: KeywordAnalysisPanelProps) {
  if (!analysis?.keywordAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Análise de Palavras-Chave
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Análise avançada será exibida após a transcrição ser concluída.
          </p>
        </CardContent>
      </Card>
    );
  }

  const keywordAnalysis = analysis.keywordAnalysis;
  const temperatureScore = analysis.temperatureScore || keywordAnalysis.overallScore;
  const qualityLevel = analysis.qualityLevel || keywordAnalysis.sentiment;

  return (
    <div className="space-y-4">
      {/* Score Geral e Termômetro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Termômetro de Qualidade do Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getSentimentIcon(qualityLevel)}
              <span className={`text-lg font-semibold ${getSentimentColor(qualityLevel)}`}>
                {temperatureScore.toFixed(1)}/100
              </span>
            </div>
            <Badge variant={temperatureScore >= 70 ? "default" : temperatureScore >= 50 ? "secondary" : "destructive"}>
              {qualityLevel.toUpperCase()}
            </Badge>
          </div>
          
          <Progress 
            value={temperatureScore} 
            className="h-3"
          />
          
          <div className="grid grid-cols-5 text-xs text-muted-foreground gap-2">
            <div className="text-center">Crítico<br/>0-25</div>
            <div className="text-center">Ruim<br/>25-45</div>
            <div className="text-center">Regular<br/>45-65</div>
            <div className="text-center">Bom<br/>65-80</div>
            <div className="text-center">Excelente<br/>80-100</div>
          </div>
        </CardContent>
      </Card>

      {/* Questões Críticas */}
      {keywordAnalysis.criticalIssues && keywordAnalysis.criticalIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Questões Críticas Detectadas</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {keywordAnalysis.criticalIssues.map((issue, index) => (
                <li key={index} className="text-sm">{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Categorias Detectadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Categorias Detectadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {keywordAnalysis.detections.map((detection, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{detection.category}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant={getImpactBadgeVariant(detection.impact)}>
                      {detection.impact === 'positive' ? '+' : detection.impact === 'negative' ? '-' : '='}{Math.abs(detection.weight)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {detection.count}x
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-2">
                  {detection.keywords.map((keyword, kwIndex) => (
                    <Badge key={kwIndex} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Confiança: {detection.confidence}%</span>
                </div>
              </div>
            ))}
            
            {keywordAnalysis.detections.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma categoria específica detectada nesta transcrição.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recomendações */}
      {keywordAnalysis.recommendations && keywordAnalysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recomendações de Melhoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {keywordAnalysis.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas Detalhadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Estatísticas da Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Categorias Detectadas:</span>
              <div className="font-medium">{keywordAnalysis.detections.length}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Palavras-Chave Totais:</span>
              <div className="font-medium">
                {keywordAnalysis.detections.reduce((sum, d) => sum + d.count, 0)}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Impacto Positivo:</span>
              <div className="font-medium text-green-600">
                {keywordAnalysis.detections.filter(d => d.impact === 'positive').length}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Impacto Negativo:</span>
              <div className="font-medium text-red-600">
                {keywordAnalysis.detections.filter(d => d.impact === 'negative').length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}