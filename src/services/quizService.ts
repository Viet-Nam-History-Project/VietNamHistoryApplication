/**
 * Service Quiz
 * Firestore: games/quiz-lich-su-viet-nam/quizzes/{slug}
 */

import { collection, query, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { QuizItem } from '@/models/QuizzItem';
import { GameQuestion } from '@/models/GameQuestion';
import { cachedLoad, getStaticJson } from '@/services/contentCache';

const QUIZ_DOC = 'quiz-lich-su-viet-nam';

/** Lấy tất cả quiz */
export const getQuizzes = async (): Promise<QuizItem[]> => {
  try {
    return cachedLoad('quizzes', async () => {
      const staticData = await getStaticJson<QuizItem[]>('games/quizzes.json');
      if (staticData?.length) return staticData;
      const q = query(collection(db, 'games', QUIZ_DOC, 'quizzes'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...d.data(), id: d.id } as QuizItem));
    }, { ttlMs: 6 * 60 * 60 * 1000 });
  } catch (e) {
    console.error('❌ Lỗi getQuizzes:', e);
    throw e;
  }
};

/** Lấy quiz theo ID */
export const getQuizById = async (id: string): Promise<QuizItem | null> => {
  try {
    const quizzes = await getQuizzes();
    const cached = quizzes.find((quiz) => quiz.id === id);
    if (cached) return cached;
    const snap = await getDoc(doc(db, 'games', QUIZ_DOC, 'quizzes', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as QuizItem;
  } catch (e) {
    console.error('❌ Lỗi getQuizById:', e);
    throw e;
  }
};

/**
 * Lấy danh sách câu hỏi của một quiz, sắp xếp theo orderQuestion.
 * Firestore: games/quiz-lich-su-viet-nam/quizzes/{quizId}/questions
 */
export const getQuestionsByQuiz = async (
  quizId: string,
): Promise<GameQuestion[]> => {
  try {
    return cachedLoad(`quiz-questions:${quizId}`, async () => {
      const staticData = await getStaticJson<GameQuestion[]>(`games/quizzes/${quizId}/questions.json`);
      if (staticData?.length) return staticData;
      const q = query(collection(db, 'games', QUIZ_DOC, 'quizzes', quizId, 'questions'), orderBy('orderQuestion'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return { id: d.id, question: String(data.question ?? ''), options: Array.isArray(data.options) ? data.options as string[] : [], correctAnswer: Number(data.correctAnswer ?? -1), orderQuestion: Number(data.orderQuestion ?? 0), explanation: data.explanation ? String(data.explanation) : undefined } as GameQuestion;
      });
    }, { ttlMs: 6 * 60 * 60 * 1000 });
  } catch (e) {
    console.error('❌ Lỗi getQuestionsByQuiz:', e);
    throw e;
  }
};
