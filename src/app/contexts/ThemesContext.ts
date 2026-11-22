// ThemesContext.ts — catalogue de thèmes : base intégrée + fichier personal (fetch)
// + questions validées (localStorage), et la liste plate pour la détection de similarité.
import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { loadThemes } from '@data/questions.js';
import {
  loadSubmissions,
  addSubmission,
  loadApproved,
  approveSubmission,
  exportSubmissionsJson,
} from '@lib/submissions.js';
import type { ApprovedSubmission } from '@lib/submissions.js';
import { loadCommunityQuestions } from '@lib/community.js';
import { normalizeQuestionText } from '@lib/text.js';
import { validatePersonalFile, validateSubmissions } from '@lib/schema.js';
import { mergeThemes } from '@shared/utils/mergeThemes.js';
import type { Question, Submission, TaggedQuestion, Theme } from '@lib/types.js';

/** Contrat du context consommé via useThemes(). */
export interface ThemesContextValue {
  /** null = questions encore en cours de chargement (chunks lazy). */
  themes: Theme[] | null;
  /** Liste plate de toutes les questions connues (détection de similarité). */
  allQuestions: TaggedQuestion[];
  /** Propositions en attente de validation manuelle (PAS jouables). */
  submissions: Submission[];
  /** Propositions validées par l'admin (jouables). */
  validees: ApprovedSubmission[];
  approvedCount: number;
  addQuestion: (q: Submission) => void;
  approveQuestion: (id: string) => void;
  exporterValidees: () => string;
}

const ThemesContext = createContext<ThemesContextValue | null>(null);

interface ThemesProviderProps {
  children: ReactNode;
}

export function ThemesProvider({ children }: ThemesProviderProps) {
  const [baseThemes, setBaseThemes] = useState<Theme[] | null>(null); // null = questions en cours de chargement (chunks lazy)
  const [submissions, setSubmissions] = useState<Submission[]>(() => validateSubmissions(loadSubmissions())); // en attente de validation
  const [validees, setValidees] = useState<ApprovedSubmission[]>(() => validateSubmissions(loadApproved())); // validées = jouables

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
        // Questions communautaires validées par l'admin (servies par /api/questions,
        // validées par zod dans community.ts) : best-effort, fusionnées au catalogue.
        const community = await loadCommunityQuestions();
        let fusion = base;
        if (personal) fusion = mergeThemes(fusion, personal.themes);
        if (community.length > 0) fusion = mergeThemes(fusion, community);
        setBaseThemes(fusion);
      } catch {
        if (active) setBaseThemes([]); // échec de chargement : catalogue vide plutôt que crash
      }
    })();
    return () => {
      active = false;
      controleur.abort();
    };
  }, []);

  // Thèmes finaux = base/fichier/communautaire + questions VALIDÉES manuellement
  // (localStorage). Les questions « proposées » (en attente) ne sont PAS jouables.
  // Dédup par texte normalisé : une question à la fois en local (validées) et servie
  // par le serveur (communautaire) n'apparaît qu'une fois.
  const themes = useMemo<Theme[] | null>(() => {
    if (!baseThemes) return null; // chargement en cours
    const map = new Map<string, Theme>(
      baseThemes.map((t): [string, Theme] => [
        t.id,
        {
          ...t,
          questions: [...t.questions],
        },
      ])
    );
    const vus = new Set<string>();
    for (const t of map.values()) {
      t.questions = t.questions.filter((q) => {
        const cle = normalizeQuestionText(q.q);
        if (!cle || vus.has(cle)) return false;
        vus.add(cle);
        return true;
      });
    }
    for (const s of validees) {
      const cle = normalizeQuestionText(s.q);
      if (vus.has(cle)) continue;
      vus.add(cle);
      const question: Question = {
        q: s.q,
        reponses: s.reponses,
        bonne: s.bonne,
        niveau: s.niveau,
      };
      if (s.info) question.info = s.info;
      const existant = map.get(s.themeId);
      if (existant) {
        existant.questions.push(question);
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
  const allQuestions = useMemo<TaggedQuestion[]>(() => {
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
      addQuestion: (q: Submission) => {
        addSubmission(q);
        setSubmissions(loadSubmissions());
      },
      approveQuestion: (id: string) => {
        approveSubmission(id);
        setSubmissions(loadSubmissions());
        setValidees(loadApproved());
      },
      // themes est non null ici : l'écran admin n'est rendu qu'après le chargement.
      exporterValidees: () => exportSubmissionsJson(validees, themes!),
    }),
    [validees, themes]
  );
  const value: ThemesContextValue = {
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
export function useThemes(): ThemesContextValue {
  const ctx = useContext(ThemesContext);
  if (!ctx) throw new Error('useThemes doit être utilisé sous <ThemesProvider>');
  return ctx;
}
