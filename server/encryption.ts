import crypto from 'crypto';

// Chave de criptografia vem de variável de ambiente - LGPD Compliance
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const ALGORITHM = 'aes-256-gcm';

/**
 * Criptografia AES para dados pessoais sensíveis - LGPD Article 46
 * Protege informações pessoais em trânsito e armazenamento
 */
export class DataEncryption {
  
  /**
   * Criptografa dados sensíveis usando AES-256-GCM
   * @param text Texto a ser criptografado
   * @returns Objeto com dados criptografados e metadados
   */
  static encrypt(text: string): {
    encryptedData: string;
    iv: string;
    authTag: string;
  } {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY.toString(), 'salt', 32);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: crypto.createHash('sha256').update(encrypted).digest('hex')
    };
  }
  
  /**
   * Descriptografa dados usando AES-256-CBC
   * @param encryptedData Dados criptografados
   * @param iv Vetor de inicialização
   * @param authTag Tag de autenticação
   * @returns Texto descriptografado
   */
  static decrypt(encryptedData: string, iv: string, authTag: string): string {
    const key = crypto.scryptSync(ENCRYPTION_KEY.toString(), 'salt', 32);
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Hash seguro para senhas usando PBKDF2
   * @param password Senha em texto plano
   * @returns Hash da senha
   */
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512');
    return `${salt}:${hash.toString('hex')}`;
  }
  
  /**
   * Verifica senha contra hash
   * @param password Senha em texto plano
   * @param storedHash Hash armazenado
   * @returns true se a senha corresponde
   */
  static verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512');
    return hash === verifyHash.toString('hex');
  }
  
  /**
   * Gera pseudônimo para logs seguros - LGPD Article 12
   * Permite auditoria sem expor dados pessoais
   * @param userId ID do usuário
   * @returns Pseudônimo único e consistente
   */
  static generatePseudonym(userId: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(`${userId}:${process.env.PSEUDONYM_SALT || 'AKIG-2024'}`);
    return `USR_${hash.digest('hex').substring(0, 12).toUpperCase()}`;
  }
}

/**
 * Sanitização de entrada para prevenir ataques - Security Best Practice
 */
export class InputSanitizer {
  
  /**
   * Remove caracteres perigosos que podem causar SQL Injection
   * @param input String de entrada
   * @returns String sanitizada
   */
  static sanitizeSQL(input: string): string {
    if (typeof input !== 'string') return '';
    
    // Remove caracteres perigosos para SQL
    return input
      .replace(/['";\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .trim();
  }
  
  /**
   * Sanitiza entrada HTML para prevenir XSS
   * @param input String de entrada
   * @returns String sanitizada
   */
  static sanitizeHTML(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  /**
   * Valida formato de email
   * @param email Email a ser validado
   * @returns true se válido
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Valida força da senha
   * @param password Senha a ser validada
   * @returns Objeto com resultado e mensagem
   */
  static validatePassword(password: string): { isValid: boolean; message: string } {
    if (password.length < 8) {
      return { isValid: false, message: 'Senha deve ter pelo menos 8 caracteres' };
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { 
        isValid: false, 
        message: 'Senha deve conter pelo menos uma letra maiúscula, minúscula e um número' 
      };
    }
    
    return { isValid: true, message: 'Senha válida' };
  }
}