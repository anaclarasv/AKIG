import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, FileText, Filter, TrendingUp, Users, Star, AlertTriangle } from "lucide-react";
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
  const { toast } = useToast();

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
    agentPerformance: [],
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
      // Buscar dados frescos da API para garantir que são reais
      const response = await fetch('/api/reports/data');
      if (!response.ok) {
        throw new Error('Falha ao buscar dados atualizados');
      }
      const freshData = await response.json();
      
      console.log('Dados frescos da API para exportação:', freshData);
      
      if (!freshData || !freshData.general) {
        toast({
          title: "Erro na exportação",
          description: "Não foi possível obter dados atualizados do sistema.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Exportando', format, 'com dados atualizados:', {
        totalEvals: freshData.general.totalEvaluations,
        avgScore: freshData.general.averageScore,
        agentsCount: freshData.agentPerformance?.length || 0
      });

      if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        
        // Cabeçalho conforme modelo solicitado
        doc.setFontSize(20);
        doc.text('📄 Relatório Completo de Monitoria', 105, 20, { align: 'center' });
        doc.setFontSize(14);
        doc.text('Empresa: AKIG Solutions', 105, 30, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, 105, 40, { align: 'center' });
        
        let yPosition = 60;
        
        // 📊 Métricas Gerais - usando dados reais do sistema
        doc.setFontSize(16);
        doc.text('📊 Métricas Gerais', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(12);
        const realMetrics = [
          `Total de Avaliações: ${freshData.general.totalEvaluations}`,
          `Pontuação Média: ${freshData.general.averageScore.toFixed(1)}`,
          `Taxa de Aprovação: ${freshData.general.approvalRate}%`,
          `Incidentes Críticos: ${freshData.general.criticalIncidents}`,
          `Formulários Pendentes: ${freshData.general.unsignedForms}`,
          `Contestações em Análise: ${freshData.general.contestedEvaluations}`
        ];
        
        realMetrics.forEach((metric) => {
          doc.text(metric, 25, yPosition);
          yPosition += 8;
        });
        
        yPosition += 15;
        
        // 👥 Performance por Agente - tabela estruturada
        if (freshData.agentPerformance && freshData.agentPerformance.length > 0) {
          doc.setFontSize(16);
          doc.text('👥 Performance por Agente', 20, yPosition);
          yPosition += 15;
          
          // Cabeçalho da tabela
          doc.setFontSize(10);
          doc.text('Nome do Agente', 20, yPosition);
          doc.text('Avaliações', 70, yPosition);
          doc.text('Média', 105, yPosition);
          doc.text('Aprovados', 125, yPosition);
          doc.text('Reprovados', 155, yPosition);
          doc.text('Taxa', 185, yPosition);
          yPosition += 8;
          
          // Linha separadora
          doc.line(20, yPosition, 200, yPosition);
          yPosition += 5;
          
          // Dados dos agentes
          freshData.agentPerformance.slice(0, 15).forEach((agent) => {
            if (yPosition > 260) {
              doc.addPage();
              yPosition = 20;
            }
            
            const aprovados = Math.round((agent.evaluations || 0) * (agent.approvalRate || 0) / 100);
            const reprovados = (agent.evaluations || 0) - aprovados;
            
            doc.text(agent.name.substring(0, 18), 20, yPosition);
            doc.text((agent.evaluations || 0).toString(), 70, yPosition);
            doc.text((agent.score || 0).toFixed(1), 105, yPosition);
            doc.text(aprovados.toString(), 125, yPosition);
            doc.text(reprovados.toString(), 155, yPosition);
            doc.text(`${agent.approvalRate || 0}%`, 185, yPosition);
            yPosition += 7;
          });
        }
        
        yPosition += 15;
        
        // 📌 Observações Gerais
        doc.setFontSize(16);
        doc.text('📌 Observações Gerais', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(11);
        const observacoes = [
          `A maior parte das ${freshData.general.totalEvaluations} avaliações foram positivas.`,
          `${freshData.general.criticalIncidents} incidentes críticos foram identificados e encaminhados.`,
          `Taxa geral de aprovação está em ${freshData.general.approvalRate}%.`,
          `Acompanhar ${freshData.general.unsignedForms} formulários pendentes de assinatura.`
        ];
        
        observacoes.forEach((obs) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(obs, 25, yPosition);
          yPosition += 8;
        });
        
        // Rodapé
        doc.setFontSize(8);
        doc.text('AKIG Solutions - Relatório Gerado com Dados Reais do Sistema', 105, 285, { align: 'center' });
        
        doc.save(`relatorio-monitoria-${new Date().toISOString().split('T')[0]}.pdf`);
        
      } else {
        // 📥 Excel seguindo o modelo solicitado
        const { utils, writeFile } = await import('xlsx');
        const workbook = utils.book_new();
        
        // Planilha 1: Métricas Gerais (conforme modelo)
        const metricsData = [
          ['Métrica', 'Valor'],
          ['Total de Avaliações', freshData.general.totalEvaluations],
          ['Pontuação Média', freshData.general.averageScore.toFixed(1)],
          ['Taxa de Aprovação', `${freshData.general.approvalRate}%`],
          ['Incidentes Críticos', freshData.general.criticalIncidents],
          ['Formulários Pendentes', freshData.general.unsignedForms],
          ['Contestações', freshData.general.contestedEvaluations]
        ];
        
        const metricsSheet = utils.aoa_to_sheet(metricsData);
        utils.book_append_sheet(workbook, metricsSheet, 'Métricas Gerais');
        
        // Planilha 2: Performance por Agente (conforme modelo)
        if (freshData.agentPerformance && freshData.agentPerformance.length > 0) {
          const agentHeaders = ['Nome', 'Avaliações', 'Média', 'Aprovados', 'Reprovados', 'Taxa de Aprovação'];
          const agentData = [
            agentHeaders,
            ...freshData.agentPerformance.map(agent => {
              const aprovados = Math.round((agent.evaluations || 0) * (agent.approvalRate || 0) / 100);
              const reprovados = (agent.evaluations || 0) - aprovados;
              
              return [
                agent.name,
                agent.evaluations || 0,
                (agent.score || 0).toFixed(1),
                aprovados,
                reprovados,
                `${agent.approvalRate || 0}%`
              ];
            })
          ];
          
          const agentSheet = utils.aoa_to_sheet(agentData);
          utils.book_append_sheet(workbook, agentSheet, 'Performance por Agente');
        }
        
        // Planilha 3: Informações do Relatório
        const infoData = [
          ['Relatório de Monitoria - AKIG Solutions', ''],
          ['Data de Geração', new Date().toLocaleDateString('pt-BR')],
          ['Hora de Geração', new Date().toLocaleTimeString('pt-BR')],
          ['Fonte dos Dados', 'Sistema AKIG Solutions - Dados Reais'],
          ['Total de Registros', fetchedReportData.general.totalEvaluations],
          ['Status do Sistema', 'Operacional']
        ];
        
        const infoSheet = utils.aoa_to_sheet(infoData);
        utils.book_append_sheet(workbook, infoSheet, 'Informações');
        
        writeFile(workbook, `relatorio-monitoria-${new Date().toISOString().split('T')[0]}.xlsx`);
      }

      toast({
        title: "Relatório exportado com sucesso",
        description: `Relatório ${format.toUpperCase()} gerado com dados reais extraídos do sistema`,
      });
      
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o relatório com dados reais.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Relatórios e Análises</h1>
        <div className="flex gap-2">
          <Button onClick={() => handleExportReport('pdf')} className="bg-red-600 hover:bg-red-700">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Button onClick={() => handleExportReport('excel')} className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Campanha</label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as campanhas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as campanhas</SelectItem>
                  <SelectItem value="suporte">Suporte</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Avaliador</label>
              <Select value={selectedEvaluator} onValueChange={setSelectedEvaluator}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os avaliadores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os avaliadores</SelectItem>
                  <SelectItem value="joao">João Avaliador</SelectItem>
                  <SelectItem value="ana">Ana Avaliadora</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={() => {
                setDateRange(undefined);
                setSelectedCampaign("");
                setSelectedEvaluator("");
              }}>
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.general.totalEvaluations}</div>
            <p className="text-xs text-muted-foreground">Avaliações realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pontuação Média</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.general.averageScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Média geral de performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.general.approvalRate}%</div>
            <p className="text-xs text-muted-foreground">Avaliações com nota ≥ 7.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidentes Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{reportData.general.criticalIncidents}</div>
            <p className="text-xs text-muted-foreground">Falhas críticas detectadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formulários Pendentes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{reportData.general.unsignedForms}</div>
            <p className="text-xs text-muted-foreground">Aguardando assinatura</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contestações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{reportData.general.contestedEvaluations}</div>
            <p className="text-xs text-muted-foreground">Em análise</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Agent */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Agente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.agentPerformance.length > 0 ? (
              reportData.agentPerformance.map((agent, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{agent.name}</h4>
                    <p className="text-sm text-muted-foreground">{agent.evaluations} avaliações</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{agent.score.toFixed(1)}</div>
                    <p className="text-sm text-muted-foreground">{agent.approvalRate}% aprovação</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Nenhum dado de performance disponível
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Critical Words */}
      <Card>
        <CardHeader>
          <CardTitle>Palavras Críticas Detectadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reportData.criticalWords.length > 0 ? (
              reportData.criticalWords.map((wordData, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <span className="font-medium">{wordData.word}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium">{wordData.frequency} ocorrências</span>
                    <p className="text-xs text-muted-foreground">Tendência: {wordData.trend}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma palavra crítica detectada
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}