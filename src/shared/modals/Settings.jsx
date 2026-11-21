import { useRef, useState } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import Modal from '@shared/ui/Modal.jsx';
import { validateAvatar } from '@lib/avatar.js';

// Fenêtre de paramètres : photo de profil + activer/désactiver les sons,
// animations, vibrations et les 3 modes d'accessibilité (thème clair, daltonien, dys).
// Les choix sont enregistrés localement (localStorage) et appliqués tout de suite.

const SETTINGS = [
  {
    key: 'sons',
    icone: 'volume',
    label: 'Sons',
    desc: 'Bips et effets pendant la partie',
  },
  {
    key: 'musique',
    icone: 'music',
    label: 'Musique de fond',
    desc: 'Ambiance sonore douce pendant la partie',
  },
  {
    key: 'animations',
    icone: 'sparkles',
    label: 'Animations',
    desc: 'Confettis et effets visuels',
  },
  {
    key: 'vibrations',
    icone: 'vibrate',
    label: 'Vibrations',
    desc: 'Le téléphone vibre (sur mobile surtout)',
  },
  // Accessibilité
  {
    key: 'themeClair',
    icone: 'sun',
    label: 'Thème clair',
    desc: 'Fond clair au lieu du thème sombre',
  },
  {
    key: 'daltonien',
    icone: 'eye',
    label: 'Mode daltonien',
    desc: 'Couleurs des réponses adaptées (palette Okabe-Ito) + lettres A/B/C/D',
  },
  {
    key: 'dys',
    icone: 'book',
    label: 'Mode dyslexie',
    desc: 'Police plus lisible, espacements augmentés',
  },
];
export default function Settings({ prefs, avatar, onChangerAvatar, onChanger, onClose: onClose }) {
  const fileRef = useRef(null);
  const [avatarError, setAvatarError] = useState('');
  async function onFichierAvatar(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError('');
    const res = await validateAvatar(file); // modération locale : format, taille, nudité, liste bloquée
    if (!res.ok) {
      setAvatarError(res.error);
      return;
    }
    onChangerAvatar(res.dataUrl);
  }
  return (
    <Modal title="Paramètres" onClose={onClose}>
      <div className="modal-titre">
        <h2>
          <Icon nom="sliders" taille={22} /> Paramètres
        </h2>
        <button className="btn-suppr" onClick={onClose} title="Fermer">
          <Icon nom="x" taille={18} />
        </button>
      </div>
      <div className="reglages">
        <div className="reglage avatar-reglage">
          <span className="avatar-preview">
            {avatar ? <img src={avatar} alt="" /> : <Icon nom="user" taille={20} />}
          </span>
          <span className="reglage-texte">
            <strong>Photo de profil</strong>
            <small>JPEG / PNG / WebP, 3 Mo max — contenu modéré automatiquement</small>
            {avatarError && <small className="avatar-erreur">{avatarError}</small>}
          </span>
          <button className="btn-secondaire petit" onClick={() => fileRef.current?.click()}>
            Changer
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={onFichierAvatar}
          />
        </div>
        {SETTINGS.map((r) => (
          <button
            key={r.key}
            className="reglage"
            onClick={() =>
              onChanger({
                ...prefs,
                [r.key]: !prefs[r.key],
              })
            }
          >
            <span className="reglage-icone">
              <Icon nom={r.icone} taille={20} />
            </span>
            <span className="reglage-texte">
              <strong>{r.label}</strong>
              <small>{r.desc}</small>
            </span>
            <span className={prefs[r.key] ? 'switch on' : 'switch'}>
              <i />
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
