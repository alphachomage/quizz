// Sons générés en direct par le navigateur (Web Audio API) : aucun fichier externe.
// + vibrations (API Vibration, sur mobile surtout).
// Tout est piloté par les préférences utilisateur (voir chargerPrefs dans lib/prefs.js).

let context = null;
function audio() {
  if (!context) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    context = new AC();
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

// Joue une petite séquence de notes. freq = hertz, duree en secondes.
function note(freq, debut, duration, type = 'sine', volumeLevel = 0.18) {
  const ctx = audio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + debut;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volumeLevel, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

// Joue plusieurs notes en même temps (accord riche).
function accord(freqs, debut, duration, type = 'sine', volumeLevel = 0.08) {
  for (const f of freqs) note(f, debut, duration, type, volumeLevel);
}

// Son de "confirmation" GRAVE dans l'esprit d'un kill feed (100 % original, pas une copie) :
// onde triangle douce dans les graves (aucun buzz), hauteur qui monte en glissando,
// filtre passe-bas très sombre, double oscillateur légèrement detuné, et un gros
// coup de basse (sine, une octave sous la note) pour le "boom".
function chirp(f0, f1, debut, duration, volumeLevel = 0.22) {
  const ctx = audio();
  if (!ctx) return;
  const t0 = ctx.currentTime + debut;
  const filtre = ctx.createBiquadFilter();
  filtre.type = 'lowpass';
  filtre.Q.value = 0.8;
  filtre.frequency.setValueAtTime(650, t0);
  filtre.frequency.exponentialRampToValueAtTime(1700, t0 + 0.02);
  filtre.frequency.exponentialRampToValueAtTime(550, t0 + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volumeLevel, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  filtre.connect(gain).connect(ctx.destination);
  for (const det of [-4, 4]) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(f1, t0 + duration * 0.65);
    osc.detune.value = det;
    osc.connect(filtre);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }
  // gros coup de basse une octave en dessous
  note(f0 / 2, debut, duration * 1.2, 'sine', volumeLevel * 0.9);
}
const SOUNDS = {
  // Bonne réponse : un "boum" grave montant (Sol3 -> Re4) + une octave de basse.
  correct: () => {
    chirp(196, 293.66, 0, 0.13);
    note(587.33, 0.08, 0.08, 'sine', 0.05);
  },
  // Sons de SÉRIE (streak) de plus en plus satisfaisants : chaque palier ajoute
  // un chirp grave montant de plus, puis un accord grave et un aigu discret.
  streak3: () => {
    chirp(196, 293.66, 0, 0.11);
    chirp(293.66, 392, 0.08, 0.12);
    note(784, 0.17, 0.1, 'sine', 0.05);
  },
  streak6: () => {
    chirp(196, 293.66, 0, 0.1);
    chirp(293.66, 392, 0.07, 0.1);
    chirp(392, 587.33, 0.14, 0.12);
    accord([196, 293.66, 392], 0.2, 0.26, 'sine', 0.06);
    note(1174.66, 0.22, 0.12, 'sine', 0.05);
  },
  streak10: () => {
    chirp(196, 293.66, 0, 0.1);
    chirp(293.66, 392, 0.06, 0.1);
    chirp(392, 587.33, 0.12, 0.1);
    chirp(587.33, 783.99, 0.18, 0.12);
    accord([196, 246.94, 293.66, 392, 587.33], 0.24, 0.42, 'sine', 0.06);
    note(1567.98, 0.3, 0.3, 'sine', 0.06);
  },
  faux: () => {
    note(160, 0, 0.28, 'sawtooth', 0.14);
    note(110, 0.12, 0.3, 'sawtooth', 0.12);
  },
  // Grondement d'éclair DOUX (déblocage badge/titre) : crack aigu très bref +
  // bruit filtré qui s'assourdit + sine grave qui descend. Volume contenu, pas agressif.
  tonnerre: () => {
    const ctx = audio();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const duration = 0.7;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2.2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filtre = ctx.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.setValueAtTime(2600, t0);
    filtre.frequency.exponentialRampToValueAtTime(220, t0 + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filtre).connect(gain).connect(ctx.destination);
    src.start(t0);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t0);
    osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.55);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.exponentialRampToValueAtTime(0.2, t0 + 0.03);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    osc.connect(g2).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.65);
  },
  tick: () => {
    note(1200, 0, 0.05, 'square', 0.06);
  },
  clic: () => {
    note(500, 0, 0.06, 'triangle', 0.1);
  },
  fin: () => {
    note(523, 0, 0.14);
    note(659, 0.12, 0.14);
    note(784, 0.24, 0.22);
  },
  record: () => {
    note(784, 0, 0.12);
    note(988, 0.1, 0.12);
    note(1175, 0.2, 0.12);
    note(1568, 0.3, 0.3);
  },
};

// Nom du son de bonne réponse selon la série en cours : plus la streak monte,
// plus le son devient riche et satisfaisant (1-2 = chirp, 3-5 = 2 chirps montants,
// 6-9 = 3 chirps + accord + étincelle, 10+ = 4 chirps + accord large + aigu cristallin).
export function soundForStreak(streak) {
  if (streak >= 10) return 'streak10';
  if (streak >= 6) return 'streak6';
  if (streak >= 3) return 'streak3';
  return 'correct';
}

// nom : 'correct' | 'streak3' | 'streak6' | 'streak10' | 'faux' | 'tick' | 'clic' | 'fin' | 'record'
function playSound(nom, prefs) {
  if (!prefs || prefs.sons === false) return;
  try {
    (SOUNDS[nom] || SOUNDS.clic)();
  } catch {
    // audio indisponible : on ignore
  }
}

// --- Musique de fond de partie : nappe d'accords lente et douce (Web Audio, rien d'externe) ---
// Progression Am7 - Fa maj7 - Do - Sol, oscillateurs triangle légèrement detunés,
// une petite note aiguë pentatonique de temps en temps. Volume très bas, fondu in/out.
export { playSound };
let musicPlaying = null;
export function startMusic(prefs) {
  if (!prefs || prefs.music === false) return;
  stopMusic();
  const ctx = audio();
  if (!ctx) return;
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 1.8); // fondu entrant
  master.connect(ctx.destination);
  const accords = [
    [220.0, 261.63, 329.63, 392.0],
    // La m7
    [174.61, 220.0, 261.63, 349.23],
    // Fa maj7
    [130.81, 196.0, 261.63, 329.63],
    // Do
    [196.0, 246.94, 293.66, 392.0], // Sol
  ];
  const penta = [440.0, 523.25, 587.33, 659.25, 783.99];
  let index = 0;
  const playChord = () => {
    const notes = accords[index % accords.length];
    index += 1;
    const t0 = ctx.currentTime;
    for (const f of notes) {
      for (const det of [-4, 4]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;
        osc.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.045, t0 + 1.4);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.3);
        osc.connect(g).connect(master);
        osc.start(t0);
        osc.stop(t0 + 4.5);
      }
    }
    // note aiguë douce de temps en temps
    if (Math.random() < 0.65) {
      const f = penta[Math.floor(Math.random() * penta.length)];
      note(f, 0.6 + Math.random() * 2.6, 0.6, 'sine', 0.03);
    }
  };
  playChord();
  const timer = setInterval(playChord, 4000);
  musicPlaying = {
    stop() {
      clearInterval(timer);
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        setTimeout(() => {
          try {
            master.disconnect();
          } catch {
            /* nœud déjà déconnecté */
          }
        }, 700);
      } catch {
        // le context audio était déjà fermé : rien à faire
      }
    },
  };
}
export function stopMusic() {
  if (musicPlaying) {
    musicPlaying.stop();
    musicPlaying = null;
  }
}

// pattern : nombre (ms) ou tableau de ms (alternance vibre/pause)
export function vibrate(pattern, prefs) {
  if (!prefs || prefs.vibrations === false) return;
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    // pas de vibration disponible : on ignore
  }
}
