// ModaleNiveau.jsx — modale de choix de la difficulté (solo), ouverte au clic sur un
// thème. Utilise la modale accessible partagée (Échap, focus, aria).
import Icone, { Barres } from '@shared/ui/Icone.jsx';
import Modal from '@shared/ui/Modal.jsx';
import { NIVEAUX, nomNiveau } from '@lib/index.js';

export default function ModaleNiveau({ a }) {
  const theme = a.theme;
  if (!theme) return null;
  return (
    <Modal titre={theme.nom} onFermer={() => a.setModalNiveau(false)}>
      <div className="modal-titre">
        <h2>
          <span className="theme-icone" style={{ '--couleur': theme.couleur, width: 34, height: 34, borderRadius: 10 }}>
            <Icone nom={theme.icone} taille={18} />
          </span>
          {theme.nom}
        </h2>
        <button className="btn-suppr" onClick={() => a.setModalNiveau(false)} title="Fermer">
          <Icone nom="x" taille={18} />
        </button>
      </div>
      <p className="vide">Choisis la difficulté :</p>
      <div className="niveaux-modal">
        {NIVEAUX.map((n, i) => (
          <button
            key={n.id}
            className={a.niveau === n.id ? 'niveau-modal actif' : 'niveau-modal'}
            style={{ '--couleur': n.couleur }}
            onClick={() => a.setNiveau(n.id)}
          >
            <Barres actives={i + 1} couleur={n.couleur} taille={18} />
            <span>{n.nom}</span>
          </button>
        ))}
      </div>
      <button
        className="btn-principal"
        onClick={() => { a.setModalNiveau(false); a.lancer(); }}
      >
        C'est parti — niveau {nomNiveau(a.niveau)} !
      </button>
    </Modal>
  );
}
