// lib/nav.js — SEUL endroit de lib/ à toucher window.location (règle R5 :
// aucun composant ne lit/écrit l'URL ou ne recharge la page directement).
// La variante "flags d'URL" de ces fonctions vit dans app/urlFlags.js.

// Origine absolue du site (ex. https://voltquiz.joris-leo81.workers.dev).
export function origineActuelle() {
  return window.location.origin;
}

// Recharge complètement la page (bouton « Recharger » de l'ErrorBoundary).
export function rechargerPage() {
  window.location.reload();
}
