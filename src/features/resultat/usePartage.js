// features/resultat/usePartage.js — partage du résultat du quizz du jour :
// texte + liens directs (X, Facebook, WhatsApp, Messenger), image "story" générée
// en canvas pour Instagram/TikTok, partage natif et copie presse-papiers. 100 % local.
import { useState } from 'react';

import { textePartage, urlApp, liensPartage, imageStory, partagerNatif, copierPressePapier } from '@lib/partage.js';

export function usePartage({ resultat }) {
  const { mode, niveau, joueurs, scores, bonnes, total } = resultat;
  const [partageOuvert, setPartageOuvert] = useState(false);
  const [messagePartage, setMessagePartage] = useState('');
  const streakJour = resultat.persistance?.streakJour || 0;

  const textePartageJour = textePartage({
    pseudo: joueurs[0],
    date: niveau,
    score: scores[0],
    bonnes: bonnes[0],
    total,
    streak: streakJour,
  });

  async function partagerVers(nom) {
    const url = urlApp();
    const liens = liensPartage(textePartageJour, url);
    setMessagePartage('');
    if (nom === 'natif') {
      const ok = await partagerNatif({ texte: textePartageJour, url });
      if (!ok) setMessagePartage('Partage natif indisponible ici — copie le texte plutôt.');
      return;
    }
    if (nom === 'copier') {
      const ok = await copierPressePapier(`${textePartageJour} ${url}`);
      setMessagePartage(ok ? 'Résultat copié dans le presse-papiers.' : 'Copie impossible.');
      return;
    }
    if (nom === 'x') { window.open(liens.x, '_blank', 'noopener'); return; }
    if (nom === 'facebook') { window.open(liens.facebook, '_blank', 'noopener'); return; }
    if (nom === 'whatsapp') { window.open(liens.whatsapp, '_blank', 'noopener'); return; }
    if (nom === 'messenger') {
      await copierPressePapier(`${textePartageJour} ${url}`);
      window.open(liens.messengerApp, '_blank', 'noopener');
      setTimeout(() => window.open(liens.messenger, '_blank', 'noopener'), 500);
      setMessagePartage('Texte copié — colle-le dans ta conversation Messenger.');
      return;
    }
    if (nom === 'instagram' || nom === 'tiktok' || nom === 'story') {
      // Image "story" générée en direct, puis feuille de partage native (story, amis...)
      const fichier = await imageStory({
        pseudo: joueurs[0], date: niveau, score: scores[0], bonnes: bonnes[0], total, streak: streakJour,
      });
      const ok = await partagerNatif({ texte: textePartageJour, url, fichier });
      if (ok) return;
      // repli : on télécharge l'image + on copie le texte
      const a = document.createElement('a');
      a.href = URL.createObjectURL(fichier);
      a.download = fichier.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      await copierPressePapier(`${textePartageJour} ${url}`);
      setMessagePartage('Image story téléchargée + texte copié : publie-la toi-même sur ' + (nom === 'tiktok' ? 'TikTok' : nom === 'instagram' ? 'Instagram' : 'ta story') + '.');
    }
  }

  return { partageOuvert, setPartageOuvert, messagePartage, textePartageJour, partagerVers, streakJour };
}
