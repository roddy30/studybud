import { QuestionType, ParsedQuestion } from '@/types/quiz';

export interface SRCard {
  questionText: string;
  correctAnswer: string;
  hint: string;
  type: QuestionType;
  options?: string[];
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewedAt: string;
}

const SR_STORAGE_KEY = 'sr_cards_v1';

export function getSRCards(): SRCard[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(SR_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load SR cards', e);
    return [];
  }
}

export function saveSRCards(cards: SRCard[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SR_STORAGE_KEY, JSON.stringify(cards));
  } catch (e) {
    console.error('Failed to save SR cards', e);
  }
}

export function addOrUpdateCard(
  questionText: string,
  correctAnswer: string,
  hint: string,
  type: QuestionType,
  options: string[] | undefined,
  wasCorrect: boolean
): void {
  const cards = getSRCards();
  const existingIndex = cards.findIndex(c => c.questionText === questionText);
  
  let card: SRCard;
  
  if (existingIndex >= 0) {
    card = cards[existingIndex];
    if (wasCorrect) {
      card.repetitions += 1;
      if (card.repetitions === 1) {
        card.interval = 1;
      } else if (card.repetitions === 2) {
        card.interval = 6;
      } else {
        card.interval = Math.round(card.interval * card.easeFactor);
      }
      // SM-2: EF = EF + 0.1 for correct
      card.easeFactor = card.easeFactor + 0.1;
    } else {
      card.repetitions = 0;
      card.interval = 1;
      card.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
    }
  } else {
    // New card
    card = {
      questionText,
      correctAnswer,
      hint,
      type,
      options,
      easeFactor: 2.5,
      interval: wasCorrect ? 1 : 1,
      repetitions: wasCorrect ? 1 : 0,
      nextReviewDate: '',
      lastReviewedAt: ''
    };
    cards.push(card);
  }

  const now = new Date();
  card.lastReviewedAt = now.toISOString();
  
  const next = new Date(now);
  next.setDate(next.getDate() + card.interval);
  next.setHours(0, 0, 0, 0); // Start of day for next review
  card.nextReviewDate = next.toISOString();

  if (existingIndex >= 0) {
    cards[existingIndex] = card;
  }

  saveSRCards(cards);
}

export function getDueCards(): SRCard[] {
  const cards = getSRCards();
  const now = new Date();
  now.setHours(23, 59, 59, 999); // End of today
  const nowStr = now.toISOString();
  
  return cards.filter(card => {
    if (!card.nextReviewDate) return true;
    return card.nextReviewDate <= nowStr;
  });
}

export function getDueCount(): number {
  return getDueCards().length;
}

export function convertSRCardToQuestion(card: SRCard): ParsedQuestion {
  return {
    id: `sr_${Math.random().toString(36).substr(2, 9)}`,
    question: card.questionText,
    answer: card.correctAnswer,
    hint: card.hint,
    type: card.type,
    options: card.options
  };
}
