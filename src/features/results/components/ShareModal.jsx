// PartageModal.jsx — modale de partage du résultat du quizz du jour
// (liens directs pré-remplis, image story, partage natif, copie).
import Icon from '@shared/ui/Icon.jsx';
import Modal from '@shared/ui/Modal.jsx';
export default function ShareModal({ share }) {
  const close = () => share.setShareOpen(false);
  return (
    <Modal title="Partager mon résultat" onClose={close}>
      <div className="modal-titre">
        <h2>
          <Icon nom="share" taille={22} /> Partager mon résultat
        </h2>
        <button className="btn-suppr" onClick={close} title="Fermer">
          <Icon nom="x" taille={18} />
        </button>
      </div>
      <p
        className="vide"
        style={{
          marginBottom: 10,
        }}
      >
        {share.dailyShareText}
      </p>
      <div className="partage-liste">
        {typeof navigator !== 'undefined' && navigator.share && (
          <button className="btn-principal" onClick={() => share.shareTo('natif')}>
            <Icon nom="share" taille={18} /> Partager… (story, amis, apps installées)
          </button>
        )}
        <button className="btn-secondaire" onClick={() => share.shareTo('x')}>
          X (Twitter)
        </button>
        <button className="btn-secondaire" onClick={() => share.shareTo('facebook')}>
          Facebook
        </button>
        <button className="btn-secondaire" onClick={() => share.shareTo('whatsapp')}>
          WhatsApp
        </button>
        <button className="btn-secondaire" onClick={() => share.shareTo('messenger')}>
          Messenger
        </button>
        <button className="btn-secondaire" onClick={() => share.shareTo('instagram')}>
          Instagram (story)
        </button>
        <button className="btn-secondaire" onClick={() => share.shareTo('tiktok')}>
          TikTok
        </button>
        <button className="btn-secondaire" onClick={() => share.shareTo('story')}>
          Ma story (image)
        </button>
        <button className="btn-secondaire" onClick={() => share.shareTo('copier')}>
          <Icon nom="download" taille={16} /> Copier le résultat
        </button>
      </div>
      {share.messagePartage && (
        <p
          className="info-mix"
          style={{
            marginTop: 10,
          }}
        >
          {share.messagePartage}
        </p>
      )}
    </Modal>
  );
}
