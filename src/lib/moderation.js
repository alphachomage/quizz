// Modération des pseudos à la création de compte.
// Objectif : bloquer les pseudos haineux, discriminatoires, misogynes, homophobes, racistes,
// nazis ou insultants — y compris déguisés en "leetspeak" (n4z1, m1s0gyne, etc.).
//
// Méthode : on normalise le pseudo (minuscules, accents supprimés, leetspeak décodé,
// symboles retirés), puis on cherche chaque terme bloqué en sous-chaîne.
// Les termes très courts (< 4 caractères) ne bloquent qu'en égalité exacte,
// pour éviter les faux positifs.

const LEET = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g',
  '@': 'a', '$': 's', '€': 'e', '!': 'i', '+': 't', '*': 'a', '£': 'l', '%': 'o',
};

export function normaliserPseudo(p) {
  return (p || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split('')
    .map((c) => LEET[c] || c)
    .join('')
    .replace(/[^a-z0-9]/g, '');
}

// Liste de modération par catégorie. Les termes sont volontairement écrits tels quels :
// c'est la liste qui permet de LES bloquer.
const LISTE_BLOQUEE = [
  // nazisme / suprémacisme / négationnisme
  { terme: 'nazi', categorie: 'contenu nazi' },
  { terme: 'hitler', categorie: 'contenu nazi' },
  { terme: 'himmler', categorie: 'contenu nazi' },
  { terme: 'goebbels', categorie: 'contenu nazi' },
  { terme: 'heil', categorie: 'contenu nazi' },
  { terme: 'siegheil', categorie: 'contenu nazi' },
  { terme: '1488', categorie: 'contenu nazi' },
  { terme: '14words', categorie: 'contenu nazi' },
  { terme: 'facho', categorie: 'contenu d\u2019extrême droite' },
  { terme: 'fachiste', categorie: 'contenu d\u2019extrême droite' },
  { terme: 'ss', categorie: 'contenu nazi' }, // égalité seule
  // homophobie
  { terme: 'tapette', categorie: 'homophobie' },
  { terme: 'pede', categorie: 'homophobie' },
  { terme: 'gouine', categorie: 'homophobie' },
  { terme: 'tarlouze', categorie: 'homophobie' },
  { terme: 'faggot', categorie: 'homophobie' },
  { terme: 'dyke', categorie: 'homophobie' },
  { terme: 'fag', categorie: 'homophobie' }, // égalité seule
  { terme: 'pd', categorie: 'homophobie' }, // égalité seule
  // misogynie / sexisme
  { terme: 'pute', categorie: 'misogynie' },
  { terme: 'putain', categorie: 'misogynie' },
  { terme: 'salope', categorie: 'misogynie' },
  { terme: 'connasse', categorie: 'misogynie' },
  { terme: 'chienne', categorie: 'misogynie' },
  { terme: 'catin', categorie: 'misogynie' },
  { terme: 'michto', categorie: 'misogynie' },
  { terme: 'bitch', categorie: 'misogynie' },
  { terme: 'slut', categorie: 'misogynie' },
  { terme: 'whore', categorie: 'misogynie' },
  { terme: 'misogyne', categorie: 'misogynie' },
  { terme: 'misogynie', categorie: 'misogynie' },
  { terme: 'sexiste', categorie: 'sexisme' },
  { terme: 'homophobe', categorie: 'homophobie' },
  { terme: 'raciste', categorie: 'racisme' },
  { terme: 'antisemite', categorie: 'antisémitisme' },
  { terme: 'xenophobe', categorie: 'xénophobie' },
  // racisme
  { terme: 'bougnoul', categorie: 'racisme' },
  { terme: 'bougnoule', categorie: 'racisme' },
  { terme: 'negro', categorie: 'racisme' },
  { terme: 'negresse', categorie: 'racisme' },
  { terme: 'chinetoque', categorie: 'racisme' },
  { terme: 'crouille', categorie: 'racisme' },
  { terme: 'meteque', categorie: 'racisme' },
  { terme: 'bicot', categorie: 'racisme' },
  { terme: 'fellag', categorie: 'racisme' },
  { terme: 'nigger', categorie: 'racisme' },
  { terme: 'nigga', categorie: 'racisme' },
  { terme: 'kike', categorie: 'racisme' },
  { terme: 'wetback', categorie: 'racisme' },
  // insultes générales
  { terme: 'connard', categorie: 'insulte' },
  { terme: 'enculé', categorie: 'insulte' },
  { terme: 'batard', categorie: 'insulte' },
  { terme: 'ordure', categorie: 'insulte' },
  { terme: 'trouduc', categorie: 'insulte' },
  { terme: 'filsdepute', categorie: 'insulte' },
  { terme: 'fdp', categorie: 'insulte' }, // égalité seule
  // contenu sexuel explicite
  { terme: 'porn', categorie: 'contenu sexuel' },
  { terme: 'xxx', categorie: 'contenu sexuel' },
  { terme: 'sexe', categorie: 'contenu sexuel' },
];

// Retourne { terme, categorie } si le pseudo contient un terme bloqué, sinon null.
export function trouverTermeBloque(pseudo) {
  const n = normaliserPseudo(pseudo);
  if (!n) return null;
  for (const { terme, categorie } of LISTE_BLOQUEE) {
    const t = normaliserPseudo(terme);
    if (!t) continue;
    if (t.length < 4) {
      if (n === t) return { terme, categorie };
    } else if (n.includes(t)) {
      return { terme, categorie };
    }
  }
  return null;
}

// Validation complète du pseudo. Retourne null si OK, sinon le message d'erreur.
export function pseudoValide(pseudo) {
  if (!pseudo || pseudo.length < 3 || pseudo.length > 20) {
    return 'Le pseudo doit faire entre 3 et 20 caractères.';
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(pseudo)) {
    return 'Le pseudo commence par une lettre, puis lettres, chiffres, _ . - uniquement.';
  }
  const bloque = trouverTermeBloque(pseudo);
  if (bloque) return `Ce pseudo n'est pas autorisé (modération : ${bloque.categorie}).`;
  return null;
}
