// scripts/lib/ids.mjs — attribution des ids de questions (partagée par assign-question-ids et l'import).
// Id = "<theme>-" + 6 premiers hex de sha1(texte normalisé), allongé (8, 10...) si l'id existe
// déjà ; le n-ième exemplaire d'un même texte dans un thème reçoit sha1("texte#n").
import crypto from 'node:crypto';

// `ids` : Set de tous les ids déjà pris (modifié : l'id attribué y est ajouté).
// `occurrence` : rang (1-based) de ce texte normalisé dans le thème.
export function attribuerId(themeId, normalise, ids, occurrence = 1) {
  for (let n = occurrence; ; n++) {
    const hex = crypto.createHash('sha1').update(n === 1 ? normalise : `${normalise}#${n}`).digest('hex');
    let len = 6;
    while (ids.has(`${themeId}-${hex.slice(0, len)}`) && len < hex.length) len += 2;
    const id = `${themeId}-${hex.slice(0, len)}`;
    if (ids.has(id)) continue;
    ids.add(id);
    return id;
  }
}
