import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  FileBarChart, 
  Download, 
  FileText, 
  PieChart, 
  TrendingUp, 
  AlertTriangle,
  Users,
  Clock,
  Filter
} from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { DateRange } from "react-day-picker";
import type { DashboardMetrics } from "@/types";

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedEvaluator, setSelectedEvaluator] = useState<string>("all");
  const [reportType, setReportType] = useState("general");

  const { data: metrics } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
  });

  // Mock data for reports - in real app this would come from API with filters
  const reportData = {
    general: {
      totalEvaluations: 247,
      averageScore: 8.2,
      approvalRate: 85,
      criticalIncidents: 12,
      unsignedForms: 7,
      contestedEvaluations: 3
    },
    byPeriod: [
      { period: "Jan 2024", evaluations: 45, avgScore: 8.1, criticalIncidents: 2 },
      { period: "Fev 2024", evaluations: 52, avgScore: 8.3, criticalIncidents: 1 },
      { period: "Mar 2024", evaluations: 48, avgScore: 8.0, criticalIncidents: 3 }
    ],
    byCampaign: [
      { name: "Vendas Digitais", evaluations: 89, avgScore: 8.5, criticalIncidents: 4 },
      { name: "Suporte Técnico", evaluations: 76, avgScore: 7.8, criticalIncidents: 5 },
      { name: "Retenção", evaluations: 82, avgScore: 8.1, criticalIncidents: 3 }
    ],
    byEvaluator: [
      { name: "João Avaliador", evaluations: 95, avgScore: 8.3, consistency: 92 },
      { name: "Ana Avaliadora", evaluations: 87, avgScore: 8.1, consistency: 88 },
      { name: "Pedro Avaliador", evaluations: 65, avgScore: 8.0, consistency: 85 }
    ],
    criticalWords: [
      { word: "absurdo", frequency: 8, trend: "+2" },
      { word: "incompetente", frequency: 5, trend: "-1" },
      { word: "ridículo", frequency: 3, trend: "0" }
    ],
    scoreDistribution: [
      { range: "9.0 - 10.0", count: 45, percentage: 32.6, color: "#22c55e" },
      { range: "8.0 - 8.9", count: 38, percentage: 27.5, color: "#84cc16" },
      { range: "7.0 - 7.9", count: 28, percentage: 20.3, color: "#eab308" },
      { range: "6.0 - 6.9", count: 19, percentage: 13.8, color: "#f97316" },
      { range: "5.0 - 5.9", count: 8, percentage: 5.8, color: "#ef4444" }
    ]
  };

  const handleExportReport = async (format: 'pdf' | 'excel') => {
    if (format === 'pdf') {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const element = document.getElementById('report-content');
      if (!element) return;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const today = new Date().toISOString().split('T')[0];
      pdf.save(`relatorio-akig-${today}.pdf`);
    } else if (format === 'excel') {
      const XLSX = await import('xlsx');
      
      const workbook = XLSX.utils.book_new();
      
      // Aba Geral
      const generalData = [
        ['Relatório AKIG Solutions', '', '', ''],
        ['Data:', new Date().toLocaleDateString('pt-BR'), '', ''],
        ['', '', '', ''],
        ['Visão Geral', '', '', ''],
        ['Total de Avaliações', reportData.general.totalEvaluations, '', ''],
        ['Média Geral', reportData.general.averageScore, '', ''],
        ['Taxa de Aprovação', `${reportData.general.approvalRate}%`, '', ''],
        ['', '', '', ''],
        ['Indicadores Críticos', '', '', ''],
        ['Incidentes Críticos', reportData.general.criticalIncidents, '', ''],
        ['Fichas Não Assinadas', reportData.general.unsignedForms, '', ''],
        ['Avaliações Contestadas', reportData.general.contestedEvaluations, '', ''],
      ];
      
      const generalSheet = XLSX.utils.aoa_to_sheet(generalData);
      XLSX.utils.book_append_sheet(workbook, generalSheet, 'Geral');
      
      // Aba Performance por Período
      const periodData = [
        ['Período', 'Avaliações', 'Média', 'Incidentes Críticos'],
        ...reportData.byPeriod.map(item => [
          item.period,
          item.evaluations,
          item.avgScore,
          item.criticalIncidents
        ])
      ];
      
      const periodSheet = XLSX.utils.aoa_to_sheet(periodData);
      XLSX.utils.book_append_sheet(workbook, periodSheet, 'Por Período');
      
      // Aba Performance por Campanha
      const campaignData = [
        ['Campanha', 'Avaliações', 'Média', 'Incidentes Críticos'],
        ...reportData.byCampaign.map(item => [
          item.name,
          item.evaluations,
          item.avgScore,
          item.criticalIncidents
        ])
      ];
      
      const campaignSheet = XLSX.utils.aoa_to_sheet(campaignData);
      XLSX.utils.book_append_sheet(workbook, campaignSheet, 'Por Campanha');
      
      // Aba Palavras Críticas
      const wordsData = [
        ['Palavra', 'Frequência', 'Tendência'],
        ...reportData.criticalWords.map(item => [
          item.word,
          item.frequency,
          item.trend
        ])
      ];
      
      const wordsSheet = XLSX.utils.aoa_to_sheet(wordsData);
      XLSX.utils.book_append_sheet(workbook, wordsSheet, 'Palavras Críticas');
      
      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `relatorio-akig-${today}.xlsx`);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getTrendIcon = (trend: string) => {
    if (trend.startsWith('+')) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (trend.startsWith('-')) return <TrendingUp className="w-4 h-4 text-green-500 rotate-180" />;
    return <span className="w-4 h-4 text-gray-500">—</span>;
  };

  return (
    <div className="p-6">
      <Header 
        title="Relatórios"
        subtitle="Análises e métricas de performance"
      />

      <div className="mt-6">
        {/* Filters */}
        <Card className="akig-card-shadow mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Período</label>
                <DatePickerWithRange
                  value={dateRange}
                  onChange={setDateRange}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Campanha</label>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Campanhas</SelectItem>
                    <SelectItem value="vendas">Vendas Digitais</SelectItem>
                    <SelectItem value="suporte">Suporte Técnico</SelectItem>
                    <SelectItem value="retencao">Retenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Avaliador</label>
                <Select value={selectedEvaluator} onValueChange={setSelectedEvaluator}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Avaliadores</SelectItem>
                    <SelectItem value="joao">João Avaliador</SelectItem>
                    <SelectItem value="ana">Ana Avaliadora</SelectItem>
                    <SelectItem value="pedro">Pedro Avaliador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end space-x-2">
                <Button variant="outline" className="flex-1">
                  Aplicar Filtros
                </Button>
                <Button variant="outline">
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={reportType} onValueChange={setReportType}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-auto grid-cols-4">
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="quality">Qualidade</TabsTrigger>
              <TabsTrigger value="trends">Tendências</TabsTrigger>
            </TabsList>

            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => handleExportReport('excel')}>
                <FileText className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button onClick={() => handleExportReport('pdf')} className="akig-bg-primary hover:opacity-90">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          <TabsContent value="general">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Summary Cards */}
              <Card className="akig-card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <FileBarChart className="w-5 h-5 mr-2" />
                    Visão Geral
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total de Avaliações:</span>
                      <span className="font-semibold">{reportData.general.totalEvaluations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Média Geral:</span>
                      <span className={`font-semibold ${getScoreColor(reportData.general.averageScore)}`}>
                        {reportData.general.averageScore}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa de Aprovação:</span>
                      <span className="font-semibold text-green-600">{reportData.general.approvalRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="akig-card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                    Indicadores Críticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Incidentes Críticos:</span>
                      <Badge className="bg-red-100 text-red-800">{reportData.general.criticalIncidents}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fichas Não Assinadas:</span>
                      <Badge className="bg-yellow-100 text-yellow-800">{reportData.general.unsignedForms}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avaliações Contestadas:</span>
                      <Badge className="bg-amber-100 text-amber-800">{reportData.general.contestedEvaluations}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="akig-card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Tempo Médio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Por Avaliação:</span>
                      <span className="font-semibold">12 min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Para Assinatura:</span>
                      <span className="font-semibold">2.5 horas</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resolução de Contestação:</span>
                      <span className="font-semibold">1.2 dias</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card className="akig-card-shadow">
                <CardHeader>
                  <CardTitle>Performance por Campanha</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData.byCampaign.map((campaign, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground">{campaign.evaluations} avaliações</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${getScoreColor(campaign.avgScore)}`}>
                            {campaign.avgScore}
                          </p>
                          <p className="text-xs text-red-600">{campaign.criticalIncidents} críticos</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="akig-card-shadow">
                <CardHeader>
                  <CardTitle>Performance por Avaliador</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData.byEvaluator.map((evaluator, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{evaluator.name}</p>
                          <p className="text-sm text-muted-foreground">{evaluator.evaluations} avaliações</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${getScoreColor(evaluator.avgScore)}`}>
                            {evaluator.avgScore}
                          </p>
                          <p className="text-xs text-blue-600">{evaluator.consistency}% consistência</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <Card className="akig-card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Análise de Performance por Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.byPeriod.map((period, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold">{period.period}</p>
                        <p className="text-sm text-muted-foreground">{period.evaluations} avaliações realizadas</p>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Média</p>
                          <p className={`font-bold text-lg ${getScoreColor(period.avgScore)}`}>
                            {period.avgScore}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Críticos</p>
                          <p className="font-bold text-lg text-red-600">{period.criticalIncidents}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="akig-card-shadow">
                <CardHeader>
                  <CardTitle>Palavras Críticas Mais Frequentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData.criticalWords.map((word, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-red-800">"{word.word}"</span>
                          <Badge className="bg-red-100 text-red-800">{word.frequency}x</Badge>
                        </div>
                        <div className="flex items-center space-x-1">
                          {getTrendIcon(word.trend)}
                          <span className="text-sm text-muted-foreground">{word.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="akig-card-shadow">
                <CardHeader>
                  <CardTitle>Distribuição de Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={reportData.scoreDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="count"
                          nameKey="range"
                          label={(entry: any) => `${entry.percentage}%`}
                        >
                          {reportData.scoreDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any, name: any, props: any) => [
                            `${value} avaliações (${props.payload.percentage}%)`,
                            'Quantidade'
                          ]}
                          labelFormatter={(label: any) => `Faixa: ${label}`}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value: any, entry: any) => (
                            <span style={{ color: entry.color }}>
                              {value}: {entry.payload.count} ({entry.payload.percentage}%)
                            </span>
                          )}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground text-center">
                    Total de 138 avaliações analisadas
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <Card className="akig-card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Análise de Tendências
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Análise de Tendências
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Funcionalidade em desenvolvimento - em breve você terá acesso a análises preditivas e tendências de performance
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant="outline">Machine Learning</Badge>
                    <Badge variant="outline">Previsões</Badge>
                    <Badge variant="outline">Alertas Automáticos</Badge>
                    <Badge variant="outline">Insights IA</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
