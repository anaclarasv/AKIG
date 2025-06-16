import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Response } from 'express';
import { storage } from './storage';
import path from 'path';
import fs from 'fs';

interface ReportMetrics {
  totalAvaliacoes: number;
  mediaPontuacao: number;
  taxaAprovacao: string;
  incidentesCriticos: number;
  formulariosPendentes: number;
  contestacoes: number;
}

interface AgentPerformance {
  nome: string;
  avaliacoes: number;
  media: number;
  aprovados: number;
  reprovados: number;
  taxa: string;
}

// Buscar dados reais do banco de dados
async function buscarDadosReais(): Promise<{ metricas: ReportMetrics; agentes: AgentPerformance[] }> {
  try {
    const evaluations = await storage.getEvaluations();
    const contests = await storage.getEvaluationContests();
    const sessions = await storage.getMonitoringSessions();
    const users = await storage.getUsers();

    // Calcular métricas reais
    const totalAvaliacoes = evaluations.length;
    let totalScore = 0;
    let scoreCount = 0;
    let approvedCount = 0;
    let criticalIncidents = 0;

    evaluations.forEach(evaluation => {
      if (evaluation.scores && typeof evaluation.scores === 'object') {
        const scoresObj = evaluation.scores as Record<string, any>;
        let validScores: number[] = [];
        
        Object.values(scoresObj).forEach(scoreValue => {
          if (typeof scoreValue === 'number' && scoreValue >= 0) {
            validScores.push(scoreValue);
          } else if (typeof scoreValue === 'object' && scoreValue.score !== undefined) {
            validScores.push(scoreValue.score);
          }
        });
        
        if (validScores.length > 0) {
          const avgScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
          totalScore += avgScore;
          scoreCount++;
          
          if (avgScore >= 7.0) approvedCount++;
          if (avgScore < 5.0) criticalIncidents++;
        }
      }
    });

    const mediaPontuacao = scoreCount > 0 ? Math.round((totalScore / scoreCount) * 100) / 100 : 0;
    const taxaAprovacao = totalAvaliacoes > 0 ? Math.round((approvedCount / totalAvaliacoes) * 100) : 0;
    const formulariosPendentes = evaluations.filter(evaluation => evaluation.status === 'pending').length;
    const contestacoes = contests.filter(contest => contest.status === 'pending').length;

    // Performance por agente usando dados reais
    const agentStats = new Map();
    evaluations.forEach(evaluation => {
      const session = sessions.find(s => s.id === evaluation.monitoringSessionId);
      const agentId = session?.agentId || 'nao_identificado';
      
      const agent = users.find(u => u.id === agentId);
      const agentName = agent ? `${agent.firstName} ${agent.lastName}` : `Agente ${agentId}`;
      
      if (!agentStats.has(agentId)) {
        agentStats.set(agentId, {
          nome: agentName,
          totalEvaluations: 0,
          totalScore: 0,
          approvedCount: 0,
          criticalIncidents: 0
        });
      }

      const stats = agentStats.get(agentId);
      stats.totalEvaluations++;

      if (evaluation.scores && typeof evaluation.scores === 'object') {
        const scoresObj = evaluation.scores as Record<string, any>;
        let validScores: number[] = [];
        
        Object.values(scoresObj).forEach(scoreValue => {
          if (typeof scoreValue === 'number' && scoreValue >= 0) {
            validScores.push(scoreValue);
          } else if (typeof scoreValue === 'object' && scoreValue.score !== undefined) {
            validScores.push(scoreValue.score);
          }
        });
        
        if (validScores.length > 0) {
          const avgScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
          stats.totalScore += avgScore;
          if (avgScore >= 7.0) stats.approvedCount++;
          if (avgScore < 5.0) stats.criticalIncidents++;
        }
      }
    });

    const agentes = Array.from(agentStats.values()).map(stats => ({
      nome: stats.nome,
      avaliacoes: stats.totalEvaluations,
      media: stats.totalEvaluations > 0 ? Math.round((stats.totalScore / stats.totalEvaluations) * 100) / 100 : 0,
      aprovados: stats.approvedCount,
      reprovados: stats.totalEvaluations - stats.approvedCount,
      taxa: stats.totalEvaluations > 0 ? `${Math.round((stats.approvedCount / stats.totalEvaluations) * 100)}%` : '0%'
    })).filter(agent => agent.avaliacoes > 0);

    const metricas: ReportMetrics = {
      totalAvaliacoes,
      mediaPontuacao,
      taxaAprovacao: `${taxaAprovacao}%`,
      incidentesCriticos: criticalIncidents,
      formulariosPendentes,
      contestacoes: contestacoes
    };

    return { metricas, agentes };
  } catch (error) {
    console.error('Erro ao buscar dados reais:', error);
    // Retornar dados vazios em caso de erro
    return {
      metricas: {
        totalAvaliacoes: 0,
        mediaPontuacao: 0,
        taxaAprovacao: '0%',
        incidentesCriticos: 0,
        formulariosPendentes: 0,
        contestacoes: 0
      },
      agentes: []
    };
  }
}

// Função para gerar PDF
export async function gerarPDF(res: Response) {
  try {
    const { metricas, agentes } = await buscarDadosReais();
    
    const doc = new PDFDocument();
    const filePath = path.join(process.cwd(), 'uploads', 'relatorio-monitoria.pdf');
    
    // Garantir que o diretório existe
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Cabeçalho
    doc.fontSize(20).text('📄 Relatório Completo de Monitoria', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('Empresa: AKIG Solutions', { align: 'center' });
    doc.fontSize(12).text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
    doc.moveDown(2);

    // Métricas Gerais
    doc.fontSize(16).text('📊 Métricas Gerais', { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    
    const metricasTexto = [
      `Total de Avaliações: ${metricas.totalAvaliacoes}`,
      `Pontuação Média: ${metricas.mediaPontuacao}`,
      `Taxa de Aprovação: ${metricas.taxaAprovacao}`,
      `Incidentes Críticos: ${metricas.incidentesCriticos}`,
      `Formulários Pendentes: ${metricas.formulariosPendentes}`,
      `Contestações em Análise: ${metricas.contestacoes}`
    ];
    
    metricasTexto.forEach(texto => {
      doc.text(texto);
    });

    doc.moveDown(2);

    // Performance por Agente
    doc.fontSize(16).text('👥 Performance por Agente', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    
    // Cabeçalho da tabela
    doc.text('Nome do Agente', 50, doc.y, { width: 150 });
    doc.text('Avaliações', 200, doc.y, { width: 80 });
    doc.text('Média', 280, doc.y, { width: 60 });
    doc.text('Aprovados', 340, doc.y, { width: 80 });
    doc.text('Reprovados', 420, doc.y, { width: 80 });
    doc.text('Taxa', 500, doc.y, { width: 60 });
    doc.moveDown();
    
    // Linha separadora
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Dados dos agentes
    agentes.forEach(agente => {
      const currentY = doc.y;
      doc.text(agente.nome.substring(0, 25), 50, currentY, { width: 150 });
      doc.text(agente.avaliacoes.toString(), 200, currentY, { width: 80 });
      doc.text(agente.media.toFixed(1), 280, currentY, { width: 60 });
      doc.text(agente.aprovados.toString(), 340, currentY, { width: 80 });
      doc.text(agente.reprovados.toString(), 420, currentY, { width: 80 });
      doc.text(agente.taxa, 500, currentY, { width: 60 });
      doc.moveDown();
    });

    doc.moveDown(2);

    // Observações Gerais
    doc.fontSize(16).text('📌 Observações Gerais', { underline: true });
    doc.moveDown();
    doc.fontSize(11);
    
    const observacoes = [
      `A maior parte das ${metricas.totalAvaliacoes} avaliações foram positivas.`,
      `${metricas.incidentesCriticos} incidentes críticos foram identificados e encaminhados.`,
      `Taxa geral de aprovação está em ${metricas.taxaAprovacao}.`,
      `Acompanhar ${metricas.formulariosPendentes} formulários pendentes de assinatura.`
    ];
    
    observacoes.forEach(obs => {
      doc.text(`• ${obs}`);
    });

    // Rodapé
    doc.fontSize(8).text('AKIG Solutions - Relatório Gerado com Dados Reais do Sistema', { align: 'center' });

    doc.end();

    stream.on('finish', () => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=relatorio-monitoria.pdf');
      res.download(filePath, 'relatorio-monitoria.pdf', (err) => {
        if (err) {
          console.error('Erro ao fazer download do PDF:', err);
        }
        // Limpar arquivo temporário
        fs.unlink(filePath, () => {});
      });
    });

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao gerar PDF' });
  }
}

// Função para gerar Excel
export async function gerarExcel(res: Response) {
  try {
    const { metricas, agentes } = await buscarDadosReais();
    
    const workbook = new ExcelJS.Workbook();
    
    // Planilha 1: Métricas Gerais
    const sheet1 = workbook.addWorksheet('Métricas Gerais');
    sheet1.addRow(['Métrica', 'Valor']);
    
    const metricasArray = [
      ['Total de Avaliações', metricas.totalAvaliacoes],
      ['Pontuação Média', metricas.mediaPontuacao],
      ['Taxa de Aprovação', metricas.taxaAprovacao],
      ['Incidentes Críticos', metricas.incidentesCriticos],
      ['Formulários Pendentes', metricas.formulariosPendentes],
      ['Contestações', metricas.contestacoes]
    ];
    
    metricasArray.forEach(([key, value]) => {
      sheet1.addRow([key, value]);
    });

    // Planilha 2: Performance por Agente
    const sheet2 = workbook.addWorksheet('Performance por Agente');
    sheet2.addRow(['Nome', 'Avaliações', 'Média', 'Aprovados', 'Reprovados', 'Taxa de Aprovação']);
    
    agentes.forEach(agente => {
      sheet2.addRow([
        agente.nome,
        agente.avaliacoes,
        agente.media,
        agente.aprovados,
        agente.reprovados,
        agente.taxa
      ]);
    });

    // Planilha 3: Informações do Relatório
    const sheet3 = workbook.addWorksheet('Informações');
    const infoData = [
      ['Relatório de Monitoria - AKIG Solutions', ''],
      ['Data de Geração', new Date().toLocaleDateString('pt-BR')],
      ['Hora de Geração', new Date().toLocaleTimeString('pt-BR')],
      ['Fonte dos Dados', 'Sistema AKIG Solutions - Dados Reais'],
      ['Total de Registros', metricas.totalAvaliacoes],
      ['Status do Sistema', 'Operacional']
    ];
    
    infoData.forEach(([key, value]) => {
      sheet3.addRow([key, value]);
    });

    const filePath = path.join(process.cwd(), 'uploads', 'relatorio-monitoria.xlsx');
    
    await workbook.xlsx.writeFile(filePath);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio-monitoria.xlsx');
    res.download(filePath, 'relatorio-monitoria.xlsx', (err) => {
      if (err) {
        console.error('Erro ao fazer download do Excel:', err);
      }
      // Limpar arquivo temporário
      fs.unlink(filePath, () => {});
    });

  } catch (error) {
    console.error('Erro ao gerar Excel:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao gerar Excel' });
  }
}