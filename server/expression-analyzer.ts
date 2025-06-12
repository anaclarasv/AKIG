/**
 * Analisador de Expressões para Monitoramento de Atendimento
 * Analisa transcrições usando base de dados CSV de expressões categorizadas
 */

import fs from 'fs';
import path from 'path';

export interface ExpressionAnalysis {
  criticas: number;      // negativas + baixo calão (vermelho)
  neutras: number;       // neutras (amarelo)
  positivas: number;     // positivas (verde)
  silencioSegundos: number; // tempo de silêncio em segundos
  detectedExpressions: {
    criticas: string[];
    neutras: string[];
    positivas: string[];
    baixoCalao: string[];
  };
}

interface Expression {
  expressao: string;
  categoria: 'negativa' | 'neutra' | 'positiva' | 'baixo calao';
}

export class ExpressionAnalyzer {
  private static expressions: Expression[] = [];
  private static loaded = false;

  /**
   * Carrega as expressões do arquivo CSV
   */
  private static loadExpressions(): void {
    if (this.loaded) return;

    try {
      const csvPath = path.join(__dirname, 'expressoes-monitoria.csv');
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n').slice(1); // Remove header

      this.expressions = lines
        .filter(line => line.trim())
        .map(line => {
          const [expressao, categoria] = line.split(',');
          return {
            expressao: expressao?.trim() || '',
            categoria: categoria?.trim() as Expression['categoria']
          };
        })
        .filter(expr => expr.expressao && expr.categoria);

      this.loaded = true;
      console.log(`Carregadas ${this.expressions.length} expressões para análise`);
    } catch (error) {
      console.error('Erro ao carregar expressões:', error);
      this.expressions = [];
    }
  }

  /**
   * Normaliza texto removendo acentos e convertendo para minúsculas
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Detecta expressões no texto da transcrição
   */
  private static detectExpressions(text: string): {
    criticas: string[];
    neutras: string[];
    positivas: string[];
    baixoCalao: string[];
  } {
    this.loadExpressions();

    const normalizedText = this.normalizeText(text);
    const detected = {
      criticas: [] as string[],
      neutras: [] as string[],
      positivas: [] as string[],
      baixoCalao: [] as string[]
    };

    for (const expr of this.expressions) {
      const normalizedExpression = this.normalizeText(expr.expressao);
      
      if (normalizedText.includes(normalizedExpression)) {
        switch (expr.categoria) {
          case 'negativa':
            detected.criticas.push(expr.expressao);
            break;
          case 'baixo calao':
            detected.baixoCalao.push(expr.expressao);
            break;
          case 'neutra':
            detected.neutras.push(expr.expressao);
            break;
          case 'positiva':
            detected.positivas.push(expr.expressao);
            break;
        }
      }
    }

    return detected;
  }

  /**
   * Calcula tempo de silêncio baseado nos segmentos da transcrição
   */
  private static calculateSilenceTime(segments: any[], totalDuration: number): number {
    if (!segments || segments.length === 0) return 0;

    let silenceTime = 0;
    let lastEndTime = 0;

    // Ordena segmentos por tempo de início
    const sortedSegments = segments.sort((a, b) => a.start - b.start);

    for (const segment of sortedSegments) {
      const segmentStart = segment.start || 0;
      const segmentEnd = segment.end || segmentStart + 1;

      // Calcula silêncio entre segmentos
      if (segmentStart > lastEndTime) {
        silenceTime += segmentStart - lastEndTime;
      }

      lastEndTime = Math.max(lastEndTime, segmentEnd);
    }

    // Adiciona silêncio no final se houver
    if (lastEndTime < totalDuration) {
      silenceTime += totalDuration - lastEndTime;
    }

    return Math.max(0, Math.round(silenceTime));
  }

  /**
   * Analisa transcrição completa e retorna métricas
   */
  static analyzeTranscription(
    transcriptionText: string,
    segments: any[] = [],
    duration: number = 0
  ): ExpressionAnalysis {
    const detectedExpressions = this.detectExpressions(transcriptionText);
    
    // Calcula contadores - críticas incluem negativas + baixo calão
    const criticas = detectedExpressions.criticas.length + detectedExpressions.baixoCalao.length;
    const neutras = detectedExpressions.neutras.length;
    const positivas = detectedExpressions.positivas.length;
    
    // Calcula tempo de silêncio
    const silencioSegundos = this.calculateSilenceTime(segments, duration);

    return {
      criticas,
      neutras,
      positivas,
      silencioSegundos,
      detectedExpressions
    };
  }

  /**
   * Gera relatório detalhado da análise
   */
  static generateDetailedReport(analysis: ExpressionAnalysis): string {
    const { criticas, neutras, positivas, silencioSegundos, detectedExpressions } = analysis;
    
    let report = `=== RELATÓRIO DE ANÁLISE DE EXPRESSÕES ===\n\n`;
    
    report += `📊 RESUMO GERAL:\n`;
    report += `• Expressões Críticas: ${criticas} (🔴)\n`;
    report += `• Expressões Neutras: ${neutras} (🟡)\n`;
    report += `• Expressões Positivas: ${positivas} (🟢)\n`;
    report += `• Tempo de Silêncio: ${silencioSegundos}s\n\n`;

    if (detectedExpressions.criticas.length > 0) {
      report += `🔴 EXPRESSÕES NEGATIVAS DETECTADAS:\n`;
      detectedExpressions.criticas.forEach(expr => report += `  - ${expr}\n`);
      report += `\n`;
    }

    if (detectedExpressions.baixoCalao.length > 0) {
      report += `🚨 EXPRESSÕES DE BAIXO CALÃO DETECTADAS:\n`;
      detectedExpressions.baixoCalao.forEach(expr => report += `  - ${expr}\n`);
      report += `\n`;
    }

    if (detectedExpressions.positivas.length > 0) {
      report += `🟢 EXPRESSÕES POSITIVAS DETECTADAS:\n`;
      detectedExpressions.positivas.forEach(expr => report += `  - ${expr}\n`);
      report += `\n`;
    }

    if (detectedExpressions.neutras.length > 0) {
      report += `🟡 EXPRESSÕES NEUTRAS DETECTADAS:\n`;
      detectedExpressions.neutras.forEach(expr => report += `  - ${expr}\n`);
      report += `\n`;
    }

    return report;
  }
}