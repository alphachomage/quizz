// Partage du résultat du quizz du jour : texte + liens directs (X, Facebook, WhatsApp,
// Messenger), image "story" générée en canvas pour Instagram / TikTok / stories,
// partage natif (navigator.share) et copie dans le presse-papiers.
// 100 % local : aucun serveur, aucun tracking.

import { currentOrigin } from './nav.js';

// Données du quizz du jour à partager (niveau = date du jour pour le quizz quotidien).
export interface SharePayload {
  pseudo?: string | null;
  date: string | null;
  score: number;
  bonnes: number;
  total: number;
  streak: number;
}

// Liens directs de partage, par réseau.
interface ShareLinks {
  x: string;
  facebook: string;
  whatsapp: string;
  messenger: string;
  messengerApp: string;
}

// Données du partage natif (équivalent local de ShareData de lib.dom, nommé localement
// car ESLint no-undef ne résout pas les types globaux du DOM en TS).
interface NativeShareData {
  text?: string;
  url?: string;
  files?: File[];
}

// Texte du message de partage.
function shareText({ pseudo, date, score, bonnes, total, streak }: SharePayload): string {
  let t = `${pseudo || "Quelqu'un"} a marqué ${score} pts au Quizz du jour VoltQuiz du ${date} (${bonnes}/${total} bonnes réponses)`;
  if (streak > 1) t += ` — série de ${streak} jours (éclair x${streak})`;
  t += `. Peux-tu faire mieux ?`;
  return t;
}
export { shareText };
export function appUrl(): string {
  return currentOrigin();
}

// Liens directs des réseaux (texte + URL pré-remplis).
function shareLinks(text: string, url: string): ShareLinks {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  return {
    x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`,
    whatsapp: `https://wa.me/?text=${t}%20${u}`,
    messenger: `https://www.messenger.com/new`,
    // le texte est copié avant ouverture
    messengerApp: `fb-messenger://share/?link=${u}&text=${t}`,
  };
}

// Image "story" 1080x1920 générée en direct, palette sobre (canvas = pas de var() CSS, valeurs en dur
// à synchroniser avec src/styles/tokens.css) : fond #000000, carte #26262B, accent sable #D9D0B8.
export { shareLinks };
export async function storyImage({ pseudo, date, score, bonnes, total, streak }: SharePayload): Promise<File> {
  const L = 1080,
    H = 1920;
  const c = document.createElement('canvas');
  c.width = L;
  c.height = H;
  // getContext('2d') renvoie null seulement si le canvas est indisponible : on garde le comportement
  // historique (échec explicite) plutôt qu'un retour silencieux.
  const ctx = c.getContext('2d')!;

  // fond noir (60%)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, L, H);

  // carte gris ardoise (30%) centrée
  const m = 70,
    cw = L - m * 2,
    ch = 900,
    cy = 380;
  ctx.fillStyle = '#26262B';
  ctx.beginPath();
  ctx.roundRect(m, cy, cw, ch, 48);
  ctx.fill();

  // éclair sable (10%) : polygone du logo, centré en haut de la carte
  ctx.fillStyle = '#D9D0B8';
  const pts: [number, number][] = [
    [13.6, 1.5],
    [4.2, 13.6],
    [9.8, 13.6],
    [8.6, 22.5],
    [18, 10.4],
    [12.4, 10.4],
  ];
  const s = 16,
    ox = m + cw / 2 - 12 * s,
    oy = cy + 90;
  ctx.beginPath();
  pts.forEach(([x, y], i) =>
    i === 0 ? ctx.moveTo(ox + x * s, oy + y * s) : ctx.lineTo(ox + x * s, oy + y * s)
  );
  ctx.closePath();
  ctx.fill();

  // textes (clairs sur carte sombre, contraste WCAG AA)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#D9D0B8';
  ctx.font = '900 64px Verdana, sans-serif';
  ctx.fillText('VOLTQUIZ', L / 2, cy + 480);
  ctx.fillStyle = '#ECECEC';
  ctx.font = '700 44px Verdana, sans-serif';
  ctx.fillText(`Quizz du jour — ${date}`, L / 2, cy + 550);
  ctx.fillStyle = '#D9D0B8';
  ctx.font = '900 150px Verdana, sans-serif';
  ctx.fillText(`${score} pts`, L / 2, cy + 720);
  ctx.fillStyle = '#ECECEC';
  ctx.font = '700 40px Verdana, sans-serif';
  ctx.fillText(`${bonnes}/${total} bonnes réponses`, L / 2, cy + 790);
  if (streak > 1) ctx.fillText(`Série de ${streak} jours (éclair x${streak})`, L / 2, cy + 850);
  ctx.fillStyle = '#D9D0B8';
  ctx.font = '800 42px Verdana, sans-serif';
  ctx.fillText(pseudo || '', L / 2, H - 140);
  ctx.fillStyle = '#9C9C94';
  ctx.font = '600 34px Verdana, sans-serif';
  ctx.fillText('voltquiz — le quiz rapide', L / 2, H - 90);
  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b as Blob), 'image/png'));
  return new File([blob], 'voltquiz-quizz-du-jour.png', {
    type: 'image/png',
  });
}

// Partage natif (feuille de partage du téléphone/PC : stories, amis, etc.).
export async function shareNative({
  text: text,
  url,
  file: file,
}: {
  text: string;
  url: string;
  file?: File | null;
}): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    const data: NativeShareData = {
      text: text,
      url,
    };
    if (
      file &&
      navigator.canShare &&
      navigator.canShare({
        files: [file],
      })
    )
      data.files = [file];
    await navigator.share(data);
    return true;
  } catch {
    return false; // annulé par l'utilisateur
  }
}
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
export { copyToClipboard };
