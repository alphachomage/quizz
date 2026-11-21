// Modération des avatars (100 % locale, côté navigateur) :
//  - formats autorisés : JPEG / PNG / WebP uniquement (jamais de SVG), ≤ 3 Mo, ≥ 32 px
//  - nudité : heuristique "ratio de peau" sur l'image réduite (si > 50 % de pixels couleur peau -> refus)
//  - personnages historiques problématiques : hash perceptuel (aHash 8×8) comparé à la liste
//    bloquée public/avatars-bloques.json, avec distance de Hamming ≤ 6 (voir AGENTS.md pour alimenter la liste)
// Limite connue : sans modèle d'IA, la détection de personnes précises repose sur cette liste de
// hachés. La V2 (serveur) passera par une vraie API de modération d'images.

const AVATAR_SIZE = 128; // l'avatar stocké est recadré en carré et réduit à 128 px
const SKIN_THRESHOLD = 0.5; // ratio max de pixels "peau" accepté
const MAX_HASH_DISTANCE = 6; // distance de Hamming max pour un hash bloqué

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Recadre en carré centré et réduit à `taille` px (JPEG qualité 0.85) -> dataURL compact pour localStorage.
async function imageToResizedDataUrl(dataUrl, taille = AVATAR_SIZE) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = taille;
  canvas.height = taille;
  const cote = Math.min(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, (img.width - cote) / 2, (img.height - cote) / 2, cote, cote, 0, 0, taille, taille);
  return canvas.toDataURL('image/jpeg', 0.85);
}

// Ratio de pixels "couleur peau" (heuristique classique RGB).
async function ratioPeau(dataUrl, taille = 64) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = taille;
  canvas.height = taille;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, taille, taille);
  const { data } = ctx.getImageData(0, 0, taille, taille);
  let peau = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const cond1 = r > 95 && g > 40 && b > 20 && r > g && r > b && r - g > 15;
    const cond2 = r > 200 && g > 150 && b > 150 && Math.abs(r - g) < 30;
    if (cond1 || cond2) peau++;
  }
  return peau / (taille * taille);
}

// aHash 8×8 (64 bits) en hexadécimal.
async function aHash(dataUrl, taille = 8) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = taille;
  canvas.height = taille;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, taille, taille);
  const { data } = ctx.getImageData(0, 0, taille, taille);
  const gris = [];
  for (let i = 0; i < data.length; i += 4) {
    gris.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  const moy = gris.reduce((a, b) => a + b, 0) / gris.length;
  let bits = '';
  for (const v of gris) bits += v >= moy ? '1' : '0';
  return parseInt(bits, 2).toString(16).padStart(16, '0');
}

function hamming(a, b) {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let d = 0;
  while (x > 0n) {
    d += Number(x & 1n);
    x >>= 1n;
  }
  return d;
}

// Validation complète d'un fichier image proposé comme avatar.
// Retourne { ok: true, dataUrl, hash } ou { ok: false, erreur }.
export async function validateAvatar(file) {
  if (!file) return { ok: false, erreur: 'Aucun fichier sélectionné.' };
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { ok: false, erreur: 'Formats autorisés : JPEG, PNG ou WebP (les SVG sont interdits).' };
  }
  if (file.size > 3 * 1024 * 1024) return { ok: false, erreur: 'Image trop lourde (3 Mo maximum).' };
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await loadImage(dataUrl);
  if (img.width < 32 || img.height < 32) return { ok: false, erreur: 'Image trop petite (32 px minimum).' };

  // 1) Détection de nudité (heuristique peau)
  const ratio = await ratioPeau(dataUrl);
  if (ratio > SKIN_THRESHOLD) {
    return { ok: false, erreur: "Image refusée : contenu possiblement inapproprié (nudité) détecté." };
  }

  // 2) Personnages / contenus bloqués (hash perceptuel vs liste locale)
  const hash = await aHash(dataUrl);
  try {
    const res = await fetch('/avatars-bloques.json');
    const list = res.ok ? await res.json() : { images: [] };
    for (const entry of list.images || []) {
      if (entry.hash && hamming(hash, entry.hash) <= MAX_HASH_DISTANCE) {
        return {
          ok: false,
          erreur: `Image refusée : personnage ou contenu bloqué par la modération (${entry.label || 'liste bloquée'}).`,
        };
      }
    }
  } catch {
    // pas de liste disponible = pas de blocage par hash
  }

  const reduite = await imageToResizedDataUrl(dataUrl);
  return { ok: true, dataUrl: reduite, hash };
}
