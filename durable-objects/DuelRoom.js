/* global WebSocketPair */
// durable-objects/DuelRoom.js — Durable Object "room de duel" (V2).
// Une room = 2 joueurs + état de la partie, persisté par Cloudflare.
// Le duel temps réel passe par WebSocket : /api/duel/<roomId> -> ce DO.
// Préparé maintenant ; activé quand la V2 démarre (pas de migration de données avant).

export class DuelRoom {
  constructor(state, env) {
    this.state = state; // stockage isolé du DO (SQLite côté Cloudflare)
    this.env = env;
    this.joueurs = []; // connexions WebSocket actives
  }

  async fetch(request) {
    const url = new URL(request.url);

    // WebSocket : /api/duel/<roomId>
    if (request.headers.get('Upgrade') === 'websocket') {
      const paire = new WebSocketPair();
      const [client, serveur] = Object.values(paire);
      this.state.acceptWebSocket(serveur);
      const pseudo = url.searchParams.get('pseudo') || 'Joueur';
      this.joueurs.push({ ws: serveur, pseudo });
      this.diffuser({ type: 'presence', joueurs: this.joueurs.map((j) => j.pseudo) });
      return new Response(null, { status: 101, webSocket: client });
    }

    // HTTP : état de la room (utile pour rejoindre / rafraîchir).
    if (request.method === 'GET') {
      return Response.json({
        ok: true,
        joueurs: this.joueurs.map((j) => j.pseudo),
        etat: await this.state.storage.get('etat') || 'attente',
      });
    }

    // POST : action de jeu (réponse, etc.) relayée aux deux joueurs.
    if (request.method === 'POST') {
      const action = await request.json().catch(() => ({}));
      this.diffuser({ type: 'action', action });
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false, erreur: 'Méthode non supportée.' }, { status: 405 });
  }

  // Appelé à chaque message WebSocket reçu d'un joueur.
  async webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      this.diffuser({ type: 'action', de: data.pseudo || '?', action: data }, ws);
    } catch {
      // message invalide : ignoré
    }
  }

  // Connexion fermée : on retire le joueur.
  async webSocketClose(ws) {
    this.joueurs = this.joueurs.filter((j) => j.ws !== ws);
    this.diffuser({ type: 'presence', joueurs: this.joueurs.map((j) => j.pseudo) });
  }

  diffuser(message, sauf = null) {
    const texte = JSON.stringify(message);
    for (const j of this.joueurs) {
      if (j.ws !== sauf) {
        try { j.ws.send(texte); } catch { /* socket fermé : ignoré */ }
      }
    }
  }
}
