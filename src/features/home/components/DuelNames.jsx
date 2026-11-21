// NomsDuel.jsx — saisie des deux noms de joueurs en mode duel (avec datalist des
// pseudos déjà rencontrés, façon « amis » en local).
export default function DuelNames({ a }) {
  return (
    <section className="noms">
      <datalist id="joueurs-connus">
        {a.knownPlayers.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <input
        value={a.nom1}
        onChange={(e) => a.setNom1(e.target.value)}
        placeholder="Nom du joueur 1"
        maxLength={20}
        list="joueurs-connus"
      />
      <span className="vs">VS</span>
      <input
        value={a.nom2}
        onChange={(e) => a.setNom2(e.target.value)}
        placeholder="Nom du joueur 2"
        maxLength={20}
        list="joueurs-connus"
      />
    </section>
  );
}
