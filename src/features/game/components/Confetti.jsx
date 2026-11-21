// Confettis.jsx — pluie de confettis CSS sur une bonne réponse (si animations ON).
export default function Confetti({ confetti }) {
  if (!confetti.length) return null;
  return (
    <div className="confettis" aria-hidden="true">
      {confetti.map((c) => (
        <span
          key={c.id}
          className="confetti"
          style={{
            left: `${c.left}%`,
            width: `${c.taille}px`,
            height: `${c.taille * 0.6}px`,
            background: c.couleur,
            animationDelay: `${c.delay}s`,
            '--rot': `${c.rotation}deg`,
          }}
        />
      ))}
    </div>
  );
}
