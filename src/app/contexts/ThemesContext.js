// ThemesContext.js — catalogue de thèmes : base intégrée + fichier perso (fetch)
// + questions validées (localStorage), et la liste plate pour la détection de similarité.
import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';

import { loadThemes } from '@data/questions.js';
import {
  loadSubmissions,
  addSubmission,
  removeSubmission,
  loadApproved,
  approveSubmission,
  exportSubmissionsJson,
} from '@lib/submissions.js';
import { validatePersonalFile, validateSubmissions } from '@lib/schema.js';
import { fusionThemes } from '@shared/utils/mergeThemes.js';

const ThemesContext = createContext(null);

export function ThemesProvider({ children }) {
  const [themesBase, setThemesBase] = useState(null); // null = questions en cours de chargement (chunks lazy)
  const [soumissions, setSoumissions] = useState(() => validateSubmissions(loadSubmissions())); // en attente de validation
  const [validees, setValidees] = useState(() => validateSubmissions(loadApproved())); // validées = jouables

  // Au chargement : on charge les questions (chunks lazy) puis on fusionne le
  // fichier questions-utilisateur.json par-dessus la base intégrée.
  useEffect(() => {
    let actif = true;
    const controleur = new AbortController();
    (async () => {
      try {
        const base = await loadThemes();
        const persoBrut = await fetch('/questions-utilisateur.json', { signal: controleur.signal })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (!actif) return;
        // Donnée externe (fetch) : validée par schéma zod avant usage.
        const perso = validatePersonalFile(persoBrut);
        setThemesBase(perso ? fusionThemes(base, perso.themes) : base);
      } catch {
        if (actif) setThemesBase([]); // échec de chargement : catalogue vide plutôt que crash
      }
    })();
    return () => {
      actif = false;
      controleur.abort();
    };
  }, []);

  // Thèmes finaux = base/fichier + questions VALIDÉES manuellement (localStorage).
  // Les questions merely « proposées » (en attente) ne sont PAS jouables.
  const themes = useMemo(() => {
    if (!themesBase) return null; // chargement en cours
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
    if (!themes) return [];
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

  // Actions sur les propositions (validation manuelle côté admin).
  const actions = useMemo(
    () => ({
      ajouterQuestion: (q) => {
        addSubmission(q);
        setSoumissions(loadSubmissions());
      },
      supprimerQuestion: (id) => {
        removeSubmission(id);
        setSoumissions(loadSubmissions());
      },
      validerQuestion: (id) => {
        approveSubmission(id);
        setSoumissions(loadSubmissions());
        setValidees(loadApproved());
      },
      exporterValidees: () => exportSubmissionsJson(validees, themes),
    }),
    [validees, themes]
  );

  const valeur = { themes, toutesQuestions, soumissions, validees, nbValidees: validees.length, ...actions };
  return createElement(ThemesContext.Provider, { value: valeur }, children);
}

export function useThemes() {
  const ctx = useContext(ThemesContext);
  if (!ctx) throw new Error('useThemes doit être utilisé sous <ThemesProvider>');
  return ctx;
}
