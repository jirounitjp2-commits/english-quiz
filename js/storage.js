const KEYS = {
  stats: "quizStats",
  wrong: "wrongQuestions",
  settings: "settings",
};

const EMPTY_STATS = {
  totalAnswered: 0,
  totalCorrect: 0,
  xp: 0,
  streak: 0,
  lastStudyDate: null,
};

function read(key, fallback) {
  const value = localStorage.getItem(key);
  if (value !== null) return JSON.parse(value);
  if (Array.isArray(fallback)) return [...fallback];
  if (fallback && typeof fallback === "object") return { ...fallback };
  return fallback;
}

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getStats() {
  return { ...EMPTY_STATS, ...read(KEYS.stats, EMPTY_STATS) };
}

export function saveStats(stats) {
  localStorage.setItem(KEYS.stats, JSON.stringify(stats));
}

export function getWrongQuestions() {
  return read(KEYS.wrong, []);
}

export function saveWrongQuestions(ids) {
  localStorage.setItem(KEYS.wrong, JSON.stringify([...new Set(ids)]));
}

export function getSettings() {
  return { sound: true, ...read(KEYS.settings, { sound: true }) };
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

export function getLevel(xp) {
  return Math.floor(xp / 100) + 1;
}

export function recordAnswer(wasCorrect, isReview = false) {
  const stats = getStats();
  const previousLevel = getLevel(stats.xp);
  stats.totalAnswered += 1;
  if (wasCorrect) {
    stats.totalCorrect += 1;
    stats.xp += isReview ? 15 : 10;
  }

  const today = localDate();
  if (stats.lastStudyDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = localDate(yesterday);
    stats.streak = stats.lastStudyDate === yesterdayString ? stats.streak + 1 : 1;
    stats.lastStudyDate = today;
  }

  saveStats(stats);
  return { stats, leveledUp: getLevel(stats.xp) > previousLevel };
}
