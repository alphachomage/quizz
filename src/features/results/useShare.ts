// features/resultat/usePartage.ts — partage du résultat du quizz du jour :
// texte + liens directs (X, Facebook, WhatsApp, Messenger), image "story" générée
// en canvas pour Instagram/TikTok, partage natif et copie presse-papiers. 100 % local.
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  shareText,
  appUrl,
  shareLinks,
  storyImage,
  shareNative,
  copyToClipboard,
} from '@lib/share.js';
import type { GameResult } from '@lib/types.js';

/** Cibles de partage proposées par la modale. */
export type ShareTarget =
  | 'natif'
  | 'copier'
  | 'x'
  | 'facebook'
  | 'whatsapp'
  | 'messenger'
  | 'instagram'
  | 'tiktok'
  | 'story';

// Résultat de partie partageable : seule la série de jours de la persistance est lue.
interface ShareableResult extends GameResult {
  persistance?: { dailyStreak?: number };
}

interface UseShareParams {
  result: ShareableResult;
}

/** Contrat du hook renvoyé (consommé par Results et ShareModal). */
export interface UseShare {
  shareOpen: boolean;
  setShareOpen: Dispatch<SetStateAction<boolean>>;
  messagePartage: string;
  dailyShareText: string;
  shareTo: (nom: ShareTarget) => Promise<void>;
  dailyStreak: number;
}

export function useShare({ result }: UseShareParams): UseShare {
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
  async function shareTo(nom: ShareTarget): Promise<void> {
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
        file,
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
