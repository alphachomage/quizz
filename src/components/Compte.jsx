import { useState } from 'react';
import Icone from './Icone.jsx';
import { creerCompte, connecter, listePseudos, demarrerInvite } from '../lib/comptes.js';

// Écran de compte : connexion ou création (pseudo + e-mail + mot de passe).
// 100 % local : les comptes vivent dans le navigateur de ce PC uniquement.
export default function Compte({ onConnexion }) {
  const [onglet, setOnglet] = useState('connexion');
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [mdp2, setMdp2] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const pseudos = listePseudos();

  async function soumettre() {
    setErreur('');
    if (onglet === 'creation' && mdp !== mdp2) {
      setErreur('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setEnCours(true);
    const res =
      onglet === 'creation'
        ? await creerCompte({ pseudo: pseudo.trim(), email: email.trim(), mdp })
        : await connecter(pseudo.trim(), mdp);
    setEnCours(false);
    if (!res.ok) {
      setErreur(res.erreur);
      return;
    }
    onConnexion(res.pseudo);
  }

  return (
    <div className="ecran-centre">
      <div className="carte-compte">
        <div className="hero" style={{ marginBottom: 18 }}>
          <div className="logo" style={{ fontSize: '1.9rem' }}>
            <span className="logo-marque" style={{ width: 46, height: 46, borderRadius: 14 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#fff" d="M13.6 1.5 4.2 13.6h5.6L8.6 22.5l9.4-12.1h-5.6l1.2-8.9z" />
              </svg>
            </span>
            VoltQuiz
          </div>
          <p className="tagline">
            Crée ton compte local (pseudo + e-mail + mot de passe). Tout reste sur ce PC, rien n'est envoyé sur internet.
          </p>
        </div>

        <div className="onglets">
          <button className={onglet === 'connexion' ? 'onglet actif' : 'onglet'} onClick={() => { setOnglet('connexion'); setErreur(''); }}>
            Connexion
          </button>
          <button className={onglet === 'creation' ? 'onglet actif' : 'onglet'} onClick={() => { setOnglet('creation'); setErreur(''); }}>
            Créer un compte
          </button>
        </div>

        <datalist id="pseudos-existants">
          {pseudos.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>

        <div className="champ">
          <label>Pseudo</label>
          <input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Ex : Joris42"
            maxLength={20}
            list="pseudos-existants"
            autoComplete="username"
          />
        </div>

        {onglet === 'creation' && (
          <div className="champ">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@exemple.fr"
              autoComplete="email"
            />
          </div>
        )}

        <div className="champ">
          <label>Mot de passe{onglet === 'creation' ? ' (8 caractères min)' : ''}</label>
          <input
            type="password"
            value={mdp}
            onChange={(e) => setMdp(e.target.value)}
            placeholder="••••••••"
            autoComplete={onglet === 'creation' ? 'new-password' : 'current-password'}
          />
        </div>

        {onglet === 'creation' && (
          <div className="champ">
            <label>Confirmer le mot de passe</label>
            <input
              type="password"
              value={mdp2}
              onChange={(e) => setMdp2(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
        )}

        {erreur && (
          <p className="erreur"><Icone nom="alert" taille={15} /> {erreur}</p>
        )}

        <button className="btn-principal" disabled={enCours} onClick={soumettre}>
          {enCours ? 'Un instant…' : onglet === 'creation' ? 'Créer mon compte' : 'Se connecter'}
        </button>

        <button className="btn-secondaire" onClick={() => onConnexion(demarrerInvite())}>
          <Icone nom="user" taille={17} /> Jouer en invité
        </button>
        <p className="note-local">
          En mode invité tu joues tout de suite, mais <strong>sans XP de compte ni de thèmes, sans badges,
          sans titres et sans leaderboard</strong> — crée un compte pour débloquer tout ça et tout garder.
        </p>

        {onglet === 'creation' && (
          <p className="note-local">
            Le pseudo est vérifié automatiquement : aucun contenu haineux, discriminatoire ou insultant n'est accepté.
            Le mot de passe est stocké sous forme de hash salé (SHA-256), jamais en clair.
          </p>
        )}
      </div>
    </div>
  );
}
