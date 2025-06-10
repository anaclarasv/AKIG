import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { DataEncryption, InputSanitizer } from './encryption';

// JWT Secret da variável de ambiente - Security Best Practice
const JWT_SECRET = process.env.JWT_SECRET || 'AKIG-super-secret-key-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'AKIG-refresh-secret-2024';

/**
 * Middleware de autenticação JWT segura
 * Substitui o sistema de sessões por tokens mais seguros
 */
export class JWTAuth {
  
  /**
   * Gera token JWT com dados do usuário
   * @param user Dados do usuário
   * @returns Tokens de acesso e refresh
   */
  static generateTokens(user: any): { accessToken: string; refreshToken: string } {
    // Token de acesso (15 minutos)
    const accessToken = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        role: user.role,
        companyId: user.companyId,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    // Token de refresh (7 dias)
    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
  }
  
  /**
   * Middleware para verificar token JWT
   */
  static verifyToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token de acesso necessário' });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      
      // Log seguro da atividade (sem dados pessoais)
      console.log(`[AUTH] Acesso autorizado para ${DataEncryption.generatePseudonym(decoded.id)} - ${new Date().toISOString()}`);
      
      next();
    } catch (error) {
      return res.status(403).json({ message: 'Token inválido ou expirado' });
    }
  }
  
  /**
   * Renovação de token usando refresh token
   */
  static refreshToken(refreshToken: string): { accessToken: string } | null {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Token type invalid');
      }
      
      // Gerar novo access token
      const accessToken = jwt.sign(
        { 
          id: decoded.id,
          iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      return { accessToken };
    } catch (error) {
      return null;
    }
  }
}

/**
 * Middleware de segurança e rate limiting
 */
export class SecurityMiddleware {
  
  /**
   * Rate limiting para prevenir ataques de força bruta
   */
  static createRateLimit(windowMs: number = 10 * 60 * 1000, max: number = 500) {
    return rateLimit({
      windowMs,
      max,
      message: {
        error: 'Muitas tentativas, tente novamente em alguns minutos'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }
  
  /**
   * Rate limit específico para login (ajustado para desenvolvimento)
   */
  static loginRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 20, // 20 tentativas por IP
    message: {
      error: 'Muitas tentativas de login, tente novamente em alguns minutos'
    },
    skipSuccessfulRequests: true,
  });
  
  /**
   * Middleware para sanitização de entrada
   */
  static sanitizeInput(req: Request, res: Response, next: NextFunction) {
    // Sanitiza body
    if (req.body && typeof req.body === 'object') {
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = InputSanitizer.sanitizeHTML(req.body[key]);
        }
      }
    }
    
    // Sanitiza query params
    if (req.query && typeof req.query === 'object') {
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = InputSanitizer.sanitizeHTML(req.query[key] as string);
        }
      }
    }
    
    next();
  }
  
  /**
   * Middleware para log de atividades seguras (LGPD compliant)
   */
  static secureActivityLog(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.id;
    const pseudonym = userId ? DataEncryption.generatePseudonym(userId) : 'ANONYMOUS';
    const timestamp = new Date().toISOString();
    const method = req.method;
    const endpoint = req.path;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Log que não expõe dados pessoais
    console.log(`[ACTIVITY] ${timestamp} | ${pseudonym} | ${method} ${endpoint} | IP: ${ip?.substring(0, 8)}***`);
    
    next();
  }
  
  /**
   * Middleware de validação de permissões por role
   */
  static requireRole(allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = req.user?.role;
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        console.log(`[SECURITY] Acesso negado para role ${userRole} em ${req.path}`);
        return res.status(403).json({ 
          message: 'Acesso negado - permissões insuficientes' 
        });
      }
      
      next();
    };
  }
  
  /**
   * Configuração de headers de segurança usando Helmet
   */
  static configureHelmet() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }
}

/**
 * Logger seguro para auditoria LGPD
 */
export class SecureLogger {
  
  /**
   * Log de ação sensível sem expor dados pessoais
   */
  static logSensitiveAction(
    userId: string, 
    action: string, 
    resource: string, 
    details?: any
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userPseudonym: DataEncryption.generatePseudonym(userId),
      action,
      resource,
      details: details ? JSON.stringify(details) : null,
      severity: 'INFO'
    };
    
    console.log(`[AUDIT] ${JSON.stringify(logEntry)}`);
  }
  
  /**
   * Log de tentativa de acesso não autorizado
   */
  static logUnauthorizedAccess(
    userId: string | null, 
    endpoint: string, 
    ip: string
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userPseudonym: userId ? DataEncryption.generatePseudonym(userId) : 'ANONYMOUS',
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      endpoint,
      ip: ip?.substring(0, 8) + '***',
      severity: 'WARNING'
    };
    
    console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
  }
  
  /**
   * Log de operação LGPD (exportação, exclusão, etc.)
   */
  static logLGPDOperation(
    userId: string,
    operation: 'EXPORT' | 'DELETE' | 'CONSENT_UPDATE' | 'DATA_ACCESS',
    success: boolean
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userPseudonym: DataEncryption.generatePseudonym(userId),
      action: `LGPD_${operation}`,
      success,
      severity: success ? 'INFO' : 'ERROR'
    };
    
    console.log(`[LGPD] ${JSON.stringify(logEntry)}`);
  }
}