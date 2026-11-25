// relics.ts — mode Rogue Quizz : les 60 reliques (édition « donjon »), le tirage des
// choix et le calcul des bonus agrégés. Module PUR : aucune dépendance au DOM ni au stockage.
//
// Les reliques sont numérotées 1..60 (colonne « n° » du tableau de conception) :
// `synergies` et `conflits` référencent ces numéros. Deux reliques en conflit sont
// mutuellement exclusives (on ne peut pas les posséder toutes les deux). `cumulable`
// = on peut en posséder plusieurs exemplaires (elles s'additionnent).

/** Rareté d'une relique (couleur + poids de tirage). */
export type RelicRarity = 'commun' | 'rare' | 'legendaire';

/** Catégorie d'une relique (template du tableau de conception). */
export type RelicCategorie =
  | 'temps'
  | 'vision'
  | 'serie'
  | 'points'
  | 'vies'
  | 'themes'
  | 'risque'
  | 'legendaire';

// Poids de tirage SELON LA PROGRESSION dans la run (0 = départ, 1 = fin) :
// au début surtout du commun, à la fin de plus en plus de rare/légendaire.
export const RARETE_POIDS_DEBUT: Record<RelicRarity, number> = {
  commun: 65,
  rare: 28,
  legendaire: 7,
};
export const RARETE_POIDS_FIN: Record<RelicRarity, number> = {
  commun: 10,
  rare: 45,
  legendaire: 45,
};

/** Poids de tirage d'une rareté à une progression donnée (interpolation linéaire 0..1). */
export function poidsRarete(prog: number, rarete: RelicRarity): number {
  const p = Math.max(0, Math.min(1, prog));
  const a = RARETE_POIDS_DEBUT[rarete];
  const b = RARETE_POIDS_FIN[rarete];
  return a + (b - a) * p;
}

export const RARETE_COULEUR: Record<RelicRarity, string> = {
  commun: '#9ca3af',
  rare: '#38bdf8',
  legendaire: '#fbbf24',
};

/** Effet machine d'une relique (les descriptions sont en français pour le joueur). */
export type RelicEffet =
  // --- Temps ---
  | { t: 'timer'; s: number } // +s secondes par question
  | { t: 'timerMalus'; s: number; p: number } // −s s au chrono mais +p % de points
  | { t: 'timerMult'; m: number; flat?: number } // chrono × m (et points fixes si flat)
  | { t: 'pointsFlat'; n: number } // n points fixes par bonne réponse
  | { t: 'carryOver'; max: number } // temps non utilisé reporté à la suivante (max +s)
  | { t: 'marathon'; reserve: number; mult: number } // réserve de `reserve` s par palier, temps restant × mult en points
  | { t: 'gele'; s: number } // bouton « gèle le chrono » s secondes, 1 fois par palier
  | { t: 'secondSouffle'; s: number } // 1re fois par palier à 0 s : +s s au lieu de rater
  | { t: 'speed'; maxS: number; n: number } // réponse en < maxS s : +n pts
  | { t: 'primeVitesse' } // jusqu'à 30 pts (−2/s), minimum 5 pts
  // --- Vision ---
  | { t: 'loupe'; malusS: number } // 2 réponses surlignées (dont la bonne), chrono −s s
  | { t: 'cinquante'; n: number; div: number } // retire n mauvaises réponses, n fois par palier, pts /div
  | { t: 'intuition' } // la bonne réponse scintille 0,5 s, 1 question sur 3
  | { t: 'elimination'; maxPts: number } // toutes les 3 s une mauvaise réponse disparaît, pts max = maxPts
  | { t: 'votePublic' } // pourcentage affiché sur chaque réponse (~75 % fiable)
  | { t: 'barree'; n: number } // la mauvaise réponse la plus piégeuse est barrée, −n pts par question
  | { t: 'indice'; malusS: number } // l'anecdote s'affiche avant de répondre, chrono −s s
  | { t: 'deuxiemeChance'; pts: number } // après une erreur, 1 retentative par palier (question = pts)
  | { t: 'rayonX'; malusS: number } // 1re question du palier : bonne réponse montrée, chrono −s s sur le palier
  | { t: 'boussole'; malusPct: number } // flèche vers la moitié qui contient la bonne réponse, −p % de pts
  // --- Série ---
  | { t: 'streakStep'; step: number } // la série monte de +step par bonne réponse
  | { t: 'streakCapNone' } // le bonus de série n'est plus plafonné à +10
  | { t: 'filetSecurite' } // 1 erreur par palier ne casse pas la série
  | { t: 'combustion'; seuil: number } // streak ≥ seuil : pts ×2 et chrono −1 s par cran (min 4 s)
  | { t: 'rebond' } // après une erreur, la question suivante vaut ×2
  | { t: 'momentum'; max: number } // réponse en < 5 s : +1 s à la suivante (max +s cumulés)
  | { t: 'domino'; vies: number } // après 3 bonnes d'affilée, question à 2 réponses ; ratée = −vies
  | { t: 'fievre'; n: number; s: number; mult: number } // streak 10 : n questions à s s, pts × mult
  // --- Points ---
  | { t: 'plancherPts'; min: number; max: number } // points de la question entre min et max
  | { t: 'interets'; pct: number } // fin de palier : +p % du score total
  | { t: 'jackpotPalier'; mult: number } // 1 question cachée par palier vaut × mult
  | { t: 'toutOuRien'; mult: number; malusPct: number } // palier parfait (10/10) : pts du palier × mult, sinon −p %
  | { t: 'collectionneur' } // +1 pt par bonne réponse et par relique possédée
  | { t: 'dernierMot'; mult: number } // la 10e question de chaque palier vaut × mult
  | { t: 'ascete'; n: number } // refuser un choix de relique rapporte +n pts
  // --- Vies ---
  | { t: 'vie'; n: number; soin: number } // +n vie(s) max et soigne `soin` vie(s)
  | { t: 'bouclier' } // la 1re erreur de chaque palier ne coûte pas de vie
  | { t: 'vampire'; seuil: number } // toutes les `seuil` bonnes d'affilée rendent 1 vie
  | { t: 'verreCristal' } // points ×2 mais vies max = 1
  | { t: 'assuranceVie' } // à la mort : 1 vie (une seule fois), −50 % des points
  | { t: 'infirmerie' } // palier sans erreur : +1 vie
  | { t: 'tempsMort' } // le temps écoulé ne coûte plus de vie (0 pt)
  | { t: 'pacteVies'; vies: number; choix: number } // +vies max, les choix ne proposent plus que `choix` reliques
  // --- Thèmes ---
  | { t: 'specialiste'; mult: number; malusPct: number } // thème choisi : ×mult, autres thèmes −p %
  | { t: 'antiRepete'; n: number } // thème différent de la question précédente : +n pts
  | { t: 'zoneConfort'; malusPct: number } // 1 question sur 3 vient du meilleur thème, −p %
  | { t: 'pioche'; n: number } // passer n questions par palier, remplacées par une plus difficile
  | { t: 'chasseur' } // questions difficiles ×2 et 2 fois plus souvent
  | { t: 'revision'; mult: number } // les erreurs reviennent plus tard, × mult si réussies
  | { t: 'encyclopedie'; s: number } // lire l'anecdote donne +s s à la question suivante
  | { t: 'retourEcole'; malusPct: number } // 1 palier un cran moins difficile, −p % sur ce palier
  // --- Risque ---
  | { t: 'pari' } // miser avant chaque question : ×2 si juste, sinon 0 pt et −1 vie de plus
  | { t: 'brouillard'; pct: number; s: number } // pts +p %, réponses cachées les s premières secondes
  | { t: 'miroir'; pct: number } // pts +p %, réponses mélangées une fois à mi-chrono
  | { t: 'monochrome'; pct: number } // pts +p %, les 4 réponses ont la même couleur
  | { t: 'funambule'; pctParVie: number } // pts + p % par vie manquante
  | { t: 'mainDuDestin' } // à chaque palier, une relique au hasard est ajoutée
  // --- Légendaires ---
  | { t: 'echo' } // la prochaine relique choisie compte en double
  | { t: 'joker' } // copie l'effet de la dernière relique choisie
  | { t: 'recyclage' } // retire une de tes reliques et relance un choix de 3 (rares ou mieux)
  | { t: 'retourArriere'; malusS: number } // 1 fois par palier : annule la dernière réponse, chrono −s s toute la partie

/** Une relique : identité affichée + effet machine. */
export interface Relic {
  id: string;
  /** Numéro 1..60 du tableau de conception (référencé par synergies/conflits). */
  num: number;
  nom: string;
  categorie: RelicCategorie;
  icone: string;
  rarete: RelicRarity;
  /** Peut-on en posséder plusieurs exemplaires ? */
  cumulable: boolean;
  /** Effet (texte joueur). */
  desc: string;
  /** Contrepartie (texte joueur), ex. malus. */
  malus?: string;
  /** Numéros des reliques avec lesquelles celle-ci synergise (info). */
  synergies: number[];
  /** Numéros des reliques mutuellement exclusives avec celle-ci. */
  conflits: number[];
  effet: RelicEffet;
}

/** Les 60 reliques du Rogue Quizz (30 communs, 23 rares, 7 légendaires). */
export const RELICS: Relic[] = [
  // --- TEMPS (1-8) ---
  { num: 1, id: 'sablier', nom: 'Sablier', categorie: 'temps', icone: 'hourglass', rarete: 'commun', cumulable: true, desc: '+3 s par question', synergies: [5, 8], conflits: [], effet: { t: 'timer', s: 3 } },
  { num: 2, id: 'adrenaline', nom: 'Adrénaline', categorie: 'temps', icone: 'trending-up', rarete: 'rare', cumulable: false, desc: 'Points ×1,5', malus: 'Chrono −3 s', synergies: [7, 24, 27], conflits: [], effet: { t: 'timerMalus', s: 3, p: 50 } },
  { num: 3, id: 'arret-sur-image', nom: 'Arrêt sur image', categorie: 'temps', icone: 'pause', rarete: 'commun', cumulable: false, desc: 'Bouton : gèle le chrono 5 s, 1 fois par palier', synergies: [], conflits: [], effet: { t: 'gele', s: 5 } },
  { num: 4, id: 'second-souffle', nom: 'Second souffle', categorie: 'temps', icone: 'heart', rarete: 'commun', cumulable: false, desc: 'La 1re fois par palier où le chrono tombe à 0 : +5 s au lieu de rater', synergies: [], conflits: [], effet: { t: 'secondSouffle', s: 5 } },
  { num: 5, id: 'horloge-partagee', nom: 'Horloge partagée', categorie: 'temps', icone: 'watch', rarete: 'rare', cumulable: false, desc: 'Le temps non utilisé s’ajoute à la question suivante (max +5 s)', synergies: [1, 8], conflits: [], effet: { t: 'carryOver', max: 5 } },
  { num: 6, id: 'tortue', nom: 'Tortue', categorie: 'temps', icone: 'trending-down', rarete: 'commun', cumulable: false, desc: 'Chrono ×2', malus: '10 pts fixes par bonne réponse', synergies: [], conflits: [7, 27], effet: { t: 'timerMult', m: 2, flat: 10 } },
  { num: 7, id: 'eclair', nom: 'Éclair', categorie: 'temps', icone: 'bolt', rarete: 'commun', cumulable: false, desc: 'Réponse en moins de 3 s : +8 pts', synergies: [2, 24, 27], conflits: [6, 27], effet: { t: 'speed', maxS: 3, n: 8 } },
  { num: 8, id: 'marathon', nom: 'Marathon', categorie: 'temps', icone: 'podium', rarete: 'legendaire', cumulable: false, desc: 'Plus de chrono par question : réserve de 80 s pour le palier, temps restant converti en points (×3)', malus: 'Réserve à 0 : toutes les questions restantes du palier sont ratées', synergies: [1, 5], conflits: [], effet: { t: 'marathon', reserve: 80, mult: 3 } },
  // --- VISION (9-18) ---
  { num: 9, id: 'loupe', nom: 'Loupe', categorie: 'vision', icone: 'eye', rarete: 'commun', cumulable: false, desc: '2 réponses en surbrillance, dont la bonne', malus: 'Chrono −3 s', synergies: [14, 52, 54], conflits: [], effet: { t: 'loupe', malusS: 3 } },
  { num: 10, id: 'cinquante', nom: '50/50', categorie: 'vision', icone: 'scissors', rarete: 'commun', cumulable: false, desc: 'Retire 2 mauvaises réponses, 2 fois par palier', malus: 'Points de la question divisés par 2', synergies: [], conflits: [], effet: { t: 'cinquante', n: 2, div: 2 } },
  { num: 11, id: 'intuition', nom: 'Intuition', categorie: 'vision', icone: 'sparkles', rarete: 'rare', cumulable: false, desc: 'La bonne réponse scintille 0,5 s au début, 1 question sur 3 du palier', synergies: [], conflits: [], effet: { t: 'intuition' } },
  { num: 12, id: 'elimination', nom: 'Élimination', categorie: 'vision', icone: 'trash', rarete: 'commun', cumulable: false, desc: 'Toutes les 3 s, une mauvaise réponse disparaît', malus: 'Maximum 15 pts au lieu de 20', synergies: [], conflits: [], effet: { t: 'elimination', maxPts: 15 } },
  { num: 13, id: 'vote-du-public', nom: 'Vote du public', categorie: 'vision', icone: 'chart', rarete: 'commun', cumulable: false, desc: 'Pourcentage affiché sur chaque réponse (juste environ 75 % du temps)', synergies: [], conflits: [], effet: { t: 'votePublic' } },
  { num: 14, id: 'lunettes-rouges', nom: 'Lunettes rouges', categorie: 'vision', icone: 'glasses', rarete: 'commun', cumulable: false, desc: 'La mauvaise réponse la plus piégeuse est barrée', malus: '−2 pts par question', synergies: [9, 52, 54], conflits: [], effet: { t: 'barree', n: -2 } },
  { num: 15, id: 'indice', nom: 'Indice', categorie: 'vision', icone: 'book', rarete: 'commun', cumulable: false, desc: 'L’anecdote s’affiche avant de répondre', malus: 'Chrono −2 s', synergies: [], conflits: [], effet: { t: 'indice', malusS: 2 } },
  { num: 16, id: 'deuxieme-chance', nom: 'Deuxième chance', categorie: 'vision', icone: 'refresh', rarete: 'rare', cumulable: false, desc: 'Après une erreur, on peut retenter (1 fois par palier)', malus: 'La question ne rapporte que 5 pts', synergies: [], conflits: [], effet: { t: 'deuxiemeChance', pts: 5 } },
  { num: 17, id: 'rayon-x', nom: 'Rayon X', categorie: 'vision', icone: 'sun', rarete: 'rare', cumulable: false, desc: 'La 1re question de chaque palier montre la bonne réponse', malus: 'Chrono −1 s sur le reste du palier', synergies: [], conflits: [], effet: { t: 'rayonX', malusS: 1 } },
  { num: 18, id: 'boussole', nom: 'Boussole', categorie: 'vision', icone: 'compass', rarete: 'rare', cumulable: false, desc: 'Une flèche indique la moitié contenant la bonne réponse (A/B ou C/D)', malus: 'Points −25 %', synergies: [], conflits: [], effet: { t: 'boussole', malusPct: 25 } },
  // --- SÉRIE (19-26) ---
  { num: 19, id: 'elan', nom: 'Élan', categorie: 'serie', icone: 'trending-up', rarete: 'commun', cumulable: false, desc: 'La série monte de +2 par cran au lieu de +1', synergies: [20, 21, 26], conflits: [], effet: { t: 'streakStep', step: 2 } },
  { num: 20, id: 'plafond-brise', nom: 'Plafond brisé', categorie: 'serie', icone: 'rocket', rarete: 'rare', cumulable: false, desc: 'Le bonus de série n’est plus limité à +10', synergies: [19, 21, 26], conflits: [], effet: { t: 'streakCapNone' } },
  { num: 21, id: 'filet-de-securite', nom: 'Filet de sécurité', categorie: 'serie', icone: 'umbrella', rarete: 'commun', cumulable: false, desc: '1 erreur par palier ne casse pas la série', synergies: [19, 20, 26], conflits: [], effet: { t: 'filetSecurite' } },
  { num: 22, id: 'combustion', nom: 'Combustion', categorie: 'serie', icone: 'flame', rarete: 'rare', cumulable: false, desc: 'À partir de 5 bonnes d’affilée : points ×2', malus: 'Chrono −1 s par cran de série (minimum 4 s)', synergies: [], conflits: [], effet: { t: 'combustion', seuil: 5 } },
  { num: 23, id: 'rebond', nom: 'Rebond', categorie: 'serie', icone: 'replay', rarete: 'commun', cumulable: false, desc: 'Après une erreur, la question suivante vaut ×2', synergies: [], conflits: [], effet: { t: 'rebond' } },
  { num: 24, id: 'momentum', nom: 'Momentum', categorie: 'serie', icone: 'forward', rarete: 'commun', cumulable: false, desc: 'Chaque réponse en moins de 5 s donne +1 s à la suivante (max +5 s)', synergies: [2, 7, 27], conflits: [], effet: { t: 'momentum', max: 5 } },
  { num: 25, id: 'domino', nom: 'Domino', categorie: 'serie', icone: 'dice', rarete: 'rare', cumulable: false, desc: 'Après 3 bonnes d’affilée, la question suivante n’a que 2 réponses', malus: 'Si tu la rates : −2 vies', synergies: [], conflits: [], effet: { t: 'domino', vies: 2 } },
  { num: 26, id: 'fievre', nom: 'Fièvre', categorie: 'serie', icone: 'heart-pulse', rarete: 'legendaire', cumulable: false, desc: 'À 10 d’affilée : 3 questions en « fièvre », points ×3', malus: '5 s de chrono pendant la fièvre', synergies: [19, 20, 21], conflits: [], effet: { t: 'fievre', n: 3, s: 5, mult: 3 } },
  // --- POINTS (27-34) ---
  { num: 27, id: 'prime-de-vitesse', nom: 'Prime de vitesse', categorie: 'points', icone: 'timer', rarete: 'commun', cumulable: false, desc: 'Jusqu’à 30 pts par bonne réponse (−2 par seconde)', malus: 'Minimum 5 pts au lieu de 10', synergies: [2, 7, 24], conflits: [6, 7], effet: { t: 'primeVitesse' } },
  { num: 28, id: 'plancher', nom: 'Plancher', categorie: 'points', icone: 'scale', rarete: 'commun', cumulable: false, desc: 'Minimum 15 pts par bonne réponse', malus: 'Maximum 18 pts', synergies: [], conflits: [], effet: { t: 'plancherPts', min: 15, max: 18 } },
  { num: 29, id: 'interets', nom: 'Intérêts', categorie: 'points', icone: 'coins', rarete: 'rare', cumulable: false, desc: 'Fin de palier : +10 % de ton score total', synergies: [], conflits: [], effet: { t: 'interets', pct: 10 } },
  { num: 30, id: 'jackpot', nom: 'Jackpot', categorie: 'points', icone: 'ticket', rarete: 'commun', cumulable: false, desc: '1 question cachée par palier vaut ×5', synergies: [], conflits: [], effet: { t: 'jackpotPalier', mult: 5 } },
  { num: 31, id: 'tout-ou-rien', nom: 'Tout ou rien', categorie: 'points', icone: 'dice', rarete: 'rare', cumulable: false, desc: 'Palier parfait (10/10) : points du palier ×2', malus: 'Sinon −20 % sur le palier', synergies: [], conflits: [], effet: { t: 'toutOuRien', mult: 2, malusPct: 20 } },
  { num: 32, id: 'collectionneur', nom: 'Collectionneur', categorie: 'points', icone: 'gem', rarete: 'rare', cumulable: false, desc: '+1 pt par bonne réponse pour chaque relique possédée', synergies: [34], conflits: [], effet: { t: 'collectionneur' } },
  { num: 33, id: 'dernier-mot', nom: 'Dernier mot', categorie: 'points', icone: 'pin', rarete: 'commun', cumulable: false, desc: 'La 10e question de chaque palier vaut ×3', synergies: [], conflits: [], effet: { t: 'dernierMot', mult: 3 } },
  { num: 34, id: 'ascete', nom: 'Ascète', categorie: 'points', icone: 'x', rarete: 'commun', cumulable: false, desc: 'Refuser un choix de relique rapporte +150 pts', synergies: [32], conflits: [], effet: { t: 'ascete', n: 150 } },
  // --- VIES (35-42) ---
  { num: 35, id: 'coeur-en-plus', nom: 'Cœur en plus', categorie: 'vies', icone: 'heart', rarete: 'commun', cumulable: true, desc: '+1 vie max et soigne 1 vie', synergies: [], conflits: [], effet: { t: 'vie', n: 1, soin: 1 } },
  { num: 36, id: 'bouclier', nom: 'Bouclier', categorie: 'vies', icone: 'shield', rarete: 'rare', cumulable: false, desc: 'La 1re erreur de chaque palier ne coûte pas de vie', synergies: [38, 39, 51, 55], conflits: [], effet: { t: 'bouclier' } },
  { num: 37, id: 'vampire', nom: 'Vampire', categorie: 'vies', icone: 'skull', rarete: 'rare', cumulable: false, desc: '5 bonnes réponses d’affilée rendent 1 vie', synergies: [], conflits: [], effet: { t: 'vampire', seuil: 5 } },
  { num: 38, id: 'verre-de-cristal', nom: 'Verre de cristal', categorie: 'vies', icone: 'orbit', rarete: 'legendaire', cumulable: false, desc: 'Points ×2', malus: 'Tu passes à 1 vie max', synergies: [36, 39, 55], conflits: [], effet: { t: 'verreCristal' } },
  { num: 39, id: 'assurance', nom: 'Assurance', categorie: 'vies', icone: 'umbrella', rarete: 'rare', cumulable: false, desc: 'À la mort, tu reviens avec 1 vie (une seule fois)', malus: 'Tu perds 50 % de tes points', synergies: [36, 38, 55], conflits: [], effet: { t: 'assuranceVie' } },
  { num: 40, id: 'infirmerie', nom: 'Infirmerie', categorie: 'vies', icone: 'plus', rarete: 'commun', cumulable: false, desc: 'Palier sans erreur : +1 vie', synergies: [], conflits: [], effet: { t: 'infirmerie' } },
  { num: 41, id: 'temps-mort', nom: 'Temps mort', categorie: 'vies', icone: 'alarm-clock', rarete: 'commun', cumulable: false, desc: 'Le temps écoulé ne coûte plus de vie (la question rapporte 0)', synergies: [], conflits: [], effet: { t: 'tempsMort' } },
  { num: 42, id: 'pacte', nom: 'Pacte', categorie: 'vies', icone: 'skull', rarete: 'rare', cumulable: false, desc: '+2 vies max', malus: 'Les choix ne proposent plus que 2 reliques au lieu de 3', synergies: [], conflits: [], effet: { t: 'pacteVies', vies: 2, choix: 2 } },
  // --- THÈMES (43-50) ---
  { num: 43, id: 'specialiste', nom: 'Spécialiste', categorie: 'themes', icone: 'target', rarete: 'rare', cumulable: false, desc: 'Tu choisis un thème : ses questions valent ×2', malus: 'Les autres thèmes −20 %', synergies: [45, 46, 47], conflits: [], effet: { t: 'specialiste', mult: 2, malusPct: 20 } },
  { num: 44, id: 'touche-a-tout', nom: 'Touche-à-tout', categorie: 'themes', icone: 'globe', rarete: 'commun', cumulable: false, desc: '+4 pts quand le thème change d’une question à l’autre', synergies: [], conflits: [], effet: { t: 'antiRepete', n: 4 } },
  { num: 45, id: 'zone-de-confort', nom: 'Zone de confort', categorie: 'themes', icone: 'home', rarete: 'commun', cumulable: false, desc: '1 question sur 3 vient de ton meilleur thème', malus: 'Elle rapporte −25 %', synergies: [43, 46, 47], conflits: [], effet: { t: 'zoneConfort', malusPct: 25 } },
  { num: 46, id: 'pioche', nom: 'Pioche', categorie: 'themes', icone: 'map', rarete: 'commun', cumulable: false, desc: 'Thème affiché avant la question ; tu peux en passer 2 par palier', malus: 'Une question passée est remplacée par une plus difficile', synergies: [43, 45, 47], conflits: [], effet: { t: 'pioche', n: 2 } },
  { num: 47, id: 'chasseur', nom: 'Chasseur', categorie: 'themes', icone: 'crosshair', rarete: 'rare', cumulable: false, desc: 'Questions difficiles ×2', malus: 'Elles arrivent 2 fois plus souvent', synergies: [43, 45, 46], conflits: [], effet: { t: 'chasseur' } },
  { num: 48, id: 'revision', nom: 'Révision', categorie: 'themes', icone: 'scroll', rarete: 'commun', cumulable: false, desc: 'Tes erreurs reviennent plus tard ; réussies, elles valent ×3', synergies: [], conflits: [], effet: { t: 'revision', mult: 3 } },
  { num: 49, id: 'encyclopedie', nom: 'Encyclopédie', categorie: 'themes', icone: 'book', rarete: 'commun', cumulable: false, desc: 'Lire l’anecdote donne +2 s à la question suivante', synergies: [], conflits: [], effet: { t: 'encyclopedie', s: 2 } },
  { num: 50, id: 'retour-a-l-ecole', nom: 'Retour à l’école', categorie: 'themes', icone: 'pencil', rarete: 'commun', cumulable: false, desc: 'Niveau abaissé d’un cran pendant 1 palier', malus: 'Points −30 % sur ce palier', synergies: [], conflits: [], effet: { t: 'retourEcole', malusPct: 30 } },
  // --- RISQUE (51-56) ---
  { num: 51, id: 'pari', nom: 'Pari', categorie: 'risque', icone: 'chip', rarete: 'rare', cumulable: false, desc: 'Avant chaque question, tu peux miser : ×2 si juste', malus: 'Si faux : 0 pt et −1 vie de plus', synergies: [36], conflits: [], effet: { t: 'pari' } },
  { num: 52, id: 'brouillard', nom: 'Brouillard', categorie: 'risque', icone: 'question', rarete: 'rare', cumulable: false, desc: 'Points ×1,6', malus: 'Réponses cachées les 2 premières secondes', synergies: [9, 14, 54], conflits: [], effet: { t: 'brouillard', pct: 60, s: 2 } },
  { num: 53, id: 'miroir', nom: 'Miroir', categorie: 'risque', icone: 'copy', rarete: 'rare', cumulable: false, desc: 'Points ×1,5', malus: 'Les réponses se mélangent une fois à mi-chrono', synergies: [], conflits: [], effet: { t: 'miroir', pct: 50 } },
  { num: 54, id: 'monochrome', nom: 'Monochrome', categorie: 'risque', icone: 'star', rarete: 'commun', cumulable: false, desc: 'Points ×1,3', malus: 'Les 4 réponses ont la même couleur', synergies: [9, 14, 52], conflits: [], effet: { t: 'monochrome', pct: 30 } },
  { num: 55, id: 'funambule', nom: 'Funambule', categorie: 'risque', icone: 'sliders', rarete: 'rare', cumulable: false, desc: 'Points ×1,2 par vie manquante', synergies: [36, 38, 39], conflits: [], effet: { t: 'funambule', pctParVie: 20 } },
  { num: 56, id: 'main-du-destin', nom: 'Main du destin', categorie: 'risque', icone: 'clover', rarete: 'rare', cumulable: false, desc: 'À chaque palier, une relique au hasard est ajoutée (bon ou mauvais)', synergies: [], conflits: [], effet: { t: 'mainDuDestin' } },
  // --- LÉGENDAIRES (57-60) ---
  { num: 57, id: 'echo', nom: 'Écho', categorie: 'legendaire', icone: 'share', rarete: 'legendaire', cumulable: false, desc: 'La prochaine relique choisie compte en double', synergies: [], conflits: [], effet: { t: 'echo' } },
  { num: 58, id: 'joker', nom: 'Joker', categorie: 'legendaire', icone: 'question', rarete: 'legendaire', cumulable: false, desc: 'Copie l’effet de la dernière relique choisie', synergies: [], conflits: [], effet: { t: 'joker' } },
  { num: 59, id: 'recyclage', nom: 'Recyclage', categorie: 'legendaire', icone: 'refresh', rarete: 'legendaire', cumulable: false, desc: 'Retire une de tes reliques et relance un choix de 3 (rares ou mieux)', synergies: [], conflits: [], effet: { t: 'recyclage' } },
  { num: 60, id: 'retour-en-arriere', nom: 'Retour en arrière', categorie: 'legendaire', icone: 'chevron-left', rarete: 'legendaire', cumulable: false, desc: '1 fois par palier, annule ta dernière réponse', malus: 'Chrono −1 s pour toute la partie', synergies: [], conflits: [], effet: { t: 'retourArriere', malusS: 1 } },
];

// --- Helpers de catalogue ---

/** Les reliques en conflit avec au moins une des reliques `ids` (exclusivité mutuelle). */
export function conflitsDe(ids: string[]): Set<number> {
  const out = new Set<number>();
  for (const id of ids) {
    const r = RELICS.find((x) => x.id === id);
    if (!r) continue;
    for (const c of r.conflits) out.add(c);
    // conflit symétrique : si une relique possédée est listée dans les conflits de r
    for (const autre of RELICS) if (autre.conflits.includes(r.num)) out.add(autre.num);
  }
  return out;
}

/** Nombre d'exemplaires d'une relique dans la liste (reliques cumulables). */
export function countRelic(relics: Relic[], id: string): number {
  return relics.filter((r) => r.id === id).length;
}

/** La relique est-elle possédée (au moins 1 exemplaire) ? */
export function aRelic(relics: Relic[], id: string): boolean {
  return relics.some((r) => r.id === id);
}

// --- Bonus agrégés d'une run ---

export interface RogueBonus {
  timerBonus: number;
  timerMalusPct: number;
  timerMult: number;
  pointsFlat: number | null;
  primeVitesse: boolean;
  plancherMin: number;
  plancherMax: number;
  carryMax: number;
  marathon: { reserve: number; mult: number } | null;
  speed: { maxS: number; n: number }[];
  // vision
  loupeMalusS: number;
  cinquante: { n: number; div: number } | null;
  intuition: boolean;
  eliminationMaxPts: number;
  votePublic: boolean;
  barreeFlat: number;
  indiceMalusS: number;
  deuxiemeChancePts: number;
  rayonXMalusS: number;
  boussoleMalusPct: number;
  boussole: boolean;
  // série
  streakStep: number;
  streakCap: number; // 10 par défaut, Number.MAX_SAFE_INTEGER si plafond brisé
  filetSecurite: boolean;
  combustionSeuil: number;
  rebond: boolean;
  momentumMax: number;
  dominoVies: number;
  fievre: { n: number; s: number; mult: number } | null;
  // points
  pct: number;
  flat: number;
  interetsPct: number;
  jackpotMult: number;
  toutOuRien: { mult: number; malusPct: number } | null;
  collectionneur: boolean;
  dernierMotMult: number;
  ascete: number;
  // vies
  viesMaxBonus: number;
  soin: number;
  bouclier: boolean;
  vampireSeuil: number;
  verreCristal: boolean;
  assuranceVie: boolean;
  infirmerie: boolean;
  tempsMort: boolean;
  pacteChoix: number;
  // thèmes
  specialiste: { mult: number; malusPct: number } | null;
  antiRepete: number;
  zoneConfortMalusPct: number;
  piocheParPalier: number;
  chasseur: boolean;
  revisionMult: number;
  encyclopedieS: number;
  retourEcoleMalusPct: number;
  // risque
  pari: boolean;
  brouillard: { pct: number; s: number } | null;
  miroirPct: number;
  monochromePct: number;
  funambulePctParVie: number;
  mainDuDestin: boolean;
  // légendaires
  echo: boolean;
  joker: boolean;
  recyclage: boolean;
  retourArriereMalusS: number;
  // fin de run
  finalMult: number;
  plancher: number;
}

/** Bonus vides (aucune relique). */
export function emptyRogueBonus(): RogueBonus {
  return {
    timerBonus: 0,
    timerMalusPct: 0,
    timerMult: 1,
    pointsFlat: null,
    primeVitesse: false,
    plancherMin: 0,
    plancherMax: 0,
    carryMax: 0,
    marathon: null,
    speed: [],
    loupeMalusS: 0,
    cinquante: null,
    intuition: false,
    eliminationMaxPts: 0,
    votePublic: false,
    barreeFlat: 0,
    indiceMalusS: 0,
    deuxiemeChancePts: 0,
    rayonXMalusS: 0,
    boussoleMalusPct: 0,
    boussole: false,
    streakStep: 1,
    streakCap: 10,
    filetSecurite: false,
    combustionSeuil: 0,
    rebond: false,
    momentumMax: 0,
    dominoVies: 0,
    fievre: null,
    pct: 0,
    flat: 0,
    interetsPct: 0,
    jackpotMult: 0,
    toutOuRien: null,
    collectionneur: false,
    dernierMotMult: 0,
    ascete: 0,
    viesMaxBonus: 0,
    soin: 0,
    bouclier: false,
    vampireSeuil: 0,
    verreCristal: false,
    assuranceVie: false,
    infirmerie: false,
    tempsMort: false,
    pacteChoix: 0,
    specialiste: null,
    antiRepete: 0,
    zoneConfortMalusPct: 0,
    piocheParPalier: 0,
    chasseur: false,
    revisionMult: 0,
    encyclopedieS: 0,
    retourEcoleMalusPct: 0,
    pari: false,
    brouillard: null,
    miroirPct: 0,
    monochromePct: 0,
    funambulePctParVie: 0,
    mainDuDestin: false,
    echo: false,
    joker: false,
    recyclage: false,
    retourArriereMalusS: 0,
    finalMult: 1,
    plancher: 0,
  };
}

/** Agrège les effets de toutes les reliques choisies en un objet RogueBonus. */
export function computeRogueBonus(relics: Relic[]): RogueBonus {
  const b = emptyRogueBonus();
  for (const r of relics) {
    const e = r.effet;
    switch (e.t) {
      case 'timer':
        b.timerBonus += e.s;
        break;
      case 'timerMalus':
        b.timerBonus -= e.s;
        b.timerMalusPct += e.p;
        break;
      case 'timerMult':
        b.timerMult *= e.m;
        if (e.flat !== undefined) b.pointsFlat = e.flat;
        break;
      case 'pointsFlat':
        b.pointsFlat = e.n;
        break;
      case 'carryOver':
        b.carryMax = Math.max(b.carryMax, e.max);
        break;
      case 'marathon':
        b.marathon = { reserve: e.reserve, mult: e.mult };
        break;
      case 'speed':
        b.speed.push({ maxS: e.maxS, n: e.n });
        break;
      case 'primeVitesse':
        b.primeVitesse = true;
        break;
      case 'loupe':
        b.loupeMalusS = Math.max(b.loupeMalusS, e.malusS);
        break;
      case 'cinquante':
        b.cinquante = { n: e.n, div: e.div };
        break;
      case 'intuition':
        b.intuition = true;
        break;
      case 'elimination':
        b.eliminationMaxPts = Math.max(b.eliminationMaxPts, e.maxPts);
        break;
      case 'votePublic':
        b.votePublic = true;
        break;
      case 'barree':
        b.barreeFlat += e.n;
        break;
      case 'indice':
        b.indiceMalusS = Math.max(b.indiceMalusS, e.malusS);
        break;
      case 'deuxiemeChance':
        b.deuxiemeChancePts = Math.max(b.deuxiemeChancePts, e.pts);
        break;
      case 'rayonX':
        b.rayonXMalusS = Math.max(b.rayonXMalusS, e.malusS);
        break;
      case 'boussole':
        b.boussole = true;
        b.boussoleMalusPct = Math.max(b.boussoleMalusPct, e.malusPct);
        break;
      case 'streakStep':
        b.streakStep = Math.max(b.streakStep, e.step);
        break;
      case 'streakCapNone':
        b.streakCap = Number.MAX_SAFE_INTEGER;
        break;
      case 'filetSecurite':
        b.filetSecurite = true;
        break;
      case 'combustion':
        b.combustionSeuil = Math.max(b.combustionSeuil, e.seuil);
        break;
      case 'rebond':
        b.rebond = true;
        break;
      case 'momentum':
        b.momentumMax = Math.max(b.momentumMax, e.max);
        break;
      case 'domino':
        b.dominoVies = Math.max(b.dominoVies, e.vies);
        break;
      case 'fievre':
        b.fievre = { n: e.n, s: e.s, mult: e.mult };
        break;
      case 'plancherPts':
        b.plancherMin = Math.max(b.plancherMin, e.min);
        b.plancherMax = Math.max(b.plancherMax, e.max);
        break;
      case 'interets':
        b.interetsPct = Math.max(b.interetsPct, e.pct);
        break;
      case 'jackpotPalier':
        b.jackpotMult = Math.max(b.jackpotMult, e.mult);
        break;
      case 'toutOuRien':
        b.toutOuRien = { mult: e.mult, malusPct: e.malusPct };
        break;
      case 'collectionneur':
        b.collectionneur = true;
        break;
      case 'dernierMot':
        b.dernierMotMult = Math.max(b.dernierMotMult, e.mult);
        break;
      case 'ascete':
        b.ascete = Math.max(b.ascete, e.n);
        break;
      case 'vie':
        b.viesMaxBonus += e.n;
        b.soin += e.soin;
        break;
      case 'bouclier':
        b.bouclier = true;
        break;
      case 'vampire':
        b.vampireSeuil = Math.max(b.vampireSeuil, e.seuil);
        break;
      case 'verreCristal':
        b.verreCristal = true;
        b.pct += 100;
        break;
      case 'assuranceVie':
        b.assuranceVie = true;
        break;
      case 'infirmerie':
        b.infirmerie = true;
        break;
      case 'tempsMort':
        b.tempsMort = true;
        break;
      case 'pacteVies':
        b.viesMaxBonus += e.vies;
        b.pacteChoix = Math.max(b.pacteChoix, e.choix);
        break;
      case 'specialiste':
        b.specialiste = { mult: e.mult, malusPct: e.malusPct };
        break;
      case 'antiRepete':
        b.antiRepete = Math.max(b.antiRepete, e.n);
        break;
      case 'zoneConfort':
        b.zoneConfortMalusPct = Math.max(b.zoneConfortMalusPct, e.malusPct);
        break;
      case 'pioche':
        b.piocheParPalier = Math.max(b.piocheParPalier, e.n);
        break;
      case 'chasseur':
        b.chasseur = true;
        break;
      case 'revision':
        b.revisionMult = Math.max(b.revisionMult, e.mult);
        break;
      case 'encyclopedie':
        b.encyclopedieS = Math.max(b.encyclopedieS, e.s);
        break;
      case 'retourEcole':
        b.retourEcoleMalusPct = Math.max(b.retourEcoleMalusPct, e.malusPct);
        break;
      case 'pari':
        b.pari = true;
        break;
      case 'brouillard':
        b.brouillard = { pct: e.pct, s: e.s };
        b.pct += e.pct;
        break;
      case 'miroir':
        b.miroirPct += e.pct;
        b.pct += e.pct;
        break;
      case 'monochrome':
        b.monochromePct += e.pct;
        b.pct += e.pct;
        break;
      case 'funambule':
        b.funambulePctParVie = Math.max(b.funambulePctParVie, e.pctParVie);
        break;
      case 'mainDuDestin':
        b.mainDuDestin = true;
        break;
      case 'echo':
        b.echo = true;
        break;
      case 'joker':
        b.joker = true;
        break;
      case 'recyclage':
        b.recyclage = true;
        break;
      case 'retourArriere':
        b.retourArriereMalusS += e.malusS;
        break;
      case 'gele':
      case 'secondSouffle':
        break; // comportements gérés directement dans useGame (boutons / état par palier)
    }
  }
  b.flat += b.barreeFlat;
  return b;
}

// --- Tirage des propositions ---

/** Tirage pondéré par rareté (poids selon la progression) d'une relique dans le pool. */
function pickWeighted(pool: Relic[], prog: number, rand: () => number): Relic {
  const total = pool.reduce((a, r) => a + poidsRarete(prog, r.rarete), 0);
  let x = rand() * total;
  for (const r of pool) {
    x -= poidsRarete(prog, r.rarete);
    if (x <= 0) return r;
  }
  return pool[pool.length - 1];
}

/**
 * Propose `nb` reliques : ni déjà prises (sauf cumulables), ni en conflit avec une
 * relique déjà prise. Tirage pondéré par rareté, sans remise. `prog` (0..1) =
 * avancement dans la run : il fait évoluer les poids (début = plutôt commun,
 * fin = plutôt rare/légendaire). `rand` permet des tests déterministes.
 */
export function drawRelicChoices(
  dejaPrises: string[],
  nb = 3,
  rand: () => number = Math.random,
  prog = 0,
  raretesMin: RelicRarity[] | null = null
): Relic[] {
  const exclus = new Set(dejaPrises.filter((id) => !RELICS.find((r) => r.id === id)?.cumulable));
  const conf = conflitsDe(dejaPrises);
  let pool = RELICS.filter(
    (r) => !exclus.has(r.id) && !conf.has(r.num) && (!raretesMin || raretesMin.includes(r.rarete))
  );
  const out: Relic[] = [];
  while (out.length < nb && pool.length > 0) {
    const r = pickWeighted(pool, prog, rand);
    out.push(r);
    pool = pool.filter((x) => x.id !== r.id);
  }
  return out;
}

/** Nombre de propositions au prochain choix de relique (3 de base, 2 si Pacte). */
export function nbPropositions(bonus: RogueBonus): number {
  return bonus.pacteChoix > 0 ? bonus.pacteChoix : 3;
}

/** Nombre de reliques à prendre à ce choix (1 dans cette édition). */
export function nbAPrendre(_bonus: RogueBonus): number {
  return 1;
}

// --- Calcul du gain d'une question en mode rogue (fonction PURE) ---

/** Contexte d'une réponse pour le calcul du gain rogue. */
export interface GainContext {
  correct: boolean;
  secondesEcoulees: number;
  /** Durée réelle du timer de la question (10 s de base, 13 s si « dur », reliques rogue…). */
  dureeQuestion: number;
  mancheBonus: boolean;
  /** Nouveau streak si la réponse est bonne. */
  streak: number;
  /** Bonnes réponses AVANT celle-ci. */
  bonnesAvant: number;
  /** Index 0-based de la question dans la run. */
  index: number;
  /** Position dans le palier (1..10). */
  questionDansPalier: number;
  niveau: string;
  themeId: string;
  /** Thème de la question précédente (null si 1re question). */
  themePrecedent: string | null;
  /** Vies actuelles / vies max (Funambule). */
  vies: number;
  viesMax: number;
  /** Le joueur a misé sur cette question (Pari). */
  pariPlace: boolean;
  /** Nombre de reliques possédées (Collectionneur). */
  nbReliques: number;
  /** Thème choisi par Spécialiste (null si aucune). */
  themeSpecialiste: string | null;
  /** La question vient du meilleur thème (Zone de confort). */
  zoneConfort: boolean;
  /** Question de révision (erreur revenue plus tard). */
  isRevision: boolean;
  /** Question en « fièvre » (×3, chrono court). */
  fievreActive: boolean;
  /** Rebond actif (question après une erreur). */
  rebondActif: boolean;
  /** Question jackpot du palier. */
  jackpotActif: boolean;
  /** 50/50 actif sur la question : points divisés par 2. */
  div2: boolean;
}

/**
 * Gain d'une bonne réponse en Rogue Quizz : base arcade (20 − 1 pt/s, min 10,
 * ramenée à l'échelle de la durée réelle) modifiée par toutes les reliques.
 */
export function gainRogue(b: RogueBonus, ctx: GainContext): number {
  if (!ctx.correct) return 0;
  const sec = ctx.secondesEcoulees;
  const duree = Math.max(1, ctx.dureeQuestion);
  let g: number;
  if (b.pointsFlat !== null) {
    g = b.pointsFlat; // Tortue : points fixes
  } else if (b.primeVitesse) {
    g = Math.max(5, 30 - 2 * Math.floor(sec)); // Prime de vitesse
  } else {
    g = Math.max(10, 20 - Math.floor((sec * 10) / duree));
  }
  if (b.plancherMax > 0) g = Math.min(b.plancherMax, Math.max(b.plancherMin, g)); // Plancher
  if (ctx.mancheBonus) g *= 2;
  // multiplicateurs
  g *= 1 + b.pct / 100;
  g *= 1 + b.timerMalusPct / 100;
  if (b.boussole) g *= 1 - b.boussoleMalusPct / 100;
  if (b.specialiste) {
    g *= ctx.themeId === ctx.themeSpecialiste ? b.specialiste.mult : 1 - b.specialiste.malusPct / 100;
  }
  if (ctx.zoneConfort && b.zoneConfortMalusPct > 0) g *= 1 - b.zoneConfortMalusPct / 100;
  if (b.chasseur && ctx.niveau === 'dur') g *= 2;
  if (ctx.isRevision && b.revisionMult > 0) g *= b.revisionMult;
  if (ctx.fievreActive && b.fievre) g *= b.fievre.mult;
  if (ctx.rebondActif && b.rebond) g *= 2;
  if (ctx.pariPlace && b.pari) g *= 2;
  if (ctx.jackpotActif && b.jackpotMult > 0) g *= b.jackpotMult;
  if (b.combustionSeuil > 0 && ctx.streak >= b.combustionSeuil) g *= 2;
  if (ctx.questionDansPalier === 10 && b.dernierMotMult > 0) g *= b.dernierMotMult;
  if (b.funambulePctParVie > 0) {
    const manquantes = Math.max(0, ctx.viesMax - ctx.vies);
    g *= 1 + (b.funambulePctParVie / 100) * manquantes;
  }
  // ajouts
  g += b.flat;
  for (const s of b.speed) if (sec < s.maxS) g += s.n;
  if (b.collectionneur) g += ctx.nbReliques;
  if (b.antiRepete > 0 && ctx.themePrecedent !== null && ctx.themePrecedent !== ctx.themeId)
    g += b.antiRepete;
  if (ctx.div2 && b.cinquante) g /= b.cinquante.div; // 50/50 : points /2
  if (b.eliminationMaxPts > 0) g = Math.min(g, b.eliminationMaxPts); // Élimination : plafond
  return Math.round(g);
}

/**
 * Score final d'une run rogue : multiplicateurs de fin + plancher.
 * `win` = run terminée à 100 questions. `mortsAvant` = index de la question où la run meurt.
 */
export function scoreFinalRogue(
  b: RogueBonus,
  score: number,
  _win: boolean,
  _mortsAvant: number
): number {
  let s = score * b.finalMult;
  if (b.plancher > 0) s = Math.max(s, b.plancher);
  return Math.round(s);
}
