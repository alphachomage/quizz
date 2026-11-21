// AnswersField.tsx — saisie des 2 à 4 réponses proposées, avec le radio « bonne réponse ».
interface AnswersFieldProps {
  reponses: string[];
  bonne: number | null;
  setReponse: (index: number, valeur: string) => void;
  setBonne: (index: number) => void;
}

export default function AnswersField({ reponses, bonne, setReponse, setBonne }: AnswersFieldProps) {
  return (
    <div className="champ">
      <label>Les réponses (2 à 4) — coche la bonne</label>
      {reponses.map((r, i) => (
        <div key={i} className="ligne-reponse">
          <input
            type="radio"
            name="bonne"
            checked={bonne === i}
            onChange={() => setBonne(i)}
            title="Bonne réponse"
          />
          <input
            value={r}
            onChange={(e) => setReponse(i, e.target.value)}
            placeholder={`Réponse ${i + 1}`}
          />
        </div>
      ))}
    </div>
  );
}
