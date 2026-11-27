export const QUIZ_LENGTH = 5;

export function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createVocabularyQuestions(words, mode) {
  const definitions = {
    meaning: { prompt: (word) => word.word, answer: (word) => word.meaning, hint: "この英単語の意味は？" },
    reading: { prompt: (word) => word.word, answer: (word) => word.reading, hint: "この英単語の読み方は？" },
    spelling: { prompt: (word) => word.meaning, answer: (word) => word.word, hint: "英語でどう書くかな？" },
    listening: { prompt: (word) => word.word, answer: (word) => word.word, hint: "聞こえた単語を選んでね" },
  };
  const definition = definitions[mode];
  if (!definition) throw new Error(`Unknown vocabulary mode: ${mode}`);

  return words.map((word) => {
    const correct = definition.answer(word);
    const distractors = shuffle(words.filter((candidate) => candidate.id !== word.id))
      .map(definition.answer)
      .filter((answer, index, answers) => answer !== correct && answers.indexOf(answer) === index)
      .slice(0, 3);
    return {
      id: `vocabulary:${mode}:${word.id}`,
      kind: "vocabulary",
      unit: mode,
      prompt: definition.prompt(word),
      hint: definition.hint,
      answer: correct,
      choices: shuffle([correct, ...distractors]),
      speechText: word.word,
      explanation: `${word.word}（${word.reading}）は「${word.meaning}」という意味です。`,
      example: word.example,
    };
  });
}

export function createGrammarQuestions(questions) {
  return questions.map((question) => ({
    id: `grammar:${question.id}`,
    kind: "grammar",
    unit: question.unit,
    prompt: question.question,
    hint: "正しい答えを選んでね",
    answer: question.choices[question.answer],
    choices: question.choices,
    explanation: question.explanation,
    example: question.example,
  }));
}

export function createQuiz(questions, limit = QUIZ_LENGTH) {
  return shuffle(questions).slice(0, limit);
}

export function checkAnswer(question, answer) {
  return question.answer === answer;
}
