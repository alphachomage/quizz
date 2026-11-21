// CorpusCard.tsx — carte "Corpus" du tableau de bord admin : nombre de thèmes et de
// questions jouables (exclusions déjà appliquées, validées déjà ajoutées).
import type { ReactElement } from 'react';
import type { CorpusMetrics } from '../dashboardCompute.js';
import MetricCard from './MetricCard.jsx';

interface CorpusCardProps {
  corpus: CorpusMetrics;
}

export default function CorpusCard({ corpus }: CorpusCardProps): ReactElement {
  return (
    <MetricCard
      icone="question"
      title="Corpus"
      value={corpus.nbQuestions}
      sous={`${corpus.nbQuestions > 1 ? 'questions' : 'question'} · ${corpus.themeCount} thèmes`}
    />
  );
}
