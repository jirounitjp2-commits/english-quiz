import { celebrate, shake } from "./animation.js";
import { QUIZ_LENGTH, checkAnswer, createGrammarQuestions, createQuiz, createVocabularyQuestions } from "./quizEngine.js";
import { createReviewQuestions } from "./reviewEngine.js";
import { getLevel, getSettings, getStats, getWrongQuestions, recordAnswer, saveSettings, saveStats, saveWrongQuestions } from "./storage.js";
import { speak, unlockSpeech } from "./speech.js";

const $ = (selector) => document.querySelector(selector);
const elements = {
  tabs: [...document.querySelectorAll(".mode-tab")],
  gradeTabs: [...document.querySelectorAll(".grade-tab")],
  vocabModes: [...document.querySelectorAll(".vocab-mode")],
  startPanel: $("#start-panel"),
  questionPanel: $("#question-panel"),
  resultPanel: $("#result-panel"),
  startTitle: $("#start-title"),
  startDescription: $("#start-description"),
  startButton: $("#start-button"),
  questionCount: $("#question-count"),
  questionText: $("#question-text"),
  questionHint: $("#question-hint"),
  questionKicker: $("#question-kicker"),
  unitLabel: $("#unit-label"),
  progressLabel: $("#progress-label"),
  progressBar: $("#progress-bar"),
  progressTrack: $(".progress-track"),
  choices: $("#choices"),
  feedback: $("#answer-feedback"),
  nextButton: $("#next-button"),
  speakButton: $("#speak-button"),
  resultEmoji: $("#result-emoji"),
  resultTitle: $("#result-title"),
  resultScore: $("#result-score"),
  resultXp: $("#result-xp"),
  againButton: $("#again-button"),
  appMessage: $("#app-message"),
  soundToggle: $("#sound-toggle"),
  soundIcon: $("#sound-icon"),
  reviewCount: $("#review-count"),
  mascot: $(".mascot"),
};

const state = {
  grammar: [],
  vocabulary: [],
  allGrammar: [],
  allVocabulary: [],
  grade: 1,
  mode: "grammar",
  vocabularyMode: "meaning",
  questions: [],
  questionIndex: 0,
  correctAnswers: 0,
  sessionXp: 0,
  settings: { sound: true },
  hasAnswered: false,
};

function showMessage(message, isError = false) {
  elements.appMessage.textContent = message;
  elements.appMessage.classList.toggle("is-error", isError);
}

function updateStats() {
  const stats = getStats();
  const accuracy = stats.totalAnswered
    ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
    : null;
  $("#accuracy-value").textContent = accuracy === null ? "--%" : `${accuracy}%`;
  $("#answered-count").textContent = `${stats.totalAnswered}問チャレンジ`;
  $("#level-value").textContent = `Lv.${getLevel(stats.xp)}`;
  $("#xp-value").textContent = `${stats.xp} XP`;
  $("#streak-count").textContent = stats.streak;
  elements.reviewCount.textContent = getWrongQuestions().length;
}

function setMode(mode) {
  state.mode = mode;
  elements.tabs.forEach((tab) => {
    const selected = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  elements.startPanel.hidden = false;
  elements.questionPanel.hidden = true;
  elements.resultPanel.hidden = true;
  elements.vocabModes.forEach((button) => {
    button.closest(".vocab-modes").hidden = mode !== "vocabulary";
  });

  const descriptions = {
    grammar: ["文法クイズ", `中学${state.grade}年生の英文法にチャレンジしよう！`],
    vocabulary: ["単語クイズ", `中学${state.grade}年生の単語の意味や読み方を楽しく覚えよう！`],
    review: ["まちがい復習", "まちがえた問題にもう一度チャレンジ！"],
  };
  [elements.startTitle.textContent, elements.startDescription.textContent] = descriptions[mode];
  const reviewLength = getWrongQuestions().length;
  elements.startButton.disabled = mode === "review" && reviewLength === 0;
  elements.startButton.replaceChildren();
  elements.startButton.append(document.createTextNode(
    mode === "review" && reviewLength === 0 ? "復習する問題はありません ✓" : "クイズをはじめる ",
  ));
  if (mode !== "review" || reviewLength > 0) {
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    elements.startButton.append(arrow);
  }
  elements.questionCount.textContent = mode === "review"
    ? `${reviewLength}問`
    : `全${QUIZ_LENGTH}問`;
  showMessage("");
}

function setGrade(grade) {
  state.grade = grade;
  state.grammar = state.gradeData[grade].grammar;
  state.vocabulary = state.gradeData[grade].vocabulary;
  document.body.dataset.grade = String(grade);
  elements.mascot.textContent = { 1: "🦊", 2: "🐰", 3: "🦄" }[grade];
  elements.gradeTabs.forEach((tab) => {
    const selected = Number(tab.dataset.grade) === grade;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-pressed", String(selected));
  });
  setMode(state.mode);
}

function buildQuestionSet() {
  if (state.mode === "grammar") {
    return createQuiz(createGrammarQuestions(state.grammar));
  }
  if (state.mode === "vocabulary") {
    return createQuiz(createVocabularyQuestions(state.vocabulary, state.vocabularyMode));
  }
  return createReviewQuestions(state.allGrammar, state.allVocabulary, getWrongQuestions());
}

function startQuiz() {
  state.questions = buildQuestionSet();
  if (state.questions.length === 0) {
    showMessage("出題できる問題がありません。データを確認してください。", true);
    return;
  }
  state.questionIndex = 0;
  state.correctAnswers = 0;
  state.sessionXp = 0;
  elements.startPanel.hidden = true;
  elements.resultPanel.hidden = true;
  elements.questionPanel.hidden = false;
  renderQuestion();
}

function renderQuestion() {
  const question = state.questions[state.questionIndex];
  state.hasAnswered = false;
  elements.progressLabel.textContent = `${state.questionIndex + 1} / ${state.questions.length}`;
  elements.questionKicker.textContent = `QUESTION ${String(state.questionIndex + 1).padStart(2, "0")}`;
  elements.unitLabel.textContent = question.kind === "grammar"
    ? question.unit
    : ({ meaning: "意味", reading: "読み方", spelling: "つづり", listening: "リスニング" }[question.unit] || "復習");
  elements.questionText.textContent = question.prompt;
  elements.questionHint.textContent = question.hint;
  elements.progressBar.style.width = `${(state.questionIndex / state.questions.length) * 100}%`;
  elements.progressTrack.setAttribute("aria-valuemax", String(state.questions.length));
  elements.progressTrack.setAttribute("aria-valuenow", String(state.questionIndex));
  elements.choices.replaceChildren();
  elements.feedback.hidden = true;
  elements.nextButton.hidden = true;
  elements.speakButton.hidden = !question.speechText;

  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.dataset.answer = choice;
    const letter = document.createElement("span");
    letter.className = "choice-letter";
    letter.textContent = String.fromCharCode(65 + index);
    const text = document.createElement("span");
    text.className = "choice-text";
    text.textContent = choice;
    button.append(letter, text);
    button.addEventListener("click", () => submitAnswer(choice, button));
    elements.choices.append(button);
  });

  if (question.unit === "listening" && state.settings.sound) playQuestionAudio();
}

function playQuestionAudio() {
  const question = state.questions[state.questionIndex];
  if (!question?.speechText) return;
  try {
    speak(question.speechText, {
      onError: () => showMessage("音声を再生できませんでした。端末の音量・マナーモード・英語の音声データを確認してね。", true),
    });
    showMessage("");
  } catch (error) {
    showMessage(error.message, true);
  }
}

function submitAnswer(answer, selectedButton) {
  if (state.hasAnswered) return;
  state.hasAnswered = true;
  const question = state.questions[state.questionIndex];
  const correct = checkAnswer(question, answer);
  const isReview = state.mode === "review";

  try {
    const result = recordAnswer(correct, isReview);
    state.sessionXp += correct ? (isReview ? 15 : 10) : 0;
    const wrongIds = getWrongQuestions();
    saveWrongQuestions(correct
      ? wrongIds.filter((id) => id !== question.id)
      : [...wrongIds, question.id]);
    if (correct) state.correctAnswers += 1;
    updateStats();
    selectedButton.classList.add(correct ? "is-correct" : "is-wrong");
    if (correct) celebrate(selectedButton);
    else shake(selectedButton);

    [...elements.choices.children].forEach((button) => {
      button.disabled = true;
      if (button.dataset.answer === question.answer) button.classList.add("show-correct");
    });

    elements.feedback.hidden = false;
    elements.feedback.className = `answer-feedback ${correct ? "is-correct" : "is-wrong"}`;
    const feedbackTitle = document.createElement("strong");
    feedbackTitle.textContent = correct ? "🎉 正解！すばらしい！" : "😢 おしい！もう一度おぼえよう";
    elements.feedback.replaceChildren(feedbackTitle);
    if (!correct) {
      const answerLine = document.createElement("span");
      answerLine.className = "feedback-answer";
      answerLine.textContent = `あなたの答え：${answer}　→　正解：${question.answer}`;
      elements.feedback.append(answerLine);
    }
    if (question.explanation) {
      const explanation = document.createElement("span");
      explanation.className = "feedback-explanation";
      explanation.textContent = `💡 ${question.explanation}`;
      elements.feedback.append(explanation);
    }
    if (question.example) {
      const example = document.createElement("span");
      example.className = "feedback-example";
      example.textContent = `📝 例文：${question.example}`;
      elements.feedback.append(example);
    }
    if (correct && result.leveledUp) {
      const levelUp = document.createElement("span");
      levelUp.className = "level-up";
      levelUp.textContent = "⭐ レベルアップ！";
      elements.feedback.append(levelUp);
    }
    elements.nextButton.hidden = false;
    elements.nextButton.textContent = state.questionIndex + 1 === state.questions.length
      ? "結果を見る →"
      : "次の問題へ →";
    showMessage("");
  } catch (error) {
    [...elements.choices.children].forEach((button) => { button.disabled = true; });
    showMessage(`学習データを保存できませんでした: ${error.message}`, true);
  }
}

function showResults() {
  const perfect = state.correctAnswers === state.questions.length;
  let bonus = 0;
  if (perfect && state.questions.length > 0) {
    try {
      const stats = getStats();
      stats.xp += 50;
      saveStats(stats);
      bonus = 50;
      updateStats();
    } catch (error) {
      showMessage(`ボーナスXPを保存できませんでした: ${error.message}`, true);
    }
  }
  elements.questionPanel.hidden = true;
  elements.resultPanel.hidden = false;
  elements.resultEmoji.textContent = perfect ? "🏆" : state.correctAnswers >= state.questions.length / 2 ? "🎉" : "🌱";
  elements.resultTitle.textContent = perfect ? "全問正解！すごいね！" : "よくがんばったね！";
  elements.resultScore.textContent = `${state.questions.length}問中 ${state.correctAnswers}問正解`;
  elements.resultXp.textContent = `今回の獲得 XP：${state.sessionXp + bonus} XP`;
  elements.progressBar.style.width = "100%";
  elements.progressTrack.setAttribute("aria-valuenow", String(state.questions.length));
}

function nextQuestion() {
  if (!state.hasAnswered) return;
  if (state.questionIndex + 1 >= state.questions.length) {
    showResults();
    return;
  }
  state.questionIndex += 1;
  renderQuestion();
}

async function initialize() {
  try {
    const grades = [1, 2, 3];
    const suffix = (grade) => (grade === 1 ? "" : String(grade));
    const responses = await Promise.all(grades.flatMap((grade) => [
      fetch(`./data/grammar${suffix(grade)}.json`),
      fetch(`./data/vocabulary${suffix(grade)}.json`),
    ]));
    if (responses.some((response) => !response.ok)) {
      throw new Error("問題データを読み込めませんでした。");
    }
    const loaded = await Promise.all(responses.map((response) => response.json()));
    state.gradeData = {};
    grades.forEach((grade, index) => {
      state.gradeData[grade] = { grammar: loaded[index * 2], vocabulary: loaded[index * 2 + 1] };
    });
    state.allGrammar = grades.flatMap((grade) => state.gradeData[grade].grammar);
    state.allVocabulary = grades.flatMap((grade) => state.gradeData[grade].vocabulary);
    state.settings = getSettings();
    elements.soundIcon.textContent = state.settings.sound ? "🔊" : "🔈";
    elements.soundToggle.setAttribute("aria-label", state.settings.sound ? "音声をオフにする" : "音声をオンにする");
    updateStats();
    setGrade(1);
    elements.gradeTabs.forEach((tab) => tab.addEventListener("click", () => setGrade(Number(tab.dataset.grade))));
    elements.startButton.addEventListener("click", startQuiz);
    elements.nextButton.addEventListener("click", nextQuestion);
    elements.againButton.addEventListener("click", () => {
      elements.resultPanel.hidden = true;
      elements.startPanel.hidden = false;
      startQuiz();
    });
    elements.tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
    elements.vocabModes.forEach((button) => {
      button.addEventListener("click", () => {
        state.vocabularyMode = button.dataset.vocabMode;
        elements.vocabModes.forEach((modeButton) => {
          const active = modeButton === button;
          modeButton.classList.toggle("is-active", active);
          modeButton.setAttribute("aria-pressed", String(active));
        });
      });
    });
    document.addEventListener("pointerdown", unlockSpeech, { once: true });
    elements.speakButton.addEventListener("click", playQuestionAudio);
    elements.soundToggle.addEventListener("click", () => {
      try {
        state.settings.sound = !state.settings.sound;
        saveSettings(state.settings);
        elements.soundIcon.textContent = state.settings.sound ? "🔊" : "🔈";
        elements.soundToggle.setAttribute("aria-label", state.settings.sound ? "音声をオフにする" : "音声をオンにする");
        showMessage(state.settings.sound ? "音声をオンにしました。" : "音声をオフにしました。");
      } catch (error) {
        showMessage(`設定を保存できませんでした: ${error.message}`, true);
      }
    });
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        showMessage(`オフライン機能を有効にできませんでした: ${error.message}`, true);
      });
    }
  } catch (error) {
    showMessage(`アプリを起動できませんでした: ${error.message}`, true);
    elements.startButton.disabled = true;
  }
}

initialize();