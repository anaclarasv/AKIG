/**
 * Teste direto do sistema de análise manual de chat
 */

// Simulação do conteúdo de chat para teste
const chatContent = `
Cliente: Olá, tenho um problema com minha conta
Atendente: Bom dia! Como posso ajudar você hoje?
Cliente: Não consigo fazer login no sistema
Atendente: Vou verificar isso para você. Pode me informar seu email?
Cliente: meu.email@teste.com
Atendente: Obrigada. Vou verificar o status da sua conta
Cliente: Obrigado pela ajuda
Atendente: Encontrei o problema. Sua conta estava temporariamente bloqueada
Cliente: Ah, entendi. Como posso resolver isso?
Atendente: Já desbloqueei para você. Pode tentar fazer login agora
Cliente: Funcionou! Muito obrigado
Atendente: De nada! Fico feliz que conseguimos resolver
`;

// Importa o analisador manual
async function testManualAnalysis() {
  try {
    console.log('=== TESTE DO SISTEMA DE ANÁLISE MANUAL ===\n');
    
    // Importa dinâmicamente o módulo
    const { ManualChatAnalyzer } = await import('./server/manual-chat-analysis.ts');
    
    // Executa a análise
    const analysis = ManualChatAnalyzer.analyzeChatContent(chatContent);
    
    console.log('📊 MÉTRICAS DA CONVERSA:');
    console.log(`Total de mensagens: ${analysis.metrics.totalMessages}`);
    console.log(`Mensagens do agente: ${analysis.metrics.agentMessages}`);
    console.log(`Mensagens do cliente: ${analysis.metrics.clientMessages}`);
    console.log(`Total de palavras: ${analysis.metrics.totalWords}`);
    console.log(`Média de palavras por mensagem: ${analysis.metrics.averageWordsPerMessage}`);
    console.log(`Tempo de resposta: ${analysis.metrics.responseTime}s`);
    console.log(`Problemas identificados: ${analysis.metrics.problemsIdentified}`);
    console.log(`Soluções oferecidas: ${analysis.metrics.solutionsOffered}`);
    console.log(`Perguntas feitas: ${analysis.metrics.questionsAsked}\n`);
    
    console.log('🔑 PALAVRAS-CHAVE IDENTIFICADAS:');
    console.log(`Problemas: ${analysis.keywords.problems.join(', ')}`);
    console.log(`Soluções: ${analysis.keywords.solutions.join(', ')}`);
    console.log(`Positivas: ${analysis.keywords.positive.join(', ')}`);
    console.log(`Negativas: ${analysis.keywords.negative.join(', ')}\n`);
    
    console.log('📈 RESUMO DA ANÁLISE:');
    console.log(`Sentimento: ${analysis.summary.sentiment}`);
    console.log(`Resolução: ${analysis.summary.resolution}`);
    console.log(`Satisfação do cliente: ${analysis.summary.customerSatisfaction}`);
    console.log(`Performance do agente: ${analysis.summary.agentPerformance}\n`);
    
    console.log('💬 FLUXO DA CONVERSA:');
    analysis.conversationFlow.forEach((msg, index) => {
      const speaker = msg.speaker === 'agent' ? '🔵 Atendente' : '🟠 Cliente';
      console.log(`${index + 1}. ${speaker} (${msg.timestamp}): ${msg.text.substring(0, 50)}...`);
      if (msg.hasProblem) console.log('   ⚠️  Problema identificado');
      if (msg.hasSolution) console.log('   ✅ Solução oferecida');
      if (msg.hasQuestion) console.log('   ❓ Pergunta feita');
    });
    
    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('O sistema de análise manual está funcionando corretamente.');
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.message);
    console.error(error.stack);
  }
}

// Executa o teste
testManualAnalysis();