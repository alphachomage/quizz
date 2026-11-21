// urlFlags.ts — SEUL module habilité à lire window.location / window.history
// (règle R5 : aucun composant ne touche window.location directement).
// Gère les flags d'URL de la version d'essai : ?admin=1 ?reset=1 ?resetcompte=1 ?tuto=1
// (?admin=1 est ensuite VÉRIFIÉ côté serveur : voir app/useAdminAccess.ts + ADMIN_PSEUDOS).

/** Flags d'URL lus au démarrage de l'appli. */
export interface UrlFlags {
  admin: boolean;
  reset: boolean;
  resetcompte: boolean;
  tutorial: boolean;
}

// Lit les flags présents dans l'URL actuelle.
export function readUrlFlags(): UrlFlags {
  const params = new URLSearchParams(window.location.search);
  return {
    admin: params.get('admin') === '1',
    reset: params.get('reset') === '1',
    resetcompte: params.get('resetcompte') === '1',
    tutorial: params.get('tuto') === '1',
  };
}

// Retire des flags de l'URL sans recharger la page (history.replaceState).
function clearUrlFlags(noms: string[]): void {
  const params = new URLSearchParams(window.location.search);
  for (const n of noms) params.delete(n);
  const qs = params.toString();
  window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
}

// URL de l'appli sans le flag ?admin=1 (utilisée pour quitter la vue admin,
// avec rechargement complet pour retirer les exclusions du pool).
export { clearUrlFlags };
export function urlWithoutAdminFlag(): string {
  const params = new URLSearchParams(window.location.search);
  params.delete('admin');
  const qs = params.toString();
  return window.location.pathname + (qs ? `?${qs}` : '');
}

// URL de l'appli avec UN paramètre posé (ex. ?reset=1, ?stockage=d1) en conservant
// les flags déjà présents (admin=1...) — utilisée par le tableau de bord admin.
function urlWithParam(nom: string, value: string): string {
  const params = new URLSearchParams(window.location.search);
  params.set(nom, value);
  const qs = params.toString();
  return window.location.pathname + (qs ? `?${qs}` : '');
}

// URL de l'appli avec UN paramètre supprimé (ex. retirer ?stockage=d1).
export { urlWithParam };
function urlWithoutParam(nom: string): string {
  const params = new URLSearchParams(window.location.search);
  params.delete(nom);
  const qs = params.toString();
  return window.location.pathname + (qs ? `?${qs}` : '');
}

// Recharge la page vers une URL donnée (ex. quitter la vue admin).
export { urlWithoutParam };
export function redirigerVers(url: string): void {
  window.location.assign(url);
}

// Lit UN paramètre de l'URL actuelle (ex. ?jour=libre) sans recharger.
// Implémentation dans lib/nav.ts (R1 : lib n'importe pas app, l'inverse est OK) :
// on la réexporte ici pour garder le point d'entrée unique côté app.
export { readUrlParam } from '@lib/nav.js';
