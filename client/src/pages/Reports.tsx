import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, FileText, Filter, TrendingUp, Users, Star, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReportData {
  general: {
    totalEvaluations: number;
    averageScore: number;
    approvalRate: number;
    criticalIncidents: number;
    unsignedForms: number;
    contestedEvaluations: number;
  };
  agentPerformance: Array<{
    name: string;
    score: number;
    evaluations: number;
    approvalRate: number;
    incidents: number;
  }>;
  byPeriod: Array<{
    period: string;
    evaluations: number;
    avgScore: number;
    criticalIncidents: number;
  }>;
  byCampaign: Array<{
    name: string;
    evaluations: number;
    avgScore: number;
    criticalIncidents: number;
  }>;
  byEvaluator: Array<{
    name: string;
    evaluations: number;
    avgScore: number;
    consistency: number;
  }>;
  criticalWords: Array<{
    word: string;
    frequency: number;
    trend: string;
  }>;
  scoreDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
    color: string;
  }>;
}

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [selectedEvaluator, setSelectedEvaluator] = useState<string>("");

  // Remove dependency on DashboardMetrics interface

  // Fetch real report data from database
  const { data: fetchedReportData, isLoading: isLoadingReportData } = useQuery<ReportData>({
    queryKey: ["/api/reports/data", { 
      startDate: dateRange?.from?.toISOString(), 
      endDate: dateRange?.to?.toISOString(), 
      campaign: selectedCampaign, 
      evaluator: selectedEvaluator 
    }],
    enabled: true
  });

  // Show loading state while fetching data
  if (isLoadingReportData) {
    return (
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Relatórios e Análises</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Carregando dados dos relatórios...</span>
        </div>
      </div>
    );
  }

  // Use real report data from API, with proper fallback structure
  const reportData: ReportData = fetchedReportData || {
    general: {
      totalEvaluations: 0,
      averageScore: 0,
      approvalRate: 0,
      criticalIncidents: 0,
      unsignedForms: 0,
      contestedEvaluations: 0
    },
    byPeriod: [],
    byCampaign: [],
    byEvaluator: [],
    criticalWords: [],
    scoreDistribution: [
      { range: "9.0 - 10.0", count: 0, percentage: 0, color: "#22c55e" },
      { range: "8.0 - 8.9", count: 0, percentage: 0, color: "#84cc16" },
      { range: "7.0 - 7.9", count: 0, percentage: 0, color: "#eab308" },
      { range: "6.0 - 6.9", count: 0, percentage: 0, color: "#f97316" },
      { range: "5.0 - 5.9", count: 0, percentage: 0, color: "#ef4444" }
    ]
  };

  const handleExportReport = async (format: 'pdf' | 'excel') => {
    try {
      // Buscar dados detalhados das avaliações para o relatório
      const evaluationsResponse = await apiRequest('GET', '/api/evaluations/detailed');
      const evaluationsData = await evaluationsResponse.json();
      
      const sessionsResponse = await apiRequest('GET', '/api/monitoring-sessions/detailed');
      const sessionsData = await sessionsResponse.json();
      
      if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        
        // Cabeçalho do relatório
        doc.setFontSize(18);
        doc.text('Relatório Completo de Monitoria', 20, 20);
        doc.setFontSize(12);
        doc.text('AKIG Solutions - Sistema de Monitoria de Atendimento', 20, 30);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 40);
        
        let yPosition = 60;
        
        // Métricas gerais
        doc.setFontSize(14);
        doc.text('Métricas Gerais', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(10);
        doc.text(`Total de Avaliações: ${reportData.general.totalEvaluations}`, 20, yPosition);
        doc.text(`Pontuação Média: ${reportData.general.averageScore.toFixed(1)}`, 20, yPosition + 10);
        doc.text(`Taxa de Aprovação: ${reportData.general.approvalRate}%`, 20, yPosition + 20);
        doc.text(`Incidentes Críticos: ${reportData.general.criticalIncidents}`, 20, yPosition + 30);
        doc.text(`Formulários Pendentes: ${reportData.general.unsignedForms}`, 20, yPosition + 40);
        doc.text(`Contestações: ${reportData.general.contestedEvaluations}`, 20, yPosition + 50);
        
        yPosition += 70;
        
        // Performance por agente
        if (reportData.agentPerformance && reportData.agentPerformance.length > 0) {
          doc.setFontSize(14);
          doc.text('Performance por Agente', 20, yPosition);
          yPosition += 15;
          
          doc.setFontSize(10);
          reportData.agentPerformance.slice(0, 10).forEach((agent: any) => {
            doc.text(`${agent.name}: ${agent.score.toFixed(1)} (${agent.evaluations} avaliações)`, 20, yPosition);
            yPosition += 10;
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
          });
        }
        
        // Palavras críticas
        if (reportData.criticalWords && reportData.criticalWords.length > 0) {
          yPosition += 20;
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFontSize(14);
          doc.text('Palavras Críticas Detectadas', 20, yPosition);
          yPosition += 15;
          
          doc.setFontSize(10);
          reportData.criticalWords.slice(0, 15).forEach((word: any) => {
            doc.text(`${word.word}: ${word.count} ocorrências`, 20, yPosition);
            yPosition += 10;
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
          });
        }
        
        doc.save(`relatorio-monitoria-${new Date().toISOString().split('T')[0]}.pdf`);
        
      } else {
        const { utils, writeFile } = await import('xlsx');
        const workbook = utils.book_new();
        
        // Aba 1: Métricas Gerais
        const generalData = [
          ['Métrica', 'Valor'],
          ['Total de Avaliações', reportData.general.totalEvaluations],
          ['Pontuação Média', reportData.general.averageScore.toFixed(2)],
          ['Taxa de Aprovação (%)', reportData.general.approvalRate],
          ['Incidentes Críticos', reportData.general.criticalIncidents],
          ['Formulários Não Assinados', reportData.general.unsignedForms],
          ['Avaliações Contestadas', reportData.general.contestedEvaluations],
          ['Data do Relatório', new Date().toLocaleDateString('pt-BR')]
        ];
        
        const generalSheet = utils.aoa_to_sheet(generalData);
        utils.book_append_sheet(workbook, generalSheet, 'Métricas Gerais');
        
        // Aba 2: Avaliações Detalhadas
        if (evaluationsData && evaluationsData.length > 0) {
          const evaluationsHeaders = [
            'ID', 'Agente', 'Avaliador', 'Campanha', 'Canal', 'Data', 
            'Pontuação Final', 'Status', 'Observações', 'Assinado'
          ];
          
          const evaluationsRows = evaluationsData.map((evaluation: any) => [
            evaluation.id,
            evaluation.agentName || evaluation.agentId,
            evaluation.evaluatorName || evaluation.evaluatorId,
            evaluation.campaignName || 'N/A',
            evaluation.channelType || 'voice',
            new Date(evaluation.createdAt).toLocaleDateString('pt-BR'),
            evaluation.finalScore || 0,
            evaluation.status || 'pending',
            evaluation.observations || '',
            evaluation.agentSignature ? 'Sim' : 'Não'
          ]);
          
          const evaluationsData2D = [evaluationsHeaders, ...evaluationsRows];
          const evaluationsSheet = utils.aoa_to_sheet(evaluationsData2D);
          utils.book_append_sheet(workbook, evaluationsSheet, 'Avaliações Detalhadas');
        }
        
        // Aba 3: Performance por Agente
        if (reportData.agentPerformance && reportData.agentPerformance.length > 0) {
          const performanceHeaders = ['Agente', 'Pontuação Média', 'Avaliações', 'Aprovação %', 'Incidentes'];
          const performanceRows = reportData.agentPerformance.map((agent: any) => [
            agent.name,
            agent.score.toFixed(2),
            agent.evaluations,
            agent.approvalRate || 0,
            agent.incidents || 0
          ]);
          
          const performanceData2D = [performanceHeaders, ...performanceRows];
          const performanceSheet = utils.aoa_to_sheet(performanceData2D);
          utils.book_append_sheet(workbook, performanceSheet, 'Performance Agentes');
        }
        
        // Aba 4: Sessões de Monitoria
        if (sessionsData && sessionsData.length > 0) {
          const sessionsHeaders = [
            'ID', 'Agente', 'Campanha', 'Canal', 'Status', 'Data Criação',
            'Transcrição', 'Análise IA', 'Tempo Silêncio', 'Palavras Críticas'
          ];
          
          const sessionsRows = sessionsData.map((session: any) => [
            session.id,
            session.agentName || session.agentId,
            session.campaignName || 'N/A',
            session.channelType,
            session.status,
            new Date(session.createdAt).toLocaleDateString('pt-BR'),
            session.transcriptionText ? 'Sim' : 'Não',
            session.aiAnalysis ? 'Sim' : 'Não',
            session.silenceTime || 0,
            session.criticalWordsCount || 0
          ]);
          
          const sessionsData2D = [sessionsHeaders, ...sessionsRows];
          const sessionsSheet = utils.aoa_to_sheet(sessionsData2D);
          utils.book_append_sheet(workbook, sessionsSheet, 'Sessões Monitoria');
        }
        
        // Aba 5: Palavras Críticas
        if (reportData.criticalWords && reportData.criticalWords.length > 0) {
          const wordsHeaders = ['Palavra/Termo', 'Ocorrências', 'Última Detecção'];
          const wordsRows = reportData.criticalWords.map((word: any) => [
            word.word,
            word.count,
            word.lastDetected || 'N/A'
          ]);
          
          const wordsData2D = [wordsHeaders, ...wordsRows];
          const wordsSheet = utils.aoa_to_sheet(wordsData2D);
          utils.book_append_sheet(workbook, wordsSheet, 'Palavras Críticas');
        }
        
        writeFile(workbook, `relatorio-monitoria-completo-${new Date().toISOString().split('T')[0]}.xlsx`);
      }
      
      toast({
        title: "Relatório exportado",
        description: `Relatório ${format.toUpperCase()} gerado com dados completos das avaliações`,
      });
      
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setDateRange(undefined);
    setSelectedCampaign("");
    setSelectedEvaluator("");
  };

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Relatórios e Análises</h1>
      </div>

      {/* Filters Section */}
      <Card className="akig-card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Relatório
          </CardTitle>
          <CardDescription>
            Personalize o período e critérios para gerar relatórios específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Data inicial"
                />
                <input 
                  type="date" 
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Data final"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Campanha</label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as campanhas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as campanhas</SelectItem>
                  <SelectItem value="vendas">Vendas Digitais</SelectItem>
                  <SelectItem value="suporte">Suporte Técnico</SelectItem>
                  <SelectItem value="retencao">Retenção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Avaliador</label>
              <Select value={selectedEvaluator} onValueChange={setSelectedEvaluator}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os avaliadores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os avaliadores</SelectItem>
                  <SelectItem value="joao">João Avaliador</SelectItem>
                  <SelectItem value="ana">Ana Avaliadora</SelectItem>
                  <SelectItem value="pedro">Pedro Avaliador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={clearFilters} className="flex-1">
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="akig-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.general.totalEvaluations}</div>
            <p className="text-xs text-muted-foreground">
              Avaliações realizadas no período
            </p>
          </CardContent>
        </Card>

        <Card className="akig-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pontuação Média</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.general.averageScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Média geral de performance
            </p>
          </CardContent>
        </Card>

        <Card className="akig-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.general.approvalRate}%</div>
            <p className="text-xs text-muted-foreground">
              Avaliações com nota ≥ 7.0
            </p>
          </CardContent>
        </Card>

        <Card className="akig-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidentes Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{reportData.general.criticalIncidents}</div>
            <p className="text-xs text-muted-foreground">
              Falhas críticas detectadas
            </p>
          </CardContent>
        </Card>

        <Card className="akig-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formulários Pendentes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{reportData.general.unsignedForms}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando assinatura do agente
            </p>
          </CardContent>
        </Card>

        <Card className="akig-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contestações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{reportData.general.contestedEvaluations}</div>
            <p className="text-xs text-muted-foreground">
              Avaliações em contestação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Export Actions */}
      <div className="flex justify-end gap-4">
        <Button onClick={() => handleExportReport('pdf')} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
        <Button onClick={() => handleExportReport('excel')} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance by Campaign */}
        <Card className="akig-card-shadow">
          <CardHeader>
            <CardTitle>Performance por Campanha</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.byCampaign || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgScore" fill="#3b82f6" name="Pontuação Média" />
                <Bar dataKey="criticalIncidents" fill="#ef4444" name="Incidentes Críticos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance by Evaluator */}
        <Card className="akig-card-shadow">
          <CardHeader>
            <CardTitle>Performance por Avaliador</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.byEvaluator || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgScore" fill="#10b981" name="Pontuação Média" />
                <Bar dataKey="consistency" fill="#8b5cf6" name="Consistência %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend Analysis */}
        <Card className="akig-card-shadow">
          <CardHeader>
            <CardTitle>Evolução Temporal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.byPeriod || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgScore" stroke="#3b82f6" name="Pontuação Média" />
                <Line type="monotone" dataKey="criticalIncidents" stroke="#ef4444" name="Incidentes Críticos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Critical Words Analysis */}
        <Card className="akig-card-shadow">
          <CardHeader>
            <CardTitle>Palavras Críticas Detectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(reportData.criticalWords || []).map((word, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{word.word}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{word.frequency}x</Badge>
                    <Badge variant={word.trend.startsWith('+') ? 'destructive' : word.trend.startsWith('-') ? 'default' : 'secondary'}>
                      {word.trend}
                    </Badge>
                  </div>
                </div>
              ))}
              {reportData.criticalWords.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma palavra crítica detectada no período
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Distribution */}
      <Card className="akig-card-shadow">
        <CardHeader>
          <CardTitle>Distribuição de Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Visual Distribution Bars */}
            {(reportData.scoreDistribution || []).map((range, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium" style={{ color: range.color }}>
                    {range.range}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {range.count} avaliações ({range.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${range.percentage}%`,
                      backgroundColor: range.color 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}