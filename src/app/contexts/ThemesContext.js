// ThemesContext.js — catalogue de thèmes : base intégrée + fichier perso (fetch)
// + questions validées (localStorage), et la liste plate pour la détection de similarité.
import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';

import { THEMES as QUESTIONS_BASE } from '@data/questions.js';
import {
  chargerSoumissions,
  ajouterSoumission,
  supprimerSoumission,
  chargerValidees,
  validerSoumission,
  exporterSoumissionsJSON,
} from '@lib/soumissions.js';
import { fusionThemes } from '@shared/utils/fusionThemes.js';

const ThemesContext = createContext(null);

export function ThemesProvider({ children }) {
  const [themesBase, setThemesBase] = useState(QUESTIONS_BASE); // base + fichier perso
  const [soumissions, setSoumissions] = useState(() => chargerSoumissions()); // en attente de validation
  const [validees, setValidees] = useState(() => chargerValidees()); // validées = jouables

  // Au chargement : on fusionne la base intégrée avec le fichier questions-utilisateur.json
  useEffect(() => {
    const controleur = new AbortController();
    fetch('/questions-utilisateur.json', { signal: controleur.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.themes) && data.themes.length > 0) {
          setThemesBase(fusionThemes(QUESTIONS_BASE, data.themes));
        }
      })
      .catch(() => {
        // pas de fichier perso (ou chargement interrompu) : on garde la base intégrée
      });
    return () => controleur.abort();
  }, []);

  // Thèmes finaux = base/fichier + questions VALIDÉES manuellement (localStorage).
  // Les questions merely « proposées » (en attente) ne sont PAS jouables.
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

  // Actions sur les propositions (validation manuelle côté admin).
  const actions = useMemo(
    () => ({
      ajouterQuestion: (q) => {
        ajouterSoumission(q);
        setSoumissions(chargerSoumissions());
      },
      supprimerQuestion: (id) => {
        supprimerSoumission(id);
        setSoumissions(chargerSoumissions());
      },
      validerQuestion: (id) => {
        validerSoumission(id);
        setSoumissions(chargerSoumissions());
        setValidees(chargerValidees());
      },
      exporterValidees: () => exporterSoumissionsJSON(validees, themes),
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
