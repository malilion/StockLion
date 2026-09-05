export type CredentialStatus =
  | 'missing'
  | 'unverified'
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'rate-limited'
  | 'temporary-error';

export interface StoredCredential {
  id: string;
  providerId: string;
  fields: Record<string, string>;
  status: CredentialStatus;
  validatedAt?: string;
  lastErrorCode?: string;
}

export function maskApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••${suffix}`;
}

export function isCredentialValid(cred: StoredCredential | null | undefined): boolean {
  return cred?.status === 'valid';
}
