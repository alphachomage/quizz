// texte.js — normalisation des textes de questions (comparaisons, exclusions).
// Module PUR.
export function normalizeQuestionText(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // supprime les accents
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
