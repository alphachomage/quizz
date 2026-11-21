// SectionThemes.jsx — vue admin : nombre de questions par thème (visible uniquement ici).
import Icon from '@shared/ui/Icon.jsx';

export default function ThemesSection({ themes }) {
  return (
    <>
      <h2 className="titre-section">Thèmes — nombre de questions (admin)</h2>
      <ul className="stats-liste">
        {[...themes].sort((a, b) => (a.nom || a.id).localeCompare(b.nom || b.id, 'fr')).map((t) => (
          <li key={t.id} className="stats-ligne stats-ligne-col">
            <span className="stats-ligne-nom" style={{ color: t.couleur }}>
              <Icon nom={t.icone} taille={16} /> {t.nom}
            </span>
            <span className="stats-ligne-val stats-theme-nb">{t.questions.length} questions</span>
          </li>
        ))}
      </ul>
    </>
  );
}
