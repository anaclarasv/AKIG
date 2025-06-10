import { Router } from 'express';
import { DataEncryption, InputSanitizer } from './encryption';
import { JWTAuth, SecurityMiddleware, SecureLogger } from './security';
import { storage } from './storage';

const router = Router();

/**
 * Rotas para conformidade com LGPD
 * Implementa direitos dos titulares de dados conforme Lei 13.709/2018
 */

// Middleware de autenticação para todas as rotas LGPD
router.use(JWTAuth.verifyToken);
router.use(SecurityMiddleware.sanitizeInput);
router.use(SecurityMiddleware.secureActivityLog);

/**
 * Exportação de dados pessoais - Artigo 15 LGPD
 * Permite ao titular obter confirmação e acesso aos seus dados
 */
router.get('/export-data', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Log da operação LGPD
    SecureLogger.logLGPDOperation(userId, 'EXPORT', false);

    // Exporta todos os dados do usuário
    const userData = await storage.exportUserData(userId);
    
    // Criptografa dados sensíveis para download seguro
    const encryptedExport = DataEncryption.encrypt(JSON.stringify(userData));
    
    SecureLogger.logLGPDOperation(userId, 'EXPORT', true);
    
    res.json({
      message: 'Dados exportados com sucesso',
      exportId: encryptedExport.iv, // Usar IV como ID de referência
      downloadUrl: `/api/lgpd/download-export/${encryptedExport.iv}`,
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
    });

  } catch (error) {
    console.error('Erro na exportação de dados:', error);
    SecureLogger.logLGPDOperation(req.user?.id, 'EXPORT', false);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

/**
 * Atualização de dados pessoais - Artigo 16 LGPD
 * Permite correção de dados incompletos, inexatos ou desatualizados
 */
router.patch('/update-data', async (req, res) => {
  try {
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Valida e sanitiza dados de entrada
    if (updateData.email && !InputSanitizer.isValidEmail(updateData.email)) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    // Atualiza dados do usuário
    const updatedUser = await storage.updateUser(userId, updateData);
    
    SecureLogger.logSensitiveAction(userId, 'UPDATE_PERSONAL_DATA', 'user', {
      fieldsUpdated: Object.keys(updateData)
    });

    res.json({
      message: 'Dados atualizados com sucesso',
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na atualização de dados:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

/**
 * Exclusão de dados pessoais - Artigo 18 LGPD (Direito ao Esquecimento)
 * Remove todos os dados pessoais do titular
 */
router.delete('/delete-data', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { confirmation } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Verifica confirmação explícita do usuário
    if (confirmation !== 'CONFIRMO_EXCLUSAO_DEFINITIVA') {
      return res.status(400).json({ 
        message: 'Confirmação necessária para exclusão definitiva' 
      });
    }

    SecureLogger.logLGPDOperation(userId, 'DELETE', false);

    // Remove todos os dados do usuário
    await storage.deleteUserData(userId);
    
    SecureLogger.logLGPDOperation(userId, 'DELETE', true);

    res.json({
      message: 'Dados excluídos definitivamente conforme LGPD',
      deletedAt: new Date().toISOString(),
      notice: 'Esta ação é irreversível'
    });

  } catch (error) {
    console.error('Erro na exclusão de dados:', error);
    SecureLogger.logLGPDOperation(req.user?.id, 'DELETE', false);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

/**
 * Gerenciamento de consentimento - Artigo 8º LGPD
 * Permite visualizar e revogar consentimentos
 */
router.get('/consent', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const consentData = await storage.getUserConsent(userId);
    
    res.json({
      consent: consentData,
      rights: [
        'Confirmação da existência de tratamento',
        'Acesso aos dados',
        'Correção de dados incompletos, inexatos ou desatualizados',
        'Anonimização, bloqueio ou eliminação de dados',
        'Portabilidade dos dados',
        'Eliminação dos dados tratados com consentimento',
        'Informação sobre compartilhamento',
        'Revogação do consentimento'
      ]
    });

  } catch (error) {
    console.error('Erro ao buscar consentimento:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

/**
 * Revogação de consentimento - Artigo 8º §5º LGPD
 */
router.post('/revoke-consent', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { consentType } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    await storage.updateUserConsent(userId, {
      [consentType]: false,
      revokedAt: new Date()
    });

    SecureLogger.logLGPDOperation(userId, 'CONSENT_UPDATE', true);

    res.json({
      message: 'Consentimento revogado com sucesso',
      consentType,
      revokedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao revogar consentimento:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

/**
 * Relatório de atividades de tratamento - Transparência LGPD
 */
router.get('/activity-report', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    res.json({
      dataProcessingActivities: [
        {
          purpose: 'Autenticação e controle de acesso',
          legalBasis: 'Execução de contrato',
          dataTypes: ['Nome', 'Email', 'Senha (hash)'],
          retention: '5 anos após término do contrato'
        },
        {
          purpose: 'Avaliação de desempenho',
          legalBasis: 'Interesse legítimo',
          dataTypes: ['Dados de performance', 'Avaliações'],
          retention: '2 anos para fins estatísticos'
        },
        {
          purpose: 'Comunicação e notificações',
          legalBasis: 'Consentimento',
          dataTypes: ['Email', 'Preferências de notificação'],
          retention: 'Até revogação do consentimento'
        }
      ],
      dataController: {
        name: 'AKIG Solutions',
        contact: 'dpo@akig.com.br',
        address: 'Conforme Política de Privacidade'
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export default router;