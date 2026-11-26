// api/crypto.ts — primitives crypto serveur (PBKDF2, comparaison en temps constant).

// Comparaison de hash en temps constant (évite l'oracle de timing sur le login).
export function hashesEqual(a: string, b: string): boolean {
  const A = new TextEncoder().encode(a);
  const B = new TextEncoder().encode(b);
  if (A.length !== B.length) return false;
  return crypto.subtle.timingSafeEqual(A, B);
}

// Plafond dur de WebCrypto dans le runtime Workers : deriveBits(PBKDF2) lève
// NotSupportedError au-delà de 100 000 itérations (500 sur /api/auth/* sinon).
// On prend donc le maximum permis par la plateforme.
export const PBKDF2_ITERATIONS = 100000;
export async function pbkdf2(password: string, sel: string): Promise<string> {
  const data = new TextEncoder().encode(`${sel}::${password}`);
  const key = await crypto.subtle.importKey('raw', data, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(sel),
      iterations: PBKDF2_ITERATIONS,
    },
    key,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
