import { useMemo, useState } from 'react';
import Icone, { Barres } from '@shared/ui/Icone.jsx';
import { NIVEAUX, chargerXP, niveauTheme, SEUIL_SOUMISSION_NIVEAU } from '@lib/index.js';
import { trouverSimilaires, SEUIL_SIMILAIRE, SEUIL_IDENTIQUE } from '@lib/similarite.js';

// Formulaire « Proposer une question ».
// À la validation, on compare la question à TOUTES les questions connues
// (base intégrée + fichier perso + propositions) et on avertit si des
// questions similaires existent déjà.
export default function FormulaireQuestion({ themes, toutesQuestions, onAjouter, onAnnuler }) {
  const xp = chargerXP();
  const niveauDe = (id) => niveauTheme(xp[id] || 0);
  const premierDebloque = themes.find((t) => niveauDe(t.id) >= SEUIL_SOUMISSION_NIVEAU);
  const [themeId, setThemeId] = useState(premierDebloque?.id || themes[0]?.id || '');
  const [niveau, setNiveau] = useState('moyen');
  const [texte, setTexte] = useState('');
  const [reponses, setReponses] = useState(['', '', '', '']);
  const [bonne, setBonne] = useState(null); // index dans le tableau `reponses`
  const [info, setInfo] = useState('');
  const [erreur, setErreur] = useState('');
  const [avertissement, setAvertissement] = useState(null); // [{ question, score }]

  // Indicateur en direct pendant la saisie (le meilleur match actuel).
  const topLive = useMemo(() => {
    if (texte.trim().length < 8) return null;
    const res = trouverSimilaires(texte, toutesQuestions, SEUIL_SIMILAIRE, 1);
    return res.length > 0 ? res[0] : null;
  }, [texte, toutesQuestions]);

  function setReponse(i, v) {
    setReponses((r) => r.map((x, j) => (j === i ? v : x)));
  }

  function valider() {
    if (!themeId) return 'Choisis un thème.';
    if (niveauDe(themeId) < SEUIL_SOUMISSION_NIVEAU) {
      return `Il faut être niveau ${SEUIL_SOUMISSION_NIVEAU} dans ce thème pour proposer une question (tu es niv. ${niveauDe(themeId)}). Joue pour gagner de l'XP !`;
    }
    if (texte.trim().length < 5) return 'La question est trop courte (5 caractères min).';
    const rep = reponses.map((r) => r.trim()).filter((r) => r !== '');
    if (rep.length < 2) return 'Il faut au moins 2 réponses proposées.';
    if (bonne === null || reponses[bonne].trim() === '') return 'Coche la bonne réponse.';
    return null;
  }

  function soumettre() {
    const err = valider();
    if (err) {
      setErreur(err);
      return;
    }
    setErreur('');
    // Vérification des similarités À LA REQUÊTE (comme demandé)
    const sim = trouverSimilaires(texte, toutesQuestions, SEUIL_SIMILAIRE, 5);
    if (sim.length > 0) {
      setAvertissement(sim);
      return;
    }
    ajouter();
  }

  function ajouter() {
    const rep = reponses.map((r) => r.trim());
    const filtrees = rep.filter((r) => r !== '');
    const bonneFiltre = filtrees.indexOf(rep[bonne]); // index dans la liste nettoyée
    onAjouter({
      themeId,
      q: texte.trim(),
      reponses: filtrees,
      bonne: bonneFiltre,
      niveau,
      info: info.trim() || undefined,
    });
  }

  function etiquette(score) {
    return score >= SEUIL_IDENTIQUE ? 'quasi identique' : 'similaire';
  }

  return (
    <div className="formulaire">
      <header className="hero">
        <div className="logo" style={{ fontSize: '1.7rem' }}>
          <span className="logo-marque" style={{ width: 42, height: 42, borderRadius: 13 }}>
            <Icone nom="pencil" taille={24} />
          </span>
          Proposer une question
        </div>
        <p className="tagline">
          Elle sera vérifiée contre les questions existantes (doublons signalés), puis placée en attente de ta
          validation dans « Questions proposées ». Une fois validée, elle devient jouable et disparaît de la liste.
        </p>
      </header>

      <div className="champ">
        <label>Thème</label>
        <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
          {themes.map((t) => {
            const n = niveauDe(t.id);
            const bloque = n < SEUIL_SOUMISSION_NIVEAU;
            return (
              <option key={t.id} value={t.id} disabled={bloque}>
                {t.nom} — niv. {n}{bloque ? ` (niv. ${SEUIL_SOUMISSION_NIVEAU} requis pour proposer)` : ''}
              </option>
            );
          })}
        </select>
        <p className="hint-sim">
          Proposer une question dans un thème demande le niveau {SEUIL_SOUMISSION_NIVEAU} dans ce thème
          (XP gagnée en jouant, voir la barre sur chaque thème).
        </p>
      </div>

      <div className="champ">
        <label>Niveau de difficulté</label>
        <div className="niveaux">
          {NIVEAUX.map((n, i) => (
            <button
              key={n.id}
              type="button"
              className={niveau === n.id ? 'niveau actif' : 'niveau'}
              style={{ '--couleur': n.couleur }}
              onClick={() => setNiveau(n.id)}
            >
              <Barres actives={i + 1} couleur={n.couleur} />
              <span>{n.nom}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="champ">
        <label>La question</label>
        <textarea
          rows={3}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Ex : Quelle est la capitale du Canada ?"
        />
        {topLive && (
          <p className="hint-sim">
            <Icone nom="alert" taille={14} /> Similarité détectée : {Math.round(topLive.score * 100)} % avec
            « {topLive.question.q} » ({topLive.question.themeNom})
          </p>
        )}
      </div>

      <div className="champ">
        <label>Les réponses (2 à 4) — coche la bonne</label>
        {reponses.map((r, i) => (
          <div key={i} className="ligne-reponse">
            <input
              type="radio"
              name="bonne"
              checked={bonne === i}
              onChange={() => setBonne(i)}
              title="Bonne réponse"
            />
            <input
              value={r}
              onChange={(e) => setReponse(i, e.target.value)}
              placeholder={`Réponse ${i + 1}`}
            />
          </div>
        ))}
      </div>

      <div className="champ">
        <label>Anecdote affichée après la réponse (optionnel)</label>
        <input value={info} onChange={(e) => setInfo(e.target.value)} placeholder="Ex : Beaucoup répondent Toronto !" />
      </div>

      {erreur && <p className="erreur"><Icone nom="alert" taille={15} /> {erreur}</p>}

      {avertissement && (
        <div className="alerte">
          <h3><Icone nom="alert" taille={20} /> {avertissement.length} question(s) similaire(s) trouvée(s)</h3>
          <ul className="liste-similaires">
            {avertissement.map((s, i) => (
              <li key={i} className="sim-item">
                <div className="sim-haut">
                  <span className={`sim-score ${s.score >= SEUIL_IDENTIQUE ? 'identique' : ''}`}>
                    {Math.round(s.score * 100)} % — {etiquette(s.score)}
                  </span>
                  <span className="sim-theme" style={{ background: s.question.themeCouleur || '#8b5cf6' }}>
                    {s.question.themeNom}
                  </span>
                </div>
                <div className="sim-texte">« {s.question.q} »</div>
                <div className="barre-sim">
                  <div
                    className="barre-sim-rempli"
                    style={{
                      width: `${Math.round(s.score * 100)}%`,
                      background: s.score >= SEUIL_IDENTIQUE ? '#ff5d73' : '#ffb020',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="alerte-texte">Tu es sûr de vouloir ajouter cette question malgré les ressemblances ?</p>
          <div className="alerte-actions">
            <button className="btn-principal" onClick={ajouter}>Oui, ajouter quand même</button>
            <button className="btn-secondaire" onClick={() => setAvertissement(null)}>Modifier ma question</button>
          </div>
        </div>
      )}

      {!avertissement && (
        <div className="actions">
          <button className="btn-principal" onClick={soumettre}>
            <Icone nom="check" taille={18} /> Vérifier et ajouter
          </button>
          <button className="btn-secondaire" onClick={onAnnuler}>
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
