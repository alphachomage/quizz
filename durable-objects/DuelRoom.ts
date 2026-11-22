/* global WebSocketPair, DurableObjectState, Env */
// durable-objects/DuelRoom.ts — Durable Object "room de duel" (V2).
// Une room = 2 joueurs + état de la partie, persisté par Cloudflare.
// Le duel temps réel passe par WebSocket : /api/duel/<roomId> -> ce DO.
// Préparé maintenant ; activé quand la V2 démarre (pas de migration de données avant).
// Types du runtime (DurableObjectState, Env, WebSocketPair...) :
// workers-env.d.ts, même dossier.

// Connexion WebSocket active d'un joueur de la room.
interface PlayerConnection {
  ws: WebSocket;
  pseudo: string;
}

export class DuelRoom {
  state: DurableObjectState;
  env: Env;
  players: PlayerConnection[];
  constructor(state: DurableObjectState, env: Env) {
    this.state = state; // stockage isolé du DO (SQLite côté Cloudflare)
    this.env = env;
    this.players = []; // connexions WebSocket actives
  }
  async fetch(request: Request): Promise<Response> {
    // WebSocket : /api/duel/<roomId>
    if (request.headers.get('Upgrade') === 'websocket') {
      const paire = new WebSocketPair();
      const [client, server] = Object.values(paire);
      this.state.acceptWebSocket(server);
      // Le pseudo vient du header x-voltquiz-pseudo posé par worker-api.ts = pseudo du
      // token Bearer vérifié avant l'upgrade (JAMAIS de la query string : un client ne
      // peut pas usurper l'identité d'un autre joueur).
      const pseudo = request.headers.get('x-voltquiz-pseudo') || 'Joueur';
      this.players.push({
        ws: server,
        pseudo,
      });
      this.diffuser({
        type: 'presence',
        players: this.players.map((j) => j.pseudo),
      });
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // HTTP : état de la room (utile pour rejoindre / rafraîchir).
    if (request.method === 'GET') {
      return Response.json({
        ok: true,
        players: this.players.map((j) => j.pseudo),
        etat: (await this.state.storage.get<string>('etat')) || 'attente',
      });
    }

    // POST : action de jeu (réponse, etc.) relayée aux deux joueurs.
    if (request.method === 'POST') {
      const action = await request.json().catch(() => ({}));
      this.diffuser({
        type: 'action',
        action,
      });
      return Response.json({
        ok: true,
      });
    }
    return Response.json(
      {
        ok: false,
        error: 'Méthode non supportée.',
      },
      {
        status: 405,
      }
    );
  }

  // Appelé à chaque message WebSocket reçu d'un joueur.
  async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      // L'expéditeur = le pseudo de la CONNEXION (token vérifié à l'upgrade), pas un
      // champ du message : un client ne peut pas se faire passer pour un autre.
      const joueur = this.players.find((j) => j.ws === ws);
      this.diffuser(
        {
          type: 'action',
          de: joueur ? joueur.pseudo : '?',
          action: data,
        },
        ws
      );
    } catch {
      // message invalide : ignoré
    }
  }

  // Connexion fermée : on retire le joueur.
  async webSocketClose(ws: WebSocket): Promise<void> {
    this.players = this.players.filter((j) => j.ws !== ws);
    this.diffuser({
      type: 'presence',
      players: this.players.map((j) => j.pseudo),
    });
  }
  diffuser(message: Record<string, unknown>, sauf: WebSocket | null = null): void {
    const text = JSON.stringify(message);
    for (const j of this.players) {
      if (j.ws !== sauf) {
        try {
          j.ws.send(text);
        } catch {
          /* socket fermé : ignoré */
        }
      }
    }
  }
}
