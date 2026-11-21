// CorpusCard.jsx — carte "Corpus" du tableau de bord admin : nombre de thèmes et de
// questions jouables (exclusions déjà appliquées, validées déjà ajoutées).
import MetricCard from './MetricCard.jsx';
export default function CorpusCard({ corpus }) {
  return (
    <MetricCard
      icone="question"
      title="Corpus"
      value={corpus.nbQuestions}
      sous={`${corpus.nbQuestions > 1 ? 'questions' : 'question'} · ${corpus.themeCount} thèmes`}
    />
  );
}
