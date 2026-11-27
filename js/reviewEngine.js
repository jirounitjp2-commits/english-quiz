import { createGrammarQuestions, createVocabularyQuestions, shuffle } from "./quizEngine.js";

export function createReviewQuestions(grammar, vocabulary, wrongIds) {
  const allQuestions = [
    ...createGrammarQuestions(grammar),
    ...["meaning", "reading", "spelling", "listening"].flatMap((mode) =>
      createVocabularyQuestions(vocabulary, mode),
    ),
  ];
  const wrongSet = new Set(wrongIds);
  return shuffle(allQuestions.filter((question) => wrongSet.has(question.id)));
}
