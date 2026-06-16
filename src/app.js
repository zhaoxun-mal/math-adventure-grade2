import { topics, getLessonById, getLessonsByTopic } from './data/lessons.js';
import {
  checkAnswer,
  createAttemptState,
  getGuidanceForAttempt,
} from './core/learningEngine.js';
import { completeLesson, loadProgress, saveProgress } from './core/progressStore.js';

const app = document.querySelector('#app');
const storage = window.localStorage;

let progress = loadProgress(storage);
let screen = {
  name: 'home',
  selectedTopicId: progress.currentTopic,
  selectedLessonId: null,
  attemptState: createAttemptState(),
  guidance: null,
  solvedLesson: false,
  recapFeedback: null,
  reward: null,
};

render();

function render() {
  if (screen.name === 'home') {
    renderHome();
    return;
  }

  if (screen.name === 'topic') {
    renderTopic();
    return;
  }

  if (screen.name === 'lesson') {
    renderLesson();
  }
}

function renderHome() {
  app.innerHTML = `
    <section class="home-screen">
      <div class="top-bar">
        <div>
          <p class="eyebrow">数学小侦探</p>
          <h1>今天解哪条线索？</h1>
        </div>
        <div class="stars" aria-label="星星数">${progress.stars} ★</div>
      </div>

      <div class="hero-scene" aria-hidden="true">
        <div class="hero-card hero-card-a">28 + 7</div>
        <div class="hero-badge">?</div>
        <div class="hero-card hero-card-b">7:30</div>
      </div>

      <div class="topic-list">
        ${topics.map((topic) => topicButton(topic)).join('')}
      </div>

      <button class="secondary wide" data-action="continue">继续学习</button>
    </section>
  `;

  app.querySelectorAll('[data-topic]').forEach((button) => {
    button.addEventListener('click', () => openTopic(button.dataset.topic));
  });
  app.querySelector('[data-action="continue"]').addEventListener('click', () => openTopic(progress.currentTopic));
}

function topicButton(topic) {
  const lessons = getLessonsByTopic(topic.id);
  const completed = lessons.filter((lesson) => progress.completedLessons.includes(lesson.id)).length;

  return `
    <button class="topic-button" style="--topic-color: ${topic.color}" data-topic="${topic.id}">
      <span>
        <strong>${topic.title}</strong>
        <small>${topic.subtitle}</small>
      </span>
      <span class="progress-pill">${completed}/${lessons.length}</span>
    </button>
  `;
}

function renderTopic() {
  const topic = topics.find((item) => item.id === screen.selectedTopicId);
  const topicLessons = getLessonsByTopic(topic.id);

  app.innerHTML = `
    <section class="topic-screen">
      <div class="screen-header">
        <button class="icon-button" data-action="home" aria-label="返回主页">‹</button>
        <div>
          <p class="eyebrow">关卡地图</p>
          <h1>${topic.title}</h1>
        </div>
        <div class="stars">${progress.stars} ★</div>
      </div>

      <div class="lesson-map">
        ${topicLessons
          .map((lesson, index) => {
            const done = progress.completedLessons.includes(lesson.id);
            return `
              <button class="lesson-card ${done ? 'done' : ''}" data-lesson="${lesson.id}">
                <span class="lesson-number">${index + 1}</span>
                <span>
                  <strong>${lesson.title}</strong>
                  <small>${done ? '已点亮' : '开始挑战'}</small>
                </span>
              </button>
            `;
          })
          .join('')}
      </div>
    </section>
  `;

  app.querySelector('[data-action="home"]').addEventListener('click', () => {
    screen.name = 'home';
    render();
  });
  app.querySelectorAll('[data-lesson]').forEach((button) => {
    button.addEventListener('click', () => openLesson(button.dataset.lesson));
  });
}

function renderLesson() {
  const lesson = getLessonById(screen.selectedLessonId);
  const completed = progress.completedLessons.includes(lesson.id);

  app.innerHTML = `
    <section class="lesson-screen">
      <div class="screen-header compact">
        <button class="icon-button" data-action="topic" aria-label="返回关卡">‹</button>
        <div>
          <p class="eyebrow">${lesson.title}</p>
          <h1>${completed ? '再讲一遍也很棒' : '找到这题的秘密'}</h1>
        </div>
      </div>

      <article class="question-panel">
        <div class="question-label">生活题</div>
        ${clockTemplate(lesson)}
        <p>${lesson.prompt}</p>
      </article>

      ${
        screen.reward
          ? rewardTemplate()
          : answerTemplate(lesson)
      }
    </section>
  `;

  app.querySelector('[data-action="topic"]').addEventListener('click', () => openTopic(lesson.topic));

  const answerForm = app.querySelector('[data-answer-form]');
  if (answerForm) {
    answerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submitAnswer(lesson, new FormData(answerForm));
    });
  }

  const nextButton = app.querySelector('[data-action="next"]');
  if (nextButton) {
    nextButton.addEventListener('click', () => openTopic(lesson.topic));
  }
}

function answerTemplate(lesson) {
  return `
    <form class="answer-panel" data-answer-form>
      <label for="answer">你的答案</label>
      ${lesson.equation ? equationInputTemplate(lesson.equation) : singleAnswerTemplate()}
    </form>

    ${
      screen.guidance
        ? `
          <section class="dialogue ${screen.guidance.kind}">
            <div class="buddy">小老师</div>
            <p>${screen.guidance.message}</p>
          </section>
        `
        : `
          <section class="dialogue">
            <div class="buddy">小老师</div>
            <p>先不用急着算完整答案，我们一起找线索。</p>
          </section>
        `
    }
  `;
}

function singleAnswerTemplate() {
  return `
    <div class="answer-row">
      <input id="answer" name="answer" inputmode="decimal" autocomplete="off" placeholder="写数字或时间" />
      <button class="primary" type="submit">提交</button>
    </div>
  `;
}

function equationInputTemplate(equation) {
  let fieldIndex = 0;
  const parts = [];

  equation.terms.forEach((term, termIndex) => {
    parts.push(...digitFields(String(term), fieldIndex));
    fieldIndex += String(term).length;

    const operator = equation.operators[termIndex];
    if (operator) {
      parts.push(operatorField(fieldIndex));
      fieldIndex += 1;
    }
  });

  parts.push('<span class="equation-symbol">=</span>');
  parts.push(...digitFields(String(equation.result), fieldIndex));

  return `
    <div class="equation-row" aria-label="填写完整算式">
      ${parts.join('')}
    </div>
    <button class="primary wide" type="submit">提交</button>
  `;
}

function digitFields(value, startIndex) {
  return value.split('').map((_, offset) => {
    const index = startIndex + offset;
    return `<input class="equation-field digit-field" name="equation-${index}" inputmode="numeric" maxlength="1" aria-label="数字第 ${index + 1} 格" />`;
  });
}

function operatorField(index) {
  return `<input class="equation-field operator-field" name="equation-${index}" maxlength="1" aria-label="运算符第 ${index + 1} 格" />`;
}

function rewardTemplate() {
  return `
    <section class="reward-panel">
      <div class="reward-star">★</div>
      <h2>${screen.reward}</h2>
      <p>答对了，星星已经收好啦。换一道题继续当小侦探。</p>
      <button class="primary wide" data-action="next">返回关卡地图</button>
    </section>
  `;
}

function clockTemplate(lesson) {
  if (!lesson.clock) {
    return '';
  }

  const clocks = lesson.clock.end ? [lesson.clock.start, lesson.clock.end] : [lesson.clock];

  return `
    <div class="clock-row">
      ${clocks.map((clock) => singleClockTemplate(clock)).join('')}
    </div>
  `;
}

function singleClockTemplate(clock) {
  const hourAngle = ((clock.hour % 12) + clock.minute / 60) * 30;
  const minuteAngle = clock.minute * 6;

  return `
    <figure class="clock-visual" aria-label="${clock.label}">
      <svg viewBox="0 0 120 120" role="img" aria-hidden="true">
        <circle class="clock-face" cx="60" cy="60" r="52"></circle>
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
          .map((number) => {
            const angle = (number * 30 - 90) * (Math.PI / 180);
            const x = 60 + Math.cos(angle) * 39;
            const y = 60 + Math.sin(angle) * 39;
            return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${number}</text>`;
          })
          .join('')}
        <line class="hour-hand" x1="60" y1="60" x2="60" y2="34" transform="rotate(${hourAngle} 60 60)"></line>
        <line class="minute-hand" x1="60" y1="60" x2="60" y2="22" transform="rotate(${minuteAngle} 60 60)"></line>
        <circle class="clock-pin" cx="60" cy="60" r="4"></circle>
      </svg>
    </figure>
  `;
}

function openTopic(topicId) {
  progress = saveProgress({ ...progress, currentTopic: topicId }, storage);
  screen = {
    ...screen,
    name: 'topic',
    selectedTopicId: topicId,
    selectedLessonId: null,
    guidance: null,
    solvedLesson: false,
    recapFeedback: null,
    reward: null,
  };
  render();
}

function openLesson(lessonId) {
  screen = {
    ...screen,
    name: 'lesson',
    selectedLessonId: lessonId,
    attemptState: createAttemptState(),
    guidance: null,
    solvedLesson: false,
    recapFeedback: null,
    reward: null,
  };
  render();
}

function submitAnswer(lesson, formData) {
  const answer = lesson.equation ? collectEquationAnswer(lesson.equation, formData) : formData.get('answer');

  if (!String(answer || '').trim()) {
    screen.guidance = {
      kind: 'hint',
      message: lesson.equation ? '先把算式里的空格填完整吧。' : '先试着写一个答案吧。',
    };
    render();
    return;
  }

  if (lesson.equation ? checkEquationAnswer(lesson.equation, answer) : checkAnswer(lesson, answer)) {
    const wasCompleted = progress.completedLessons.includes(lesson.id);
    progress = completeLesson(storage, lesson.id, lesson.topic);
    screen.reward = wasCompleted ? '答对了！' : '这关点亮了！';
    screen.guidance = null;
    screen.recapFeedback = null;
    render();
    return;
  }

  screen.attemptState = getGuidanceForAttempt(lesson, screen.attemptState);
  screen.guidance = screen.attemptState;
  render();
}

function collectEquationAnswer(equation, formData) {
  const expected = expectedEquationFields(equation);
  const values = expected.map((_, index) => String(formData.get(`equation-${index}`) || '').trim());
  return values.every(Boolean) ? values.join('') : '';
}

function checkEquationAnswer(equation, answer) {
  return normalizeEquation(answer) === expectedEquationFields(equation).join('');
}

function expectedEquationFields(equation) {
  const fields = [];
  equation.terms.forEach((term, termIndex) => {
    fields.push(...String(term).split(''));
    if (equation.operators[termIndex]) {
      fields.push(equation.operators[termIndex]);
    }
  });
  fields.push(...String(equation.result).split(''));
  return fields;
}

function normalizeEquation(value) {
  return String(value).replace(/\s+/g, '').replace(/＋/g, '+').replace(/[－−]/g, '-');
}
