import { Topic, MistakeItem, UserSettings, QuizDepth } from '../types';

export const REPETITION_INTERVALS = [1, 3, 7, 14, 30]; // in days

const TOPICS_STORAGE_KEY = 'learning_calendar_topics';
const MISTAKES_STORAGE_KEY = 'learning_calendar_mistakes';
const SETTINGS_STORAGE_KEY = 'learning_calendar_settings';

// Helper to format Date to YYYY-MM-DD in local time
export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDateString(dateStr);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export function getTodayString(): string {
  return toDateString(new Date());
}

export function isDue(nextReviewDateStr: string, todayStr = getTodayString()): boolean {
  return nextReviewDateStr <= todayStr;
}

export function getStoredTopics(): Topic[] {
  try {
    const raw = localStorage.getItem(TOPICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Purge any default sample lessons
    const clean = parsed.filter((t: any) => !t.id?.startsWith('sample-'));
    if (clean.length !== parsed.length) {
      saveStoredTopics(clean);
    }
    return clean;
  } catch (e) {
    console.error('Failed to parse stored topics:', e);
    return [];
  }
}

export function saveStoredTopics(topics: Topic[]): void {
  try {
    localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics));
  } catch (e) {
    console.error('Failed to save topics:', e);
  }
}

export function getStoredMistakes(): MistakeItem[] {
  try {
    const raw = localStorage.getItem(MISTAKES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Purge sample mistakes
    const clean = parsed.filter((m: any) => !m.topicId?.startsWith('sample-'));
    if (clean.length !== parsed.length) {
      saveStoredMistakes(clean);
    }
    return clean;
  } catch (e) {
    return [];
  }
}

export function saveStoredMistakes(mistakes: MistakeItem[]): void {
  try {
    localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(mistakes));
  } catch (e) {
    console.error('Failed to save mistakes:', e);
  }
}

export function addMistake(mistake: Omit<MistakeItem, 'id' | 'dateLogged'>): void {
  const mistakes = getStoredMistakes();
  // Check if identical question already in mistakes
  const existingIdx = mistakes.findIndex(m => m.question === mistake.question && m.topicId === mistake.topicId);
  const newEntry: MistakeItem = {
    ...mistake,
    id: `mistake_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    dateLogged: getTodayString(),
  };

  if (existingIdx >= 0) {
    mistakes[existingIdx] = newEntry;
  } else {
    mistakes.unshift(newEntry);
  }
  saveStoredMistakes(mistakes);
}

export function removeMistake(id: string): void {
  const mistakes = getStoredMistakes().filter(m => m.id !== id);
  saveStoredMistakes(mistakes);
}

export function getStoredSettings(): UserSettings {
  const today = getTodayString();
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      const initial: UserSettings = {
        darkMode: false,
        streak: 0,
        lastActiveDate: today,
        reviewsCompletedToday: [],
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const settings = JSON.parse(raw) as UserSettings;
    // Check if day changed to reset reviewsCompletedToday
    if (settings.lastActiveDate !== today) {
      settings.reviewsCompletedToday = [];
    }
    return settings;
  } catch (e) {
    return {
      darkMode: false,
      streak: 1,
      lastActiveDate: today,
      reviewsCompletedToday: [],
    };
  }
}

export function saveStoredSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function recordActivityStreak(): void {
  const settings = getStoredSettings();
  const today = getTodayString();
  const yesterday = addDays(today, -1);

  if (settings.lastActiveDate === today) {
    // Already active today, streak intact
    return;
  }

  if (settings.lastActiveDate === yesterday) {
    settings.streak += 1;
  } else if (!settings.lastActiveDate) {
    settings.streak = 1;
  } else {
    // Streak broken, reset to 1
    settings.streak = 1;
  }

  settings.lastActiveDate = today;
  saveStoredSettings(settings);
}

// Spaced Repetition calculation
export function updateTopicAfterQuiz(
  topicId: string,
  score: number,
  total: number,
  depth: QuizDepth
): { updatedTopic: Topic; intervalChange: string } {
  const topics = getStoredTopics();
  const topicIdx = topics.findIndex(t => t.id === topicId);
  if (topicIdx === -1) throw new Error('Topic not found');

  const topic = { ...topics[topicIdx] };
  const percent = total > 0 ? (score / total) * 100 : 0;
  const today = getTodayString();

  let intervalChange = '';

  if (percent >= 80) {
    // Good/Easy score: advance interval
    const nextStep = Math.min(topic.intervalStep + 1, REPETITION_INTERVALS.length - 1);
    const daysAhead = REPETITION_INTERVALS[nextStep];
    topic.intervalStep = nextStep;
    topic.nextReviewDate = addDays(today, daysAhead);
    topic.mastery = nextStep >= 4 ? 'mastered' : 'learning';
    intervalChange = `Advancing to ${daysAhead}-day interval!`;
  } else if (percent < 60) {
    // Poor score: reset to 1 day interval
    topic.intervalStep = 0;
    topic.nextReviewDate = addDays(today, REPETITION_INTERVALS[0]);
    topic.mastery = 'learning';
    intervalChange = `Reset to ${REPETITION_INTERVALS[0]}-day interval for quick review.`;
  } else {
    // Moderate score (60-79%): keep current interval
    const daysAhead = REPETITION_INTERVALS[topic.intervalStep];
    topic.nextReviewDate = addDays(today, daysAhead);
    topic.mastery = 'learning';
    intervalChange = `Retaining ${daysAhead}-day interval.`;
  }

  topic.lastReviewedDate = today;
  topic.reviewCount = (topic.reviewCount || 0) + 1;
  topic.quizScores = [
    ...(topic.quizScores || []),
    { date: today, score, total, depth },
  ];

  topics[topicIdx] = topic;
  saveStoredTopics(topics);
  recordActivityStreak();

  return { updatedTopic: topic, intervalChange };
}

// Update topic after flashcards
export function updateTopicAfterFlashcards(
  topicId: string,
  ratings: { again: number; hard: number; good: number; easy: number }
): { updatedTopic: Topic; intervalChange: string } {
  const topics = getStoredTopics();
  const topicIdx = topics.findIndex(t => t.id === topicId);
  if (topicIdx === -1) throw new Error('Topic not found');

  const topic = { ...topics[topicIdx] };
  const totalCards = ratings.again + ratings.hard + ratings.good + ratings.easy;
  const goodEasyPct = totalCards > 0 ? ((ratings.good + ratings.easy) / totalCards) * 100 : 0;
  const today = getTodayString();

  let intervalChange = '';

  if (goodEasyPct >= 75 && ratings.again === 0) {
    const nextStep = Math.min(topic.intervalStep + 1, REPETITION_INTERVALS.length - 1);
    const daysAhead = REPETITION_INTERVALS[nextStep];
    topic.intervalStep = nextStep;
    topic.nextReviewDate = addDays(today, daysAhead);
    topic.mastery = nextStep >= 4 ? 'mastered' : 'learning';
    intervalChange = `Great recall! Next review in ${daysAhead} days.`;
  } else if (ratings.again > (totalCards / 3) || goodEasyPct < 50) {
    topic.intervalStep = 0;
    topic.nextReviewDate = addDays(today, 1);
    topic.mastery = 'learning';
    intervalChange = 'Need more practice. Review scheduled for tomorrow (1 day).';
  } else {
    const daysAhead = REPETITION_INTERVALS[topic.intervalStep];
    topic.nextReviewDate = addDays(today, daysAhead);
    intervalChange = `Solid progress. Retaining ${daysAhead}-day interval.`;
  }

  topic.lastReviewedDate = today;
  topic.reviewCount = (topic.reviewCount || 0) + 1;

  topics[topicIdx] = topic;
  saveStoredTopics(topics);
  recordActivityStreak();

  return { updatedTopic: topic, intervalChange };
}

// Caching functions
export function getCachedQuiz(topicId: string, depthOrKey: QuizDepth | string): any | null {
  try {
    const raw = localStorage.getItem(`quiz_cache_${topicId}_${depthOrKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    // Check and purge old generic placeholder questions if previously cached
    const isGeneric = parsed.some((q: any) =>
      q.question?.includes('core definition and primary objective') ||
      q.question?.includes('fundamental component or characteristic') ||
      q.options?.some((o: string) => o.includes('underlying mechanism and causal relationships'))
    );

    if (isGeneric) {
      localStorage.removeItem(`quiz_cache_${topicId}_${depthOrKey}`);
      return null;
    }

    return parsed;
  } catch (e) {
    return null;
  }
}

export function setCachedQuiz(topicId: string, depthOrKey: QuizDepth | string, questions: any): void {
  try {
    localStorage.setItem(`quiz_cache_${topicId}_${depthOrKey}`, JSON.stringify(questions));
  } catch (e) {
    console.error('Failed to cache quiz:', e);
  }
}

export function getCachedFlashcards(topicId: string): any | null {
  try {
    const raw = localStorage.getItem(`fc_cache_${topicId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setCachedFlashcards(topicId: string, flashcards: any): void {
  try {
    localStorage.setItem(`fc_cache_${topicId}`, JSON.stringify(flashcards));
  } catch (e) {
    console.error('Failed to cache flashcards:', e);
  }
}

// Export / Import Data
export function exportAllData(): string {
  const data = {
    topics: getStoredTopics(),
    mistakes: getStoredMistakes(),
    settings: getStoredSettings(),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.topics && Array.isArray(parsed.topics)) {
      saveStoredTopics(parsed.topics);
    }
    if (parsed.mistakes && Array.isArray(parsed.mistakes)) {
      saveStoredMistakes(parsed.mistakes);
    }
    if (parsed.settings && typeof parsed.settings === 'object') {
      saveStoredSettings(parsed.settings);
    }
    return true;
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
}
