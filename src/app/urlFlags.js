// urlFlags.js — SEUL module habilité à lire window.location / window.history
// (règle R5 : aucun composant ne touche window.location directement).
// Gère les flags d'URL de la version d'essai : ?admin=1 ?reset=1 ?resetcompte=1 ?tuto=1

// Lit les flags présents dans l'URL actuelle.
export function lireFlagsUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    admin: params.get('admin') === '1',
    reset: params.get('reset') === '1',
    resetcompte: params.get('resetcompte') === '1',
    tuto: params.get('tuto') === '1',
  };
}

// Retire des flags de l'URL sans recharger la page (history.replaceState).
export function retirerFlagsUrl(noms) {
  const params = new URLSearchParams(window.location.search);
  for (const n of noms) params.delete(n);
  const qs = params.toString();
  window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
}

// URL de l'appli sans le flag ?admin=1 (utilisée pour quitter la vue admin,
// avec rechargement complet pour retirer les exclusions du pool).
export function urlSansFlagAdmin() {
  const params = new URLSearchParams(window.location.search);
  params.delete('admin');
  const qs = params.toString();
  return window.location.pathname + (qs ? `?${qs}` : '');
}

// Recharge la page vers une URL donnée (ex. quitter la vue admin).
export function redirigerVers(url) {
  window.location.assign(url);
}

// Lit UN paramètre de l'URL actuelle (ex. ?jour=libre) sans recharger.
export function lireParamUrl(nom) {
  return new URLSearchParams(window.location.search).get(nom);
}
