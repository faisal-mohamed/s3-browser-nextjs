'use client';

let envData: Record<string, string> | null = null;

export function getEnvVar(key: string): string | undefined {
  if (typeof window === 'undefined') {
    console.warn('getEnvVar called on server — no sessionStorage available');
    return undefined;
  }

  if (!envData) {
    const stored = sessionStorage.getItem('ENV_DATA');
    if (stored) {
      envData = JSON.parse(stored);
    }
  }

  return envData ? envData[key] : undefined;
}
