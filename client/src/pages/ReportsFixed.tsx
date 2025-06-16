import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Star, TrendingUp, AlertTriangle, Users } from "lucide-react";
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
  criticalWords: Array<{
    word: string;
    count: number;
    lastDetected: string;
  }>;
}

export default function Reports() {
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedEvaluator, setSelectedEvaluator] = useState("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/reports/data'],
    staleTime: 300000,
  });

  const reportData: ReportData = (data as ReportData) || {
    general: {
      totalEvaluations: 0,
      averageScore: 0,
      approvalRate: 0,
      criticalIncidents: 0,
      unsignedForms: 0,
      contestedEvaluations: 0
    },
    agentPerformance: [],
    criticalWords: []
  };

  const handleExportReport = async (format: 'pdf' | 'excel') => {
    try {
      if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        
        // Cabeçalho
        doc.setFontSize(18);
        doc.text('Relatório Completo de Monitoria', 20, 20);
        doc.setFontSize(12);
        doc.text('AKIG Solutions - Sistema de Monitoria', 20, 30);
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
        
        doc.save(`relatorio-monitoria-${new Date().toISOString().split('T')[0]}.pdf`);
        
      } else {
        const { utils, writeFile } = await import('xlsx');
        const workbook = utils.book_new();
        
        // Aba: Métricas Gerais
        const generalData = [
          ['Métrica', 'Valor'],
          ['Total de Avaliações', reportData.general.totalEvaluations],
          ['Pontuação Média', reportData.general.averageScore.toFixed(2)],
          ['Taxa de Aprovação (%)', reportData.general.approvalRate],
          ['Incidentes Críticos', reportData.general.criticalIncidents],
          ['Formulários Não Assinados', reportData.general.unsignedForms],
          ['Avaliações Contestadas', reportData.general.contestedEvaluations]
        ];
        
        const generalSheet = utils.aoa_to_sheet(generalData);
        utils.book_append_sheet(workbook, generalSheet, 'Métricas Gerais');
        
        // Aba: Performance Agentes
        if (reportData.agentPerformance.length > 0) {
          const performanceHeaders = ['Agente', 'Pontuação Média', 'Avaliações', 'Aprovação %'];
          const performanceRows = reportData.agentPerformance.map(agent => [
            agent.name,
            agent.score.toFixed(2),
            agent.evaluations,
            agent.approvalRate || 0
          ]);
          
          const performanceData = [performanceHeaders, ...performanceRows];
          const performanceSheet = utils.aoa_to_sheet(performanceData);
          utils.book_append_sheet(workbook, performanceSheet, 'Performance Agentes');
        }
        
        writeFile(workbook, `relatorio-monitoria-${new Date().toISOString().split('T')[0]}.xlsx`);
      }
      
      toast({
        title: "Relatório exportado",
        description: `Relatório ${format.toUpperCase()} gerado com dados completos`,
      });
      
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o relatório",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando relatórios...</div>;
  }

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

      {/* Filtros */}
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
                setSelectedCampaign("");
                setSelectedEvaluator("");
              }}>
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principais */}
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

      {/* Performance por Agente */}
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

      {/* Palavras Críticas */}
      <Card>
        <CardHeader>
          <CardTitle>Palavras Críticas Detectadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reportData.criticalWords.length > 0 ? (
              reportData.criticalWords.map((word, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <span className="font-medium">{word.word}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium">{word.count} ocorrências</span>
                    <p className="text-xs text-muted-foreground">Última: {word.lastDetected}</p>
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