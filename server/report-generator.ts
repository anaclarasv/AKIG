import { DatabaseStorage } from './storage';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export class ReportGenerator {
  private storage: DatabaseStorage;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  /**
   * Gera dados reais do relatório extraindo do banco de dados
   */
  async generateReportData(companyId?: number, startDate?: string, endDate?: string) {
    try {
      // Buscar todas as avaliações
      const evaluations = await this.storage.getEvaluations();
      
      // Filtrar por período se especificado
      let filteredEvaluations = evaluations;
      if (startDate && endDate) {
        filteredEvaluations = evaluations.filter(evaluation => {
          const evalDate = evaluation.createdAt ? new Date(evaluation.createdAt) : new Date();
          return evalDate >= new Date(startDate) && evalDate <= new Date(endDate);
        });
      }

      // Calcular métricas gerais
      const totalEvaluations = filteredEvaluations.length;
      
      // Calcular pontuação média das avaliações com scores válidos
      const evaluationsWithScores = filteredEvaluations.filter(evaluation => 
        evaluation.scores && typeof evaluation.scores === 'object'
      );
      
      let totalScore = 0;
      let scoreCount = 0;
      
      evaluationsWithScores.forEach(evaluation => {
        if (evaluation.scores && typeof evaluation.scores === 'object') {
          const scores = Object.values(evaluation.scores as Record<string, number>);
          const validScores = scores.filter(score => typeof score === 'number' && score >= 0);
          if (validScores.length > 0) {
            const avgScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
            totalScore += avgScore;
            scoreCount++;
          }
        }
      });
      
      const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;
      
      const approvedEvaluations = evaluationsWithScores.filter(evaluation => {
        if (evaluation.scores && typeof evaluation.scores === 'object') {
          const scores = Object.values(evaluation.scores as Record<string, number>);
          const validScores = scores.filter(score => typeof score === 'number' && score >= 0);
          if (validScores.length > 0) {
            const avgScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
            return avgScore >= 7.0;
          }
        }
        return false;
      });
      
      const approvalRate = totalEvaluations > 0 ? (approvedEvaluations.length / totalEvaluations) * 100 : 0;
      
      // Incidentes críticos são avaliações com nota final abaixo de 5
      const criticalIncidents = evaluationsWithScores.filter(evaluation => {
        if (evaluation.scores && typeof evaluation.scores === 'object') {
          const scores = Object.values(evaluation.scores as Record<string, number>);
          const validScores = scores.filter(score => typeof score === 'number' && score >= 0);
          if (validScores.length > 0) {
            const avgScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
            return avgScore < 5.0;
          }
        }
        return false;
      }).length;

      const unsignedForms = filteredEvaluations.filter(evaluation => evaluation.status === 'pending').length;
      
      // Buscar contestações
      const contests = await this.storage.getEvaluationContests();
      const contestedEvaluations = contests.filter(contest => contest.status === 'pending').length;

      // Performance por agente
      const agentPerformance = await this.calculateAgentPerformance(filteredEvaluations);

      return {
        general: {
          totalEvaluations,
          averageScore: Math.round(averageScore * 100) / 100,
          approvalRate: Math.round(approvalRate * 100) / 100,
          criticalIncidents,
          unsignedForms,
          contestedEvaluations
        },
        agentPerformance,
        evaluations: filteredEvaluations,
        contests: contests.filter(contest => contest.status === 'pending'),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao gerar dados do relatório:', error);
      throw error;
    }
  }

  /**
   * Calcula performance por agente
   */
  private async calculateAgentPerformance(evaluations: any[]) {
    const agentStats = new Map();

    for (const evaluation of evaluations) {
      const agentId = evaluation.agentId;
      if (!agentId) continue;

      if (!agentStats.has(agentId)) {
        agentStats.set(agentId, {
          agentId,
          name: `Agente ${agentId}`,
          totalEvaluations: 0,
          totalScore: 0,
          approvedCount: 0,
          criticalIncidents: 0
        });
      }

      const stats = agentStats.get(agentId);
      stats.totalEvaluations++;
      stats.totalScore += evaluation.score || 0;
      
      if ((evaluation.score || 0) >= 7.0) {
        stats.approvedCount++;
      }

      if (evaluation.criteriaScores && Object.values(evaluation.criteriaScores).some(score => score === 0)) {
        stats.criticalIncidents++;
      }
    }

    return Array.from(agentStats.values()).map(stats => ({
      name: stats.name,
      agentId: stats.agentId,
      totalEvaluations: stats.totalEvaluations,
      averageScore: stats.totalEvaluations > 0 ? Math.round((stats.totalScore / stats.totalEvaluations) * 100) / 100 : 0,
      approvalRate: stats.totalEvaluations > 0 ? Math.round((stats.approvedCount / stats.totalEvaluations) * 100) : 0,
      criticalIncidents: stats.criticalIncidents
    }));
  }

  /**
   * Gera relatório em PDF profissional
   */
  async generatePDFReport(reportData: any): Promise<Buffer> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let currentY = 20;

    // Cabeçalho
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AKIG Solutions - Relatório de Monitoria', pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date(reportData.generatedAt).toLocaleString('pt-BR')}`, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 20;

    // Métricas Gerais
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Métricas Gerais', 20, currentY);
    currentY += 15;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const generalMetrics = [
      ['Total de Avaliações:', reportData.general.totalEvaluations.toString()],
      ['Pontuação Média:', `${reportData.general.averageScore}/10`],
      ['Taxa de Aprovação:', `${reportData.general.approvalRate}%`],
      ['Incidentes Críticos:', reportData.general.criticalIncidents.toString()],
      ['Formulários Pendentes:', reportData.general.unsignedForms.toString()],
      ['Contestações Pendentes:', reportData.general.contestedEvaluations.toString()]
    ];

    generalMetrics.forEach(([label, value]) => {
      doc.text(label, 25, currentY);
      doc.text(value, 120, currentY);
      currentY += 8;
    });

    currentY += 10;

    // Performance por Agente
    if (reportData.agentPerformance.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Performance por Agente', 20, currentY);
      currentY += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Nome', 20, currentY);
      doc.text('Avaliações', 80, currentY);
      doc.text('Média', 120, currentY);
      doc.text('Aprovação', 150, currentY);
      doc.text('Incidentes', 180, currentY);
      currentY += 8;

      doc.setFont('helvetica', 'normal');
      reportData.agentPerformance.slice(0, 15).forEach((agent: any) => {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.text(agent.name.substring(0, 20), 20, currentY);
        doc.text(agent.totalEvaluations.toString(), 80, currentY);
        doc.text(agent.averageScore.toString(), 120, currentY);
        doc.text(`${agent.approvalRate}%`, 150, currentY);
        doc.text(agent.criticalIncidents.toString(), 180, currentY);
        currentY += 7;
      });
    }

    // Rodapé
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('AKIG Solutions - Sistema de Monitoria Inteligente', pageWidth / 2, pageHeight - 10, { align: 'center' });

    return Buffer.from(doc.output('arraybuffer'));
  }

  /**
   * Gera relatório em Excel
   */
  async generateExcelReport(reportData: any): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Aba 1: Métricas Gerais
    const generalData = [
      ['Métrica', 'Valor'],
      ['Total de Avaliações', reportData.general.totalEvaluations],
      ['Pontuação Média', reportData.general.averageScore],
      ['Taxa de Aprovação (%)', reportData.general.approvalRate],
      ['Incidentes Críticos', reportData.general.criticalIncidents],
      ['Formulários Pendentes', reportData.general.unsignedForms],
      ['Contestações Pendentes', reportData.general.contestedEvaluations],
      [''],
      ['Relatório gerado em:', new Date(reportData.generatedAt).toLocaleString('pt-BR')]
    ];

    const generalSheet = XLSX.utils.aoa_to_sheet(generalData);
    XLSX.utils.book_append_sheet(workbook, generalSheet, 'Métricas Gerais');

    // Aba 2: Performance por Agente
    if (reportData.agentPerformance.length > 0) {
      const agentHeaders = [
        'Nome do Agente',
        'ID do Agente', 
        'Total de Avaliações',
        'Média de Nota',
        'Taxa de Aprovação (%)',
        'Incidentes Críticos'
      ];

      const agentData = [
        agentHeaders,
        ...reportData.agentPerformance.map((agent: any) => [
          agent.name,
          agent.agentId,
          agent.totalEvaluations,
          agent.averageScore,
          agent.approvalRate,
          agent.criticalIncidents
        ])
      ];

      const agentSheet = XLSX.utils.aoa_to_sheet(agentData);
      XLSX.utils.book_append_sheet(workbook, agentSheet, 'Performance Agentes');
    }

    // Aba 3: Avaliações Detalhadas
    if (reportData.evaluations.length > 0) {
      const evaluationHeaders = [
        'ID Avaliação',
        'ID Sessão',
        'Agente ID',
        'Pontuação',
        'Status',
        'Data Criação',
        'Comentário Supervisor'
      ];

      const evaluationData = [
        evaluationHeaders,
        ...reportData.evaluations.slice(0, 1000).map((eval: any) => [
          eval.id,
          eval.monitoringSessionId,
          eval.agentId || 'N/A',
          eval.score || 0,
          eval.status,
          new Date(eval.createdAt).toLocaleString('pt-BR'),
          eval.supervisorComment || ''
        ])
      ];

      const evaluationSheet = XLSX.utils.aoa_to_sheet(evaluationData);
      XLSX.utils.book_append_sheet(workbook, evaluationSheet, 'Avaliações Detalhadas');
    }

    // Aba 4: Contestações Pendentes
    if (reportData.contests.length > 0) {
      const contestHeaders = [
        'ID Contestação',
        'ID Avaliação',
        'Agente ID',
        'Motivo',
        'Status',
        'Data Solicitação'
      ];

      const contestData = [
        contestHeaders,
        ...reportData.contests.map((contest: any) => [
          contest.id,
          contest.evaluationId,
          contest.agentId,
          contest.reason,
          contest.status,
          new Date(contest.createdAt).toLocaleString('pt-BR')
        ])
      ];

      const contestSheet = XLSX.utils.aoa_to_sheet(contestData);
      XLSX.utils.book_append_sheet(workbook, contestSheet, 'Contestações Pendentes');
    }

    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }
}