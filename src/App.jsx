import { useEffect, useMemo, useRef, useState } from 'react';
import Accueil from './components/Accueil.jsx';
import Partie from './components/Partie.jsx';
import Resultat from './components/Resultat.jsx';
import FormulaireQuestion from './components/FormulaireQuestion.jsx';
import Classement from './components/Classement.jsx';
import Stats from './components/Stats.jsx';

import Badges from './components/Badges.jsx';
import AdminSignales from './components/AdminSignales.jsx';
import Compte from './components/Compte.jsx';
import Tuto from './components/Tuto.jsx';

import Deblocage from './components/Deblocage.jsx';

import { calculerBadges } from './lib/badges.js';

import { calculerTitres } from './lib/titres.js';

import { jouerSon, vibrer } from './lib/sons.js';
import { sessionActuelle, deconnecter, aVuTuto, marquerTutoVu } from './lib/comptes.js';
import { reinitialiserScores, reinitialiserProgression, chargerPrefs, sauverPrefs } from './lib/logique.js';
import { THEMES as QUESTIONS_BASE } from './data/questions.js';
import { chargerSoumissions, ajouterSoumission, supprimerSoumission, chargerValidees, validerSoumission, exporterSoumissionsJSON } from './lib/logique.js';

// App = le chef d'orchestre : il garde en mémoire l'écran actuel
// (accueil / partie / résultats / formulaire) et fusionne les 3 sources
// de questions : base intégrée + fichier perso + propositions locales.
export default function App() {
  const [ecran, setEcran] = useState('accueil');
  const [config, setConfig] = useState(null); // { mode, niveau, theme, joueurs }
  const [resultat, setResultat] = useState(null);
  const [themesBase, setThemesBase] = useState(QUESTIONS_BASE); // base + fichier perso
  const [soumissions, setSoumissions] = useState(() => chargerSoumissions()); // en attente de validation
  const [validees, setValidees] = useState(() => chargerValidees()); // validées = jouables
  const [session, setSession] = useState(() => sessionActuelle()); // compte local connecté (ou invité)
  const estInvite = !!(session && session.invite); // mode invité : pas d'XP, badges, titres ni leaderboard
  const [prefs, setPrefs] = useState(() => chargerPrefs()); // sons / animations / vibrations
  const [tutoOuvert, setTutoOuvert] = useState(false); // tuto de bienvenue (1ere connexion seulement)
  // Animation de déblocage (badge/titre nouveau) affichée sur l'accueil après un quizz :
  // snapshot des déblocages au LANCEMENT de la partie, diff au moment où elle se termine.
  const snapshotRef = useRef(null);
  const [celebration, setCelebration] = useState(null); // { badges: [...], titres: [...] }
  // Vue admin des questions signalées, uniquement via ?admin=1 (jamais affichée dans le jeu)
  const [estAdmin, setEstAdmin] = useState(() => new URLSearchParams(window.location.search).get('admin') === '1');

  function quitterAdmin() {
    // On recharge la page sans ?admin=1 : les questions retirées du pool par l'admin
    // (liste d'exclusion) sont alors réellement retirées au rechargement.
    const params = new URLSearchParams(window.location.search);
    params.delete('admin');
    const qs = params.toString();
    window.location.assign(window.location.pathname + (qs ? `?${qs}` : ''));
  }

  function changerPrefs(nouvelles) {
    sauverPrefs(nouvelles);
    setPrefs(nouvelles);
  }

  // Accessibilité : les classes de body pilotent le thème clair, le mode daltonien et le mode dys.
  useEffect(() => {
    const b = document.body;
    b.classList.toggle('theme-clair', prefs.themeClair === true);
    b.classList.toggle('daltonien', prefs.daltonien === true);
    b.classList.toggle('dys', prefs.dys === true);
  }, [prefs]);

  // Tuto de bienvenue : ouvert UNE SEULE FOIS par compte, à la première connexion.
  // On peut aussi le rouvrir à volonté avec ?tuto=1 ou le bouton "?" de la barre utilisateur.
  // Mode invité : pseudo aléatoire à chaque session → clé fixe "invite" pour ne l'ouvrir qu'une fois.
  const cleTuto = session ? (session.invite ? 'invite' : session.pseudo) : null;
  useEffect(() => {
    const force = new URLSearchParams(window.location.search).get('tuto') === '1';
    if (!estAdmin && (force || (cleTuto && !aVuTuto(cleTuto)))) setTutoOuvert(true);
  }, [session, estAdmin]);

  function fermerTuto() {
    if (cleTuto) marquerTutoVu(cleTuto);
    setTutoOuvert(false);
  }

  // Reset manuel sur la version d'essai : ouvrir l'app avec ?reset=1
  // vide records + leaderboards (historique des parties) + XP + séries mémorisées,
  // UNE fois, puis nettoie l'URL (aucun bouton ajouté).
  // ?resetcompte=1 : reset TOTAL de la progression (niveau 1, XP thèmes à 0,
  // badges + titres re-verrouillés, streak du jour à 0) — questions perso conservées.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const faireReset = params.get('reset') === '1';
    const faireResetCompte = params.get('resetcompte') === '1';
    if (faireReset) {
      reinitialiserScores();
      params.delete('reset');
    }
    if (faireResetCompte) {
      reinitialiserProgression();
      params.delete('resetcompte');
    }
    if (faireReset || faireResetCompte) {
      const qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
  }, []);

  // Au chargement : on fusionne la base intégrée avec le fichier questions-utilisateur.json
  useEffect(() => {
    fetch('/questions-utilisateur.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.themes) && data.themes.length > 0) {
          setThemesBase(fusionThemes(QUESTIONS_BASE, data.themes));
        }
      })
      .catch(() => {
        // pas de fichier perso : on garde la base intégrée
      });
  }, []);

  // Thèmes finaux = base/fichier + questions VALIDÉES manuellement (localStorage).
  // Les questions merely "proposées" (en attente) ne sont PAS jouables tant qu'elles ne sont pas validées.
  const themes = useMemo(() => {
    const map = new Map(themesBase.map((t) => [t.id, { ...t, questions: [...t.questions] }]));
    for (const s of validees) {
      const question = { q: s.q, reponses: s.reponses, bonne: s.bonne, niveau: s.niveau };
      if (s.info) question.info = s.info;
      if (map.has(s.themeId)) {
        map.get(s.themeId).questions.push(question);
      } else {
        map.set(s.themeId, {
          id: s.themeId,
          nom: s.themeId,
          icone: 'question',
          couleur: '#8b5cf6',
          questions: [question],
        });
      }
    }
    return [...map.values()];
  }, [themesBase, validees]);

  // Liste plate de toutes les questions connues (base + validées + en attente)
  // pour la détection de similarité lors d'une proposition.
  const toutesQuestions = useMemo(() => {
    const depuisThemes = themes.flatMap((t) =>
      t.questions.map((q) => ({ ...q, themeId: t.id, themeNom: t.nom, themeCouleur: t.couleur }))
    );
    const enAttente = soumissions.map((s) => ({
      q: s.q,
      reponses: s.reponses,
      bonne: s.bonne,
      niveau: s.niveau,
      themeId: s.themeId,
      themeNom: themes.find((t) => t.id === s.themeId)?.nom || s.themeId,
      themeCouleur: themes.find((t) => t.id === s.themeId)?.couleur || '#8b5cf6',
    }));
    return [...depuisThemes, ...enAttente];
  }, [themes, soumissions]);

  function demarrer(cfg) {
    // snapshot des badges/titres déjà débloqués avant la partie
    snapshotRef.current = {
      badges: new Set(calculerBadges().filter((b) => b.debloque).map((b) => b.id)),
      titres: new Set(calculerTitres().filter((t) => t.debloque).map((t) => t.id)),
    };
    setConfig(cfg);
    setEcran('partie');
  }

  function terminer(res) {
    // badges / titres débloqués PENDANT cette partie -> animation sur l'accueil au retour
    const snap = snapshotRef.current || { badges: new Set(), titres: new Set() };
    const nouveauxBadges = calculerBadges().filter((b) => b.debloque && !snap.badges.has(b.id));
    const nouveauxTitres = calculerTitres().filter((t) => t.debloque && !snap.titres.has(t.id));
    if (!estInvite && (nouveauxBadges.length || nouveauxTitres.length)) {
      setCelebration({ badges: nouveauxBadges, titres: nouveauxTitres });
      jouerSon('tonnerre', prefs); // grondement d'éclair doux au déblocage
      vibrer([70, 50, 130], prefs);
    }
    setResultat(res);
    setEcran('resultat');
  }

  function ajouterQuestion(q) {
    ajouterSoumission(q);
    setSoumissions(chargerSoumissions());
    setEcran('accueil');
  }

  function supprimerQuestion(id) {
    supprimerSoumission(id);
    setSoumissions(chargerSoumissions());
  }

  // Validation manuelle : la question quitte la liste des propositions et devient jouable.
  function validerQuestion(id) {
    validerSoumission(id);
    setSoumissions(chargerSoumissions());
    setValidees(chargerValidees());
  }

  // Vue admin (?admin=1) : prioritaire, même sans compte connecté.
  if (estAdmin) {
    return (
      <div className={prefs.animations === false ? 'app sans-animations' : 'app'}>
        <AdminSignales
          onQuitter={quitterAdmin}
          themes={themes}
          soumissions={soumissions}
          nbValidees={validees.length}
          onValiderSoumission={validerQuestion}
          onSupprimerSoumission={supprimerQuestion}
          onExporterValidees={() => telechargerJSON(exporterSoumissionsJSON(validees, themes))}
        />
      </div>
    );
  }

  // Sans compte connecté, on affiche d'abord l'écran de connexion/création de compte.
  if (!session) {
    return (
      <div className={prefs.animations === false ? 'app sans-animations' : 'app'}>
        {tutoOuvert && <Tuto onFermer={fermerTuto} estInvite={false} />}
        <Compte onConnexion={() => setSession(sessionActuelle())} />
      </div>
    );
  }

  return (
    <div className={prefs.animations === false ? 'app sans-animations' : 'app'}>
      {tutoOuvert && !estAdmin && <Tuto onFermer={fermerTuto} estInvite={estInvite} />}
      {ecran === 'accueil' && (
        <Accueil
          themes={themes}
          pseudo={session.pseudo}
          prefs={prefs}
          estAdmin={estAdmin}
          estInvite={estInvite}
          onDeconnexion={() => { deconnecter(); setSession(null); setEcran('accueil'); }}
          onDemarrer={demarrer}
          onProposer={() => setEcran('formulaire')}
          onClassement={() => setEcran('classement')}
          onStats={() => setEcran('stats')}
          onBadges={() => setEcran('badges')}
          onChangerPrefs={changerPrefs}
          onTuto={() => setTutoOuvert(true)}
        />
      )}
      {ecran === 'classement' && (
        <Classement themes={themes} onAccueil={() => setEcran('accueil')} onStats={() => setEcran('stats')} />
      )}
      {ecran === 'stats' && <Stats themes={themes} pseudo={session.pseudo} onAccueil={() => setEcran('accueil')} />}
      {ecran === 'badges' && <Badges themes={themes} onAccueil={() => setEcran('accueil')} />}
      {ecran === 'partie' && config && <Partie config={config} prefs={prefs} onTerminer={terminer} />}
      {ecran === 'resultat' && resultat && config && (
        <Resultat
          resultat={resultat}
          prefs={prefs}
          themes={themes}
          estInvite={estInvite}
          onRejouer={() => setEcran('partie')}
          onAccueil={() => setEcran('accueil')}
        />
      )}
      {ecran === 'formulaire' && (
        <FormulaireQuestion
          themes={themes}
          toutesQuestions={toutesQuestions}
          onAjouter={ajouterQuestion}
          onAnnuler={() => setEcran('accueil')}
        />
      )}
      {ecran === 'accueil' && celebration && (
        <Deblocage
          celebration={celebration}
          onFermer={() => setCelebration(null)}
          onVoirBadges={() => { setCelebration(null); setEcran('badges'); }}
        />
      )}
    </div>
  );
}

// Fusionne les thèmes perso (fichier JSON) avec la base : même id = questions ajoutées.
function fusionThemes(base, perso) {
  const map = new Map(base.map((t) => [t.id, { ...t, questions: [...t.questions] }]));
  for (const t of perso) {
    if (!t || !t.id || !Array.isArray(t.questions)) continue;
    if (map.has(t.id)) {
      const existant = map.get(t.id);
      existant.questions = [...existant.questions, ...t.questions];
      if (t.nom) existant.nom = t.nom;
      if (t.icone) existant.icone = t.icone;
      if (t.couleur) existant.couleur = t.couleur;
    } else {
      map.set(t.id, {
        id: t.id,
        nom: t.nom || t.id,
        icone: t.icone || 'question',
        couleur: t.couleur || '#8b5cf6',
        questions: t.questions,
      });
    }
  }
  return [...map.values()];
}

// Télécharge un fichier JSON (utilisé pour l'export des questions proposées).
function telechargerJSON(json) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'questions-utilisateur.json';
  a.click();
  URL.revokeObjectURL(url);
}
