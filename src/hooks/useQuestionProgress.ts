import { useState, useEffect, useRef } from 'react';
import { QuestionData } from '../types';
import { INITIAL_QUESTION } from '../data/fallbackQuestion';
import { fetchWordPressPost, parseWordPressPost } from '../utils/wordpressParser';

const STORAGE_KEY = 'yesmatematica_active_question_v2';

function sanitizeQuestionData(q: QuestionData): QuestionData {
  if (!q) return q;

  let verifiedLetter = q.correctLetter;

  // Cross-check steps if any resolution step has an explicit answer
  if (q.steps && q.steps.length > 0) {
    for (const step of q.steps) {
      const isRes =
        step.type === 'resolution' ||
        step.title?.toLowerCase().includes('resposta') ||
        step.title?.toLowerCase().includes('conclusão');
      if (isRes && step.htmlContent) {
        const m = step.htmlContent.match(/(?:alternativa|letra)\s*[:\-–]?\s*(?:<[^>]*>)?\s*([A-Ea-e])\b/i);
        if (m && ['A', 'B', 'C', 'D', 'E'].includes(m[1].toUpperCase())) {
          verifiedLetter = m[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
          break;
        }
      }
    }
  }

  q.correctLetter = verifiedLetter;

  if (q.alternatives && q.alternatives.length > 0) {
    q.alternatives.forEach((alt) => {
      alt.isCorrect = alt.letter === verifiedLetter;
      alt.explanation = alt.isCorrect
        ? `Correto! A resposta é a alternativa ${alt.letter}.`
        : `Alternativa incorreta.`;
    });
  }

  return q;
}

export function useQuestionProgress() {
  const [question, setQuestion] = useState<QuestionData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure cached object is valid and has required structure
        if (parsed && parsed.id && Array.isArray(parsed.alternatives) && parsed.alternatives.length > 0) {
          const sanitized = sanitizeQuestionData(parsed);
          if (sanitized.correctLetter !== parsed.correctLetter) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
            } catch (_) {}
          }
          return sanitized;
        }
      }
    } catch (e) {
      console.warn('Could not load saved question from localStorage', e);
    }
    return INITIAL_QUESTION;
  });

  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [unlockedStepIds, setUnlockedStepIds] = useState<Set<string>>(() => {
    const firstStep = question?.steps?.[0];
    return firstStep ? new Set([firstStep.id]) : new Set();
  });
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [adminOpen, setAdminOpen] = useState<boolean>(false);

  const hintsRef = useRef<HTMLDivElement>(null);

  // Sync tab title
  useEffect(() => {
    if (question?.title) {
      document.title = `${question.title} • Yes Matemática`;
    }
  }, [question]);

  // Support loading dynamic question from URL param ?url= or ?link=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUrl = params.get('url') || params.get('link');
    if (targetUrl) {
      fetchWordPressPost(targetUrl)
        .then((post) => {
          const parsed = parseWordPressPost(post);
          handleReset(parsed);
        })
        .catch((err) => {
          console.error('Failed to load question from URL param', err);
        });
    }
  }, []);

  const handleReset = (targetQuestion?: QuestionData) => {
    setSelectedLetter(null);
    const q = targetQuestion || question;
    const firstStep = q?.steps?.[0];
    setUnlockedStepIds(firstStep ? new Set([firstStep.id]) : new Set());
  };

  const handleUnlockStep = (stepId: string) => {
    setUnlockedStepIds((prev) => {
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
  };

  const handleUnlockNext = () => {
    const steps = question.steps || [];
    const nextLocked = steps.find((s) => !unlockedStepIds.has(s.id));
    if (nextLocked) {
      handleUnlockStep(nextLocked.id);
    }
  };

  const handleUnlockAll = () => {
    const steps = question.steps || [];
    setUnlockedStepIds(new Set(steps.map((s) => s.id)));
  };

  const handleCollapseAll = () => {
    setUnlockedStepIds(new Set());
  };

  const handleScrollToHints = () => {
    const steps = question.steps || [];
    if (unlockedStepIds.size === 0 && steps.length > 0) {
      handleUnlockStep(steps[0].id);
    }
    setTimeout(() => {
      hintsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleQuestionLoaded = (newQuestion: QuestionData) => {
    setQuestion(newQuestion);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newQuestion));
    } catch (e) {
      console.warn('Could not persist question to local storage', e);
    }
    handleReset(newQuestion);
  };

  const toggleFontSize = () => {
    setFontSize((prev) => (prev === 'normal' ? 'large' : 'normal'));
  };

  return {
    question,
    selectedLetter,
    setSelectedLetter,
    unlockedStepIds,
    fontSize,
    toggleFontSize,
    adminOpen,
    setAdminOpen,
    hintsRef,
    handleReset,
    handleUnlockStep,
    handleUnlockNext,
    handleUnlockAll,
    handleCollapseAll,
    handleScrollToHints,
    handleQuestionLoaded
  };
}
