import { ParsedQuestion, QuestionType } from '@/types/quiz';

/**
 * Clean and normalize a string
 */
function clean(str: string): string {
  return str.replace(/\r\n/g, '\n').trim();
}

/**
 * Auto-generate a helpful hint if one wasn't provided in the prompt text
 */
function generateHint(answer: string): string {
  const trimmed = answer.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith('true') || lower.startsWith('false')) {
    return 'Binary choice: evaluate whether the statement is factually accurate.';
  }

  // Count words
  const words = trimmed.split(/\s+/).filter(Boolean);
  const firstLetter = trimmed.charAt(0).toUpperCase();

  if (words.length === 1) {
    return `Single word starting with "${firstLetter}" (${trimmed.length} letters)`;
  } else if (words.length <= 3) {
    return `${words.length} words, starts with "${firstLetter}"`;
  }

  return `Starts with "${firstLetter}..." (${words.length} words)`;
}

/**
 * Shuffle an array immutably
 */
function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface RawPair {
  question: string;
  answer: string;
  hint?: string;
}

/**
 * Robust text parser that extracts Q, A, H from user pasted AI responses
 */
export function parseQuizText(rawText: string): ParsedQuestion[] {
  const text = clean(rawText);
  if (!text) return [];

  const pairs: RawPair[] = [];
  const lines = text.split('\n');

  let currentQ: string | null = null;
  let currentA: string | null = null;
  let currentH: string | null = null;

  const flush = () => {
    if (currentQ && currentA) {
      pairs.push({
        question: currentQ.trim(),
        answer: currentA.trim(),
        hint: currentH ? currentH.trim() : undefined,
      });
    }
    currentQ = null;
    currentA = null;
    currentH = null;
  };

  const qRegex = /^(?:(?:\d+[\.\)]\s*)?(?:q(?:uestion)?\s*[:\-\.]|q\s+))\s*(.*)/i;
  const aRegex = /^(?:a(?:nswer)?\s*[:\-\.]|a\s+)\s*(.*)/i;
  const hRegex = /^(?:h(?:int)?\s*[:\-\.]|h\s+)\s*(.*)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const qMatch = line.match(qRegex);
    const aMatch = line.match(aRegex);
    const hMatch = line.match(hRegex);

    if (qMatch) {
      // If we already had a Q and A, flush previous pair
      if (currentQ && currentA) {
        flush();
      }
      currentQ = qMatch[1];
    } else if (aMatch) {
      currentA = aMatch[1];
    } else if (hMatch) {
      currentH = hMatch[1];
    } else {
      // Continuation line for multiline question or answer
      if (currentA !== null) {
        currentA += '\n' + line;
      } else if (currentQ !== null) {
        currentQ += ' ' + line;
      }
    }
  }

  // Flush remaining
  flush();

  // If standard regex didn't find anything, try block splitting (e.g. separated by blank lines)
  if (pairs.length === 0) {
    const blocks = text.split(/\n\s*\n/);
    for (const block of blocks) {
      const bLines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (bLines.length >= 2) {
        const qLine = bLines[0].replace(/^(\d+[\.\)]\s*|[Qq]:\s*)/, '');
        const aLine = bLines[1].replace(/^[Aa]:\s*/, '');
        const hLine = bLines[2]?.match(/^[Hh](?:int)?:\s*(.*)/)?.[1];
        if (qLine && aLine) {
          pairs.push({
            question: qLine,
            answer: aLine,
            hint: hLine,
          });
        }
      }
    }
  }

  // Pool of all distinct answers for multiple choice distractors
  const allAnswers = Array.from(new Set(pairs.map((p) => p.answer.trim())));

  // Assign appropriate question types and generate options
  return pairs.map((pair, index) => {
    const qText = pair.question;
    const aText = pair.answer;
    const hint = pair.hint || generateHint(aText);

    let type: QuestionType = 'multiple_choice';
    let options: string[] | undefined = undefined;

    const lowerAns = aText.toLowerCase();
    const isTF =
      lowerAns.startsWith('true') ||
      lowerAns.startsWith('false') ||
      lowerAns === 't' ||
      lowerAns === 'f';
    const isBlank = qText.includes('_____') || qText.includes('____');

    if (isTF) {
      type = 'true_false';
      options = ['True', 'False'];
    } else if (isBlank) {
      type = 'fill_blank';
    } else if (allAnswers.length >= 4 && aText.length < 80) {
      // Rotate types for variety: multiple choice and type-in
      if (index % 4 === 0) {
        type = 'type_answer';
      } else if (index % 4 === 3) {
        type = 'flashcard';
      } else {
        type = 'multiple_choice';
        // Pick 3 distractors
        const otherAnswers = allAnswers.filter(
          (ans) => ans.toLowerCase() !== aText.toLowerCase()
        );
        const distractors = shuffle(otherAnswers).slice(0, 3);
        options = shuffle([aText, ...distractors]);
      }
    } else {
      // For longer answers or small sets, use type_answer or flashcard
      type = aText.length > 60 ? 'flashcard' : 'type_answer';
    }

    return {
      id: `q-${index + 1}-${Date.now().toString(36)}`,
      question: qText,
      answer: aText,
      hint,
      type,
      options,
    };
  });
}

/**
 * Fuzzy check if typed user answer matches the correct answer
 */
export function isAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
  const normUser = normalizeForComparison(userAnswer);
  const normCorrect = normalizeForComparison(correctAnswer);

  if (!normUser) return false;

  // Exact match
  if (normUser === normCorrect) return true;

  // For True/False, check prefix
  if (normCorrect.startsWith('true') && (normUser === 'true' || normUser === 't')) return true;
  if (normCorrect.startsWith('false') && (normUser === 'false' || normUser === 'f')) return true;

  // If correct answer has explanation like "True - Because...", extract the first keyword
  const firstWordCorrect = normCorrect.split(/[\s\-\:\,\.]+/)[0];
  if (firstWordCorrect === 'true' && normUser === 'true') return true;
  if (firstWordCorrect === 'false' && normUser === 'false') return true;

  // Levenshtein distance tolerance for small typos on single-word answers
  if (normCorrect.length > 4 && Math.abs(normUser.length - normCorrect.length) <= 2) {
    if (levenshteinDistance(normUser, normCorrect) <= 1) {
      return true;
    }
  }

  return false;
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '')
    .replace(/\s+/g, ' ');
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
