// BanniereBadge.jsx — bannière « prochain badge » (effet « reviens-y »), avec barre
// de progression. Masquée en mode invité.
import Icone from '@shared/ui/Icone.jsx';

export default function BanniereBadge({ a, estInvite }) {
  if (estInvite || !a.badgeSuivant) return null;
  const b = a.badgeSuivant;
  return (
    <div className="prochain-badge" title={`${b.desc} — débloque ce badge en continuant à jouer !`}>
      <span className="pb-icone"><Icone nom={b.icone} taille={14} /></span>
      <span className="pb-texte">
        <strong>Prochain badge :</strong> {b.nom} · {b.actuel}/{b.cible}
      </span>
      <span className="pb-barre"><i style={{ width: `${Math.round(b.pct * 100)}%` }} /></span>
    </div>
  );
}
