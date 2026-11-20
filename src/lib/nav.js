// lib/nav.js — SEUL endroit de lib/ à toucher window.location (règle R5 :
// aucun composant ne lit/écrit l'URL ou ne recharge la page directement).
// La variante "flags d'URL" de ces fonctions vit dans app/urlFlags.js.

// Origine absolue du site (ex. https://voltquiz.joris-leo81.workers.dev).
export function origineActuelle() {
  return window.location.origin;
}

// Lit UN paramètre de l'URL actuelle (ex. ?jour=libre, ?stockage=d1) sans recharger.
// Version "lib" de app/urlFlags.js (R1 interdit à lib d'importer app/) — urlFlags.js
// la réexporte. try/catch : utilisable aussi hors navigateur (Node pur, tests).
export function lireParamUrl(nom) {
  try {
    return new URLSearchParams(window.location.search).get(nom);
  } catch {
    return null;
  }
}

// Recharge complètement la page (bouton « Recharger » de l'ErrorBoundary).
export function rechargerPage() {
  window.location.reload();
}
