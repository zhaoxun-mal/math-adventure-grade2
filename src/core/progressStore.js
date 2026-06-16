const STORAGE_KEY = 'mathAdventureProgress';

export function createDefaultProgress() {
  return {
    stars: 0,
    currentTopic: 'carry-borrow',
    completedLessons: [],
  };
}

export function loadProgress(storage = window.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultProgress();
    }
    return {
      ...createDefaultProgress(),
      ...JSON.parse(raw),
    };
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(progress, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  return progress;
}

export function completeLesson(storage, lessonId, topicId) {
  const progress = loadProgress(storage);
  const completedLessons = progress.completedLessons.includes(lessonId)
    ? progress.completedLessons
    : [...progress.completedLessons, lessonId];
  const gainedStar = completedLessons.length > progress.completedLessons.length ? 1 : 0;

  return saveProgress(
    {
      ...progress,
      stars: progress.stars + gainedStar,
      currentTopic: topicId,
      completedLessons,
    },
    storage
  );
}
