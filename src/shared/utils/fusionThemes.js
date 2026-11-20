// fusionThemes.js — fusionne les thèmes perso (fichier JSON) avec la base :
// même id = questions ajoutées (rien n'est jamais supprimé).
export function fusionThemes(base, perso) {
  const map = new Map(base.map((t) => [t.id, { ...t, questions: [...t.questions] }]));
  for (const t of perso) {
    if (!t || !t.id || !Array.isArray(t.questions)) continue;
    if (map.has(t.id)) {
      const existant = map.get(t.id);
      existant.questions = [...existant.questions, ...t.questions];
      if (t.nom) existant.nom = t.nom;
      if (t.icone) existant.icone = t.icone;
      if (t.couleur) existant.couleur = t.couleur;
    } else {
      map.set(t.id, {
        id: t.id,
        nom: t.nom || t.id,
        icone: t.icone || 'question',
        couleur: t.couleur || '#8b5cf6',
        questions: t.questions,
      });
    }
  }
  return [...map.values()];
}
