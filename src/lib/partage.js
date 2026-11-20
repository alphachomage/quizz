// Partage du résultat du quizz du jour : texte + liens directs (X, Facebook, WhatsApp,
// Messenger), image "story" générée en canvas pour Instagram / TikTok / stories,
// partage natif (navigator.share) et copie dans le presse-papiers.
// 100 % local : aucun serveur, aucun tracking.

// Texte du message de partage.
export function textePartage({ pseudo, date, score, bonnes, total, streak }) {
  let t = `${pseudo || 'Quelqu\'un'} a marqué ${score} pts au Quizz du jour VoltQuiz du ${date} (${bonnes}/${total} bonnes réponses)`;
  if (streak > 1) t += ` — série de ${streak} jours (éclair x${streak})`;
  t += `. Peux-tu faire mieux ?`;
  return t;
}

export function urlApp() {
  return window.location.origin;
}

// Liens directs des réseaux (texte + URL pré-remplis).
export function liensPartage(texte, url) {
  const t = encodeURIComponent(texte);
  const u = encodeURIComponent(url);
  return {
    x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`,
    whatsapp: `https://wa.me/?text=${t}%20${u}`,
    messenger: `https://www.messenger.com/new`, // le texte est copié avant ouverture
    messengerApp: `fb-messenger://share/?link=${u}&text=${t}`,
  };
}

// Image "story" 1080x1920 générée en direct (fond noir, carte violette, éclair jaune PEPS).
export async function imageStory({ pseudo, date, score, bonnes, total, streak }) {
  const L = 1080, H = 1920;
  const c = document.createElement('canvas');
  c.width = L;
  c.height = H;
  const ctx = c.getContext('2d');

  // fond noir (60%)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, L, H);

  // carte violette (30%) centrée
  const m = 70, cw = L - m * 2, ch = 900, cy = 380;
  ctx.fillStyle = '#A48DFF';
  ctx.beginPath();
  ctx.roundRect(m, cy, cw, ch, 48);
  ctx.fill();

  // éclair jaune PEPS (10%) : polygone du logo, centré en haut de la carte
  ctx.fillStyle = '#FFD60A';
  const pts = [[13.6, 1.5], [4.2, 13.6], [9.8, 13.6], [8.6, 22.5], [18, 10.4], [12.4, 10.4]];
  const s = 16, ox = m + cw / 2 - 12 * s, oy = cy + 90;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(ox + x * s, oy + y * s) : ctx.lineTo(ox + x * s, oy + y * s)));
  ctx.closePath();
  ctx.fill();

  // textes
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.font = '900 64px Verdana, sans-serif';
  ctx.fillText('VOLTQUIZ', L / 2, cy + 480);
  ctx.font = '700 44px Verdana, sans-serif';
  ctx.fillText(`Quizz du jour — ${date}`, L / 2, cy + 550);
  ctx.font = '900 150px Verdana, sans-serif';
  ctx.fillStyle = '#000000';
  ctx.fillText(`${score} pts`, L / 2, cy + 720);
  ctx.font = '700 40px Verdana, sans-serif';
  ctx.fillText(`${bonnes}/${total} bonnes réponses`, L / 2, cy + 790);
  if (streak > 1) ctx.fillText(`Série de ${streak} jours (éclair x${streak})`, L / 2, cy + 850);

  ctx.fillStyle = '#FFD60A';
  ctx.font = '800 42px Verdana, sans-serif';
  ctx.fillText(pseudo || '', L / 2, H - 140);
  ctx.font = '600 34px Verdana, sans-serif';
  ctx.fillText('voltquiz — le quiz rapide', L / 2, H - 90);

  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return new File([blob], 'voltquiz-quizz-du-jour.png', { type: 'image/png' });
}

// Partage natif (feuille de partage du téléphone/PC : stories, amis, etc.).
export async function partagerNatif({ texte, url, fichier }) {
  if (!navigator.share) return false;
  try {
    const data = { text: texte, url };
    if (fichier && navigator.canShare && navigator.canShare({ files: [fichier] })) data.files = [fichier];
    await navigator.share(data);
    return true;
  } catch {
    return false; // annulé par l'utilisateur
  }
}

export async function copierPressePapier(texte) {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}
