// streak.js — série de jours du quizz du jour (façon Snapchat, mais avec un éclair).
// { compte: N, dernierJour: 'AAAA-MM-JJ' } — +1 si joué hier, sinon recommence à 1.
import { DailyStreakRepo } from './repositories.js';
import { todayDate, dayDate } from './dates.js';
export function loadDailyStreak() {
  return DailyStreakRepo.read();
}

// Pour l'affichage : si le dernier jour joué est antérieur à hier, la série est rompue.
export function currentDailyStreak() {
  const s = loadDailyStreak();
  if (!s.lastDay || s.lastDay < dayDate(-1))
    return {
      account: 0,
      lastDay: s.lastDay,
    };
  return s;
}

// Appelé à la fin d'une partie « quizz du jour » : incrémente la série si joué hier.
export function recordDailyStreak() {
  const today = todayDate();
  const yesterday = dayDate(-1);
  const s = loadDailyStreak();
  let account = 1;
  if (s.lastDay === yesterday) account = (s.account || 0) + 1;
  else if (s.lastDay === today) account = s.account || 1;
  const nouveau = {
    account,
    lastDay: today,
  };
  DailyStreakRepo.save(nouveau);
  return nouveau;
}
