// PartageModal.jsx — modale de partage du résultat du quizz du jour
// (liens directs pré-remplis, image story, partage natif, copie).
import Icone from '@shared/ui/Icone.jsx';
import Modal from '@shared/ui/Modal.jsx';

export default function PartageModal({ partage }) {
  const fermer = () => partage.setPartageOuvert(false);
  return (
    <Modal titre="Partager mon résultat" onFermer={fermer}>
      <div className="modal-titre">
        <h2><Icone nom="share" taille={22} /> Partager mon résultat</h2>
        <button className="btn-suppr" onClick={fermer} title="Fermer">
          <Icone nom="x" taille={18} />
        </button>
      </div>
      <p className="vide" style={{ marginBottom: 10 }}>{partage.textePartageJour}</p>
      <div className="partage-liste">
        {typeof navigator !== 'undefined' && navigator.share && (
          <button className="btn-principal" onClick={() => partage.partagerVers('natif')}>
            <Icone nom="share" taille={18} /> Partager… (story, amis, apps installées)
          </button>
        )}
        <button className="btn-secondaire" onClick={() => partage.partagerVers('x')}>X (Twitter)</button>
        <button className="btn-secondaire" onClick={() => partage.partagerVers('facebook')}>Facebook</button>
        <button className="btn-secondaire" onClick={() => partage.partagerVers('whatsapp')}>WhatsApp</button>
        <button className="btn-secondaire" onClick={() => partage.partagerVers('messenger')}>Messenger</button>
        <button className="btn-secondaire" onClick={() => partage.partagerVers('instagram')}>Instagram (story)</button>
        <button className="btn-secondaire" onClick={() => partage.partagerVers('tiktok')}>TikTok</button>
        <button className="btn-secondaire" onClick={() => partage.partagerVers('story')}>Ma story (image)</button>
        <button className="btn-secondaire" onClick={() => partage.partagerVers('copier')}>
          <Icone nom="download" taille={16} /> Copier le résultat
        </button>
      </div>
      {partage.messagePartage && <p className="info-mix" style={{ marginTop: 10 }}>{partage.messagePartage}</p>}
    </Modal>
  );
}
