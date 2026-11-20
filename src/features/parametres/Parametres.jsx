import { useRef, useState } from 'react';

import Icone from '@shared/ui/Icone.jsx';

import { validerAvatar } from '@lib/avatar.js';

// Fenêtre de paramètres : photo de profil + activer/désactiver les sons,
// animations, vibrations et les 3 modes d'accessibilité (thème clair, daltonien, dys).
// Les choix sont enregistrés localement (localStorage) et appliqués tout de suite.

const REGLAGES = [
  { cle: 'sons', icone: 'volume', label: 'Sons', desc: 'Bips et effets pendant la partie' },
  { cle: 'musique', icone: 'music', label: 'Musique de fond', desc: 'Ambiance sonore douce pendant la partie' },
  { cle: 'animations', icone: 'sparkles', label: 'Animations', desc: 'Confettis et effets visuels' },
  { cle: 'vibrations', icone: 'vibrate', label: 'Vibrations', desc: 'Le téléphone vibre (sur mobile surtout)' },
  // Accessibilité
  { cle: 'themeClair', icone: 'sun', label: 'Thème clair', desc: 'Fond clair au lieu du thème sombre' },
  { cle: 'daltonien', icone: 'eye', label: 'Mode daltonien', desc: 'Couleurs des réponses adaptées (palette Okabe-Ito) + lettres A/B/C/D' },
  { cle: 'dys', icone: 'book', label: 'Mode dyslexie', desc: 'Police plus lisible, espacements augmentés' },
];

export default function Parametres({ prefs, avatar, onChangerAvatar, onChanger, onFermer }) {
  const fileRef = useRef(null);
  const [erreurAvatar, setErreurAvatar] = useState('');

  async function onFichierAvatar(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErreurAvatar('');
    const res = await validerAvatar(file); // modération locale : format, taille, nudité, liste bloquée
    if (!res.ok) {
      setErreurAvatar(res.erreur);
      return;
    }
    onChangerAvatar(res.dataUrl);
  }

  return (
    <div className="modal-overlay" onClick={onFermer}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-titre">
          <h2><Icone nom="sliders" taille={22} /> Paramètres</h2>
          <button className="btn-suppr" onClick={onFermer} title="Fermer">
            <Icone nom="x" taille={18} />
          </button>
        </div>
        <div className="reglages">
          <div className="reglage avatar-reglage">
            <span className="avatar-preview">
              {avatar ? <img src={avatar} alt="" /> : <Icone nom="user" taille={20} />}
            </span>
            <span className="reglage-texte">
              <strong>Photo de profil</strong>
              <small>JPEG / PNG / WebP, 3 Mo max — contenu modéré automatiquement</small>
              {erreurAvatar && <small className="avatar-erreur">{erreurAvatar}</small>}
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
          {REGLAGES.map((r) => (
            <button
              key={r.cle}
              className="reglage"
              onClick={() => onChanger({ ...prefs, [r.cle]: !prefs[r.cle] })}
            >
              <span className="reglage-icone"><Icone nom={r.icone} taille={20} /></span>
              <span className="reglage-texte">
                <strong>{r.label}</strong>
                <small>{r.desc}</small>
              </span>
              <span className={prefs[r.cle] ? 'switch on' : 'switch'}>
                <i />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
