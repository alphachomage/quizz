// dates.ts — dates et semaines (heure locale), utilisées par le quizz du jour,
// la série de jours et les statistiques. Module PUR.

// Date du jour au format AAAA-MM-JJ (heure locale).
export function todayDate(): string {
  return localDayKey(new Date());
}

// Date d'un jour décalé de `offsetJours` par rapport à aujourd'hui (AAAA-MM-JJ, heure locale).
export function dayDate(offsetJours = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetJours);
  return localDayKey(d);
}

// Clé de jour au format AAAA-MM-JJ en heure LOCALE (pour les stats / le calendrier).
export function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Vrai si la date ISO tombe dans la semaine en cours (lundi 00:00 -> lundi suivant 00:00).
export function isThisWeek(dateISO?: string): boolean {
  const d = dateISO ? new Date(dateISO) : new Date();
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const lundi = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7)); // lundi de cette semaine
  const lundiProchain = new Date(lundi);
  lundiProchain.setDate(lundiProchain.getDate() + 7);
  return d >= lundi && d < lundiProchain;
}
