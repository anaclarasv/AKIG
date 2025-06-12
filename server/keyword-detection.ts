/**
 * Sistema Avançado de Detecção de Palavras-Chave para Análise de Atendimento
 * Melhora a precisão do termômetro através de análise semântica contextual
 */

export interface KeywordCategory {
  name: string;
  weight: number; // Peso para cálculo do score
  keywords: string[];
  impact: 'positive' | 'negative' | 'neutral';
}

export interface DetectionResult {
  category: string;
  keywords: string[];
  count: number;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface AnalysisResult {
  overallScore: number;
  sentiment: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  detections: DetectionResult[];
  recommendations: string[];
  criticalIssues: string[];
}

// Categorias de palavras-chave com pesos específicos
export const KEYWORD_CATEGORIES: KeywordCategory[] = [
  // Excelência no Atendimento (Impacto Positivo Alto)
  {
    name: "Excelência no Atendimento",
    weight: 10,
    impact: "positive",
    keywords: [
      "excelente", "perfeito", "ótimo", "maravilhoso", "fantástico",
      "impressionante", "excepcional", "incrível", "adorei", "amei",
      "superou expectativas", "muito bom", "recomendo", "satisfeito",
      "feliz", "grato", "agradecido", "parabéns", "eficiente"
    ]
  },

  // Cortesia e Educação (Impacto Positivo Médio)
  {
    name: "Cortesia e Educação",
    weight: 8,
    impact: "positive",
    keywords: [
      "por favor", "obrigado", "obrigada", "com licença", "desculpe",
      "bom dia", "boa tarde", "boa noite", "prazer", "gentil",
      "educado", "respeitoso", "cortês", "atencioso", "prestativo",
      "solicito", "cordial", "amável", "simpático", "paciente"
    ]
  },

  // Resolução de Problemas (Impacto Positivo Alto)
  {
    name: "Resolução de Problemas",
    weight: 9,
    impact: "positive",
    keywords: [
      "resolvido", "solucionado", "conseguimos", "vamos resolver",
      "encontrei a solução", "posso ajudar", "vou verificar",
      "já está funcionando", "problema resolvido", "tudo certo",
      "consegui resolver", "está funcionando", "sucesso", "concluído"
    ]
  },

  // Proatividade (Impacto Positivo Médio)
  {
    name: "Proatividade",
    weight: 7,
    impact: "positive",
    keywords: [
      "antecipando", "prevendo", "sugiro", "recomendo", "posso oferecer",
      "que tal se", "uma alternativa seria", "posso sugerir",
      "vou acompanhar", "vou monitorar", "vou verificar",
      "deixe-me ajudar", "posso fazer mais alguma coisa"
    ]
  },

  // Insatisfação Crítica (Impacto Negativo Alto)
  {
    name: "Insatisfação Crítica",
    weight: -15,
    impact: "negative",
    keywords: [
      "péssimo", "horrível", "terrível", "inaceitável", "revoltante",
      "indignado", "furioso", "irritado", "chateado", "decepcionado",
      "nunca mais", "cancelar", "reclamar", "processar",
      "advogado", "procon", "consumidor", "direitos", "absurdo"
    ]
  },

  // Problemas Técnicos (Impacto Negativo Médio)
  {
    name: "Problemas Técnicos",
    weight: -8,
    impact: "negative",
    keywords: [
      "não funciona", "está quebrado", "erro", "falha", "problema",
      "bug", "travou", "lento", "não carrega", "não conecta",
      "não consigo", "dificuldade", "complicado", "confuso",
      "não entendo", "difícil", "impossível"
    ]
  },

  // Demora no Atendimento (Impacto Negativo Médio)
  {
    name: "Demora no Atendimento",
    weight: -7,
    impact: "negative",
    keywords: [
      "demorou", "lento", "esperando", "aguardando", "há muito tempo",
      "demora", "lentidão", "atraso", "atrasado", "tempo demais",
      "muito tempo", "horas esperando", "não aguento mais",
      "quando vai resolver", "urgente", "pressa"
    ]
  },

  // Atendimento Inadequado (Impacto Negativo Alto)
  {
    name: "Atendimento Inadequado",
    weight: -12,
    impact: "negative",
    keywords: [
      "mal educado", "grosso", "rude", "indelicado", "desrespeitoso",
      "não sabe", "incompetente", "despreparado", "não ajuda",
      "não resolve", "não entende", "ignorante", "arrogante",
      "mal treinado", "sem educação", "mal preparado"
    ]
  },

  // Palavras de Escalação (Impacto Negativo Crítico)
  {
    name: "Escalação de Conflito",
    weight: -20,
    impact: "negative",
    keywords: [
      "supervisor", "gerente", "falar com o responsável",
      "quero falar com", "chame seu chefe", "ouvidoria",
      "reclamação formal", "vou processar", "meus direitos",
      "isso é um absurdo", "vou na justiça", "advogado"
    ]
  },

  // Expressões de Entendimento (Impacto Positivo Baixo)
  {
    name: "Comunicação Clara",
    weight: 5,
    impact: "positive",
    keywords: [
      "entendi", "compreendi", "ficou claro", "entendo",
      "faz sentido", "agora sim", "perfeito", "certo",
      "ok", "beleza", "tranquilo", "sem problema",
      "está bem", "tudo bem", "compreendo"
    ]
  },

  // Pedidos de Informação (Impacto Neutro)
  {
    name: "Solicitação de Informações",
    weight: 2,
    impact: "neutral",
    keywords: [
      "como funciona", "pode explicar", "não entendi",
      "pode repetir", "como faço", "onde encontro",
      "preciso saber", "gostaria de saber", "pode me ajudar",
      "tenho uma dúvida", "uma pergunta", "informação"
    ]
  }
];

export class KeywordDetector {
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  }

  /**
   * Detecta palavras-chave em um texto e retorna análise detalhada
   */
  static detectKeywords(text: string): DetectionResult[] {
    const normalizedText = this.normalizeText(text);
    const detections: DetectionResult[] = [];

    for (const category of KEYWORD_CATEGORIES) {
      const foundKeywords: string[] = [];
      let totalCount = 0;

      for (const keyword of category.keywords) {
        const normalizedKeyword = this.normalizeText(keyword);
        const regex = new RegExp(`\\b${normalizedKeyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        const matches = normalizedText.match(regex);
        
        if (matches) {
          foundKeywords.push(keyword);
          totalCount += matches.length;
        }
      }

      if (foundKeywords.length > 0) {
        // Calcula confiança baseada na densidade de palavras-chave
        const textLength = normalizedText.split(' ').length;
        const keywordDensity = totalCount / textLength;
        const confidence = Math.min(keywordDensity * 100, 100);

        detections.push({
          category: category.name,
          keywords: foundKeywords,
          count: totalCount,
          weight: category.weight,
          impact: category.impact,
          confidence: Math.round(confidence * 100) / 100
        });
      }
    }

    return detections;
  }

  /**
   * Analisa um texto completo e gera relatório de qualidade
   */
  static analyzeText(text: string): AnalysisResult {
    const detections = this.detectKeywords(text);
    
    // Calcula score geral baseado nos pesos
    let totalScore = 0;
    let weightSum = 0;

    for (const detection of detections) {
      const weightedScore = detection.weight * detection.count;
      totalScore += weightedScore;
      weightSum += Math.abs(detection.weight) * detection.count;
    }

    // Normaliza o score para uma escala de 0-100
    const normalizedScore = weightSum > 0 ? 
      Math.max(0, Math.min(100, 50 + (totalScore / weightSum) * 50)) : 50;

    // Determina sentimento geral
    let sentiment: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
    if (normalizedScore >= 80) sentiment = 'excellent';
    else if (normalizedScore >= 65) sentiment = 'good';
    else if (normalizedScore >= 45) sentiment = 'average';
    else if (normalizedScore >= 25) sentiment = 'poor';
    else sentiment = 'critical';

    // Gera recomendações
    const recommendations = this.generateRecommendations(detections, sentiment);
    const criticalIssues = this.identifyCriticalIssues(detections);

    return {
      overallScore: Math.round(normalizedScore * 100) / 100,
      sentiment,
      detections,
      recommendations,
      criticalIssues
    };
  }

  /**
   * Gera recomendações baseadas na análise
   */
  private static generateRecommendations(detections: DetectionResult[], sentiment: string): string[] {
    const recommendations: string[] = [];

    // Verifica problemas específicos e sugere melhorias
    const hasRudenessIssues = detections.some(d => 
      d.category === "Atendimento Inadequado" && d.count > 0
    );
    
    const hasDelayIssues = detections.some(d => 
      d.category === "Demora no Atendimento" && d.count > 0
    );

    const hasTechnicalIssues = detections.some(d => 
      d.category === "Problemas Técnicos" && d.count > 0
    );

    const hasEscalation = detections.some(d => 
      d.category === "Escalação de Conflito" && d.count > 0
    );

    if (hasRudenessIssues) {
      recommendations.push("Treinamento em atendimento cortês e profissional");
      recommendations.push("Revisão das técnicas de comunicação empática");
    }

    if (hasDelayIssues) {
      recommendations.push("Otimização dos tempos de resposta");
      recommendations.push("Implementação de atualizações proativas ao cliente");
    }

    if (hasTechnicalIssues) {
      recommendations.push("Capacitação técnica adicional para o atendente");
      recommendations.push("Revisão dos processos de resolução de problemas");
    }

    if (hasEscalation) {
      recommendations.push("Atenção imediata - situação crítica identificada");
      recommendations.push("Acompanhamento supervisório necessário");
    }

    if (sentiment === 'excellent') {
      recommendations.push("Parabéns! Atendimento exemplar - use como benchmark");
    } else if (sentiment === 'good') {
      recommendations.push("Bom atendimento - pequenos ajustes podem torná-lo excelente");
    }

    return recommendations;
  }

  /**
   * Identifica questões críticas que requerem atenção imediata
   */
  private static identifyCriticalIssues(detections: DetectionResult[]): string[] {
    const criticalIssues: string[] = [];

    for (const detection of detections) {
      if (detection.weight <= -10 && detection.count > 0) {
        criticalIssues.push(
          `${detection.category}: ${detection.count} ocorrência(s) detectada(s)`
        );
      }
    }

    return criticalIssues;
  }

  /**
   * Analisa um array de segmentos de transcrição
   */
  static analyzeTranscriptionSegments(segments: any[]): AnalysisResult {
    const fullText = segments.map(segment => segment.text).join(' ');
    return this.analyzeText(fullText);
  }

  /**
   * Gera relatório detalhado para supervisores
   */
  static generateDetailedReport(analysis: AnalysisResult): string {
    let report = `=== RELATÓRIO DE ANÁLISE DE ATENDIMENTO ===\n\n`;
    
    report += `Score Geral: ${analysis.overallScore}/100\n`;
    report += `Sentimento: ${analysis.sentiment.toUpperCase()}\n\n`;

    if (analysis.criticalIssues.length > 0) {
      report += `🚨 QUESTÕES CRÍTICAS:\n`;
      for (const issue of analysis.criticalIssues) {
        report += `- ${issue}\n`;
      }
      report += `\n`;
    }

    report += `📊 DETECÇÕES POR CATEGORIA:\n`;
    for (const detection of analysis.detections) {
      const impact = detection.impact === 'positive' ? '✅' : 
                    detection.impact === 'negative' ? '❌' : '➖';
      report += `${impact} ${detection.category}: ${detection.count} ocorrências (Peso: ${detection.weight})\n`;
      report += `   Palavras encontradas: ${detection.keywords.join(', ')}\n`;
    }

    report += `\n💡 RECOMENDAÇÕES:\n`;
    for (const recommendation of analysis.recommendations) {
      report += `- ${recommendation}\n`;
    }

    return report;
  }
}