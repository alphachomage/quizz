import { useState } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { createAccount, connect, listPseudos, startGuest } from '@lib/accounts.js';

// Écran de compte : connexion ou création (pseudo + e-mail + mot de passe).
// 100 % local : les comptes vivent dans le navigateur de ce PC uniquement.
export default function Account({ onConnexion }) {
  const [tab, setTab] = useState('connexion');
  const [pseudo, setPseudoN] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mdp2, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [enCours, setEnCours] = useState(false);
  const pseudos = listPseudos();
  async function soumettre() {
    setError('');
    if (tab === 'creation' && password !== mdp2) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setEnCours(true);
    const res =
      tab === 'creation'
        ? await createAccount({
            pseudo: pseudo.trim(),
            email: email.trim(),
            password: password,
          })
        : await connect(pseudo.trim(), password);
    setEnCours(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onConnexion(res.pseudo);
  }
  return (
    <div className="ecran-centre">
      <div className="carte-compte">
        <div
          className="hero"
          style={{
            marginBottom: 18,
          }}
        >
          <div
            className="logo"
            style={{
              fontSize: '1.9rem',
            }}
          >
            <span
              className="logo-marque"
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#fff" d="M13.6 1.5 4.2 13.6h5.6L8.6 22.5l9.4-12.1h-5.6l1.2-8.9z" />
              </svg>
            </span>
            VoltQuiz
          </div>
          <p className="tagline">Réponds vite, réponds juste.</p>
        </div>

        <div className="onglets">
          <button
            className={tab === 'connexion' ? 'onglet actif' : 'onglet'}
            onClick={() => {
              setTab('connexion');
              setError('');
            }}
          >
            Connexion
          </button>
          <button
            className={tab === 'creation' ? 'onglet actif' : 'onglet'}
            onClick={() => {
              setTab('creation');
              setError('');
            }}
          >
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
            onChange={(e) => setPseudoN(e.target.value)}
            placeholder="Ex : Joris42"
            maxLength={20}
            list="pseudos-existants"
            autoComplete="username"
          />
        </div>

        {tab === 'creation' && (
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
          <label>Mot de passe{tab === 'creation' ? ' (8 caractères min)' : ''}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={tab === 'creation' ? 'new-password' : 'current-password'}
          />
        </div>

        {tab === 'creation' && (
          <div className="champ">
            <label>Confirmer le mot de passe</label>
            <input
              type="password"
              value={mdp2}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
        )}

        {error && (
          <p className="erreur">
            <Icon nom="alert" taille={15} /> {error}
          </p>
        )}

        <button className="btn-principal" disabled={enCours} onClick={soumettre}>
          {enCours ? 'Un instant…' : tab === 'creation' ? 'Créer mon compte' : 'Se connecter'}
        </button>

        <button className="btn-secondaire" onClick={() => onConnexion(startGuest())}>
          <Icon nom="user" taille={17} /> Jouer en invité
        </button>
        <p className="note-local">
          En mode invité tu joues tout de suite, mais{' '}
          <strong>
            sans XP de compte ni de thèmes, sans badges, sans titres et sans classement
          </strong>{' '}
          — crée un compte pour débloquer tout ça et tout garder.
        </p>

        {tab === 'creation' && (
          <p className="note-local">
            Le pseudo est vérifié automatiquement : aucun contenu haineux, discriminatoire ou
            insultant n'est accepté. Le mot de passe est stocké sous forme de hash salé (SHA-256),
            jamais en clair.
          </p>
        )}
      </div>
    </div>
  );
}
