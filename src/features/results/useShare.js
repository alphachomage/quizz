// features/resultat/usePartage.js — partage du résultat du quizz du jour :
// texte + liens directs (X, Facebook, WhatsApp, Messenger), image "story" générée
// en canvas pour Instagram/TikTok, partage natif et copie presse-papiers. 100 % local.
import { useState } from 'react';
import {
  shareText,
  appUrl,
  shareLinks,
  storyImage,
  shareNative,
  copyToClipboard,
} from '@lib/share.js';
export function useShare({ result }) {
  const { niveau, players, scores, bonnes, total } = result;
  const [shareOpen, setShareOpen] = useState(false);
  const [messagePartage, setShareMessage] = useState('');
  const dailyStreak = result.persistance?.dailyStreak || 0;
  const dailyShareText = shareText({
    pseudo: players[0],
    date: niveau,
    score: scores[0],
    bonnes: bonnes[0],
    total,
    streak: dailyStreak,
  });
  async function shareTo(nom) {
    const url = appUrl();
    const liens = shareLinks(dailyShareText, url);
    setShareMessage('');
    if (nom === 'natif') {
      const ok = await shareNative({
        text: dailyShareText,
        url,
      });
      if (!ok) setShareMessage('Partage natif indisponible ici — copie le texte plutôt.');
      return;
    }
    if (nom === 'copier') {
      const ok = await copyToClipboard(`${dailyShareText} ${url}`);
      setShareMessage(ok ? 'Résultat copié dans le presse-papiers.' : 'Copie impossible.');
      return;
    }
    if (nom === 'x') {
      window.open(liens.x, '_blank', 'noopener');
      return;
    }
    if (nom === 'facebook') {
      window.open(liens.facebook, '_blank', 'noopener');
      return;
    }
    if (nom === 'whatsapp') {
      window.open(liens.whatsapp, '_blank', 'noopener');
      return;
    }
    if (nom === 'messenger') {
      await copyToClipboard(`${dailyShareText} ${url}`);
      window.open(liens.messengerApp, '_blank', 'noopener');
      setTimeout(() => window.open(liens.messenger, '_blank', 'noopener'), 500);
      setShareMessage('Texte copié — colle-le dans ta conversation Messenger.');
      return;
    }
    if (nom === 'instagram' || nom === 'tiktok' || nom === 'story') {
      // Image "story" générée en direct, puis feuille de partage native (story, amis...)
      const file = await storyImage({
        pseudo: players[0],
        date: niveau,
        score: scores[0],
        bonnes: bonnes[0],
        total,
        streak: dailyStreak,
      });
      const ok = await shareNative({
        text: dailyShareText,
        url,
        file: file,
      });
      if (ok) return;
      // repli : on télécharge l'image + on copie le texte
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      await copyToClipboard(`${dailyShareText} ${url}`);
      setShareMessage(
        'Image story téléchargée + texte copié : publie-la toi-même sur ' +
          (nom === 'tiktok' ? 'TikTok' : nom === 'instagram' ? 'Instagram' : 'ta story') +
          '.'
      );
    }
  }
  return {
    shareOpen,
    setShareOpen,
    messagePartage,
    dailyShareText: dailyShareText,
    shareTo,
    dailyStreak,
  };
}
