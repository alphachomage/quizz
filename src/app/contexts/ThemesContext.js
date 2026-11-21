// ThemesContext.js — catalogue de thèmes : base intégrée + fichier personal (fetch)
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
import { mergeThemes } from '@shared/utils/mergeThemes.js';
const ThemesContext = createContext(null);
export function ThemesProvider({ children }) {
  const [baseThemes, setBaseThemes] = useState(null); // null = questions en cours de chargement (chunks lazy)
  const [submissions, setSubmissions] = useState(() => validateSubmissions(loadSubmissions())); // en attente de validation
  const [validees, setValidees] = useState(() => validateSubmissions(loadApproved())); // validées = jouables

  // Au chargement : on charge les questions (chunks lazy) puis on fusionne le
  // fichier questions-utilisateur.json par-dessus la base intégrée.
  useEffect(() => {
    let active = true;
    const controleur = new AbortController();
    (async () => {
      try {
        const base = await loadThemes();
        const rawPersonal = await fetch('/questions-utilisateur.json', {
          signal: controleur.signal,
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (!active) return;
        // Donnée externe (fetch) : validée par schéma zod avant usage.
        const personal = validatePersonalFile(rawPersonal);
        setBaseThemes(personal ? mergeThemes(base, personal.themes) : base);
      } catch {
        if (active) setBaseThemes([]); // échec de chargement : catalogue vide plutôt que crash
      }
    })();
    return () => {
      active = false;
      controleur.abort();
    };
  }, []);

  // Thèmes finaux = base/fichier + questions VALIDÉES manuellement (localStorage).
  // Les questions merely « proposées » (en attente) ne sont PAS jouables.
  const themes = useMemo(() => {
    if (!baseThemes) return null; // chargement en cours
    const map = new Map(
      baseThemes.map((t) => [
        t.id,
        {
          ...t,
          questions: [...t.questions],
        },
      ])
    );
    for (const s of validees) {
      const question = {
        q: s.q,
        reponses: s.reponses,
        bonne: s.bonne,
        niveau: s.niveau,
      };
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
  }, [baseThemes, validees]);

  // Liste plate de toutes les questions connues (base + validées + en attente)
  // pour la détection de similarité lors d'une proposition.
  const allQuestions = useMemo(() => {
    if (!themes) return [];
    const fromThemes = themes.flatMap((t) =>
      t.questions.map((q) => ({
        ...q,
        themeId: t.id,
        themeName: t.nom,
        themeColor: t.couleur,
      }))
    );
    const enAttente = submissions.map((s) => ({
      q: s.q,
      reponses: s.reponses,
      bonne: s.bonne,
      niveau: s.niveau,
      themeId: s.themeId,
      themeName: themes.find((t) => t.id === s.themeId)?.nom || s.themeId,
      themeColor: themes.find((t) => t.id === s.themeId)?.couleur || '#8b5cf6',
    }));
    return [...fromThemes, ...enAttente];
  }, [themes, submissions]);

  // Actions sur les propositions (validation manuelle côté admin).
  const actions = useMemo(
    () => ({
      addQuestion: (q) => {
        addSubmission(q);
        setSubmissions(loadSubmissions());
      },
      removeQuestion: (id) => {
        removeSubmission(id);
        setSubmissions(loadSubmissions());
      },
      approveQuestion: (id) => {
        approveSubmission(id);
        setSubmissions(loadSubmissions());
        setValidees(loadApproved());
      },
      exporterValidees: () => exportSubmissionsJson(validees, themes),
    }),
    [validees, themes]
  );
  const value = {
    themes,
    allQuestions: allQuestions,
    submissions: submissions,
    validees,
    approvedCount: validees.length,
    ...actions,
  };
  return createElement(
    ThemesContext.Provider,
    {
      value: value,
    },
    children
  );
}
export function useThemes() {
  const ctx = useContext(ThemesContext);
  if (!ctx) throw new Error('useThemes doit être utilisé sous <ThemesProvider>');
  return ctx;
}
