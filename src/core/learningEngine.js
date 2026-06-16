export function createAttemptState() {
  return {
    wrongAttempts: 0,
  };
}

export function checkAnswer(lesson, input) {
  const normalizedInput = normalizeValue(input);
  const normalizedAnswer = normalizeValue(lesson.answer);
  return normalizedInput === normalizedAnswer;
}

export function getGuidanceForAttempt(lesson, previousState) {
  const wrongAttempts = previousState.wrongAttempts + 1;
  const step = lesson.steps[wrongAttempts - 1];

  if (step) {
    return {
      wrongAttempts,
      kind: 'question',
      message: step.question,
      expected: step.expected,
    };
  }

  return {
    wrongAttempts,
    kind: 'analogy',
    message: lesson.analogy,
  };
}

export function evaluateRecap(lesson, text) {
  const normalizedText = String(text || '').replace(/\s+/g, '').toLowerCase();
  const matched = lesson.feynmanKeywords.filter((keyword) =>
    normalizedText.includes(String(keyword).replace(/\s+/g, '').toLowerCase())
  );
  const requiredCount = Math.min(2, lesson.feynmanKeywords.length);
  const missing = lesson.feynmanKeywords.filter((keyword) => !matched.includes(keyword));

  return {
    passed: matched.length >= requiredCount,
    matched,
    missing,
  };
}

function normalizeValue(value) {
  return String(value).trim().replace(/\s+/g, '').toLowerCase();
}
