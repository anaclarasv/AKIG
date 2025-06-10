/**
 * Utility functions for safe property access to prevent runtime errors
 * These functions provide null-safe access to nested object properties
 */

export const safeAnalysisValue = (session: any, property: string, defaultValue: any = 0) => {
  try {
    return session?.aiAnalysis?.[property] ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

export const safeUserValue = (user: any, property: string, defaultValue: any = '') => {
  try {
    return user?.[property] ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

export const safeNestedValue = (obj: any, path: string[], defaultValue: any = null) => {
  try {
    let current = obj;
    for (const key of path) {
      if (current == null) return defaultValue;
      current = current[key];
    }
    return current ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

export const formatScore = (score: any, decimals: number = 1): string => {
  try {
    const numScore = Number(score);
    return isNaN(numScore) ? '0.0' : numScore.toFixed(decimals);
  } catch {
    return '0.0';
  }
};

export const formatDuration = (duration: any): string => {
  try {
    const numDuration = Number(duration);
    if (isNaN(numDuration) || numDuration === 0) return 'N/A';
    return `${Math.floor(numDuration / 60)}:${String(numDuration % 60).padStart(2, '0')}`;
  } catch {
    return 'N/A';
  }
};