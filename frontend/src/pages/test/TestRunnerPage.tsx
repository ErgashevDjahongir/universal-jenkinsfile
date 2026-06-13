import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { isAxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flag, LogOut, RotateCcw, Send, X } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { Button, Modal, Spinner } from '@/components/ui';
import { uz } from '@/i18n/uz';
import { cn } from '@/lib/cn';
import {
  finishSession,
  getExamineeSession,
  recordTabSwitch,
  submitAnswer,
  type AnswerPayload,
  type ExamineeSession,
  type SessionResult,
} from '@/api/sessions';
import { answerFromStored, isAnswered } from './answer';
import { useCountdown } from './hooks/useCountdown';
import { useTabGuard } from './hooks/useTabGuard';
import { QuestionNav } from './components/QuestionNav';
import { QuestionView } from './components/QuestionView';
import { TestIntro } from './components/TestIntro';
import { TestResult } from './components/TestResult';

type Phase = 'loading' | 'error' | 'intro' | 'active' | 'result';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const startedKey = (id: string) => `etest.test.started.${id}`;

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function TestRunnerPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState<string>(uz.test.loadError);
  const [session, setSession] = useState<ExamineeSession | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);

  const [answers, setAnswers] = useState<Record<string, AnswerPayload>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const [tabCount, setTabCount] = useState(0);
  const [tabWarning, setTabWarning] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const finishingRef = useRef(false);

  // ---- yuklash / tiklash ----
  useEffect(() => {
    let active = true;
    setPhase('loading');
    (async () => {
      try {
        const s = await getExamineeSession(sessionId);
        if (!active) return;
        setSession(s);
        setTabCount(s.tabSwitches);
        const init: Record<string, AnswerPayload> = {};
        s.questions.forEach((q) => {
          init[q.sessionQuestionId] = answerFromStored(q);
        });
        setAnswers(init);

        if (s.status !== 'in_progress') {
          const r = await finishSession(sessionId);
          if (!active) return;
          setResult(r);
          setPhase('result');
          localStorage.removeItem(startedKey(sessionId));
          return;
        }
        // Faol sessiya: ilgari boshlangan bo'lsa to'g'ridan-to'g'ri testga.
        setPhase(localStorage.getItem(startedKey(sessionId)) ? 'active' : 'intro');
      } catch (err) {
        if (!active) return;
        setErrorMsg(
          isAxiosError(err) && err.response?.status === 403 ? uz.test.notOwner : uz.test.loadError,
        );
        setPhase('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  // Unmount'da kutilayotgan saqlash taymerlarini tozalaymiz.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  // ---- yakunlash (natijaga o'tish) ----
  const goToResult = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    Object.values(timersRef.current).forEach(clearTimeout);
    try {
      const r = await finishSession(sessionId);
      setResult(r);
      localStorage.removeItem(startedKey(sessionId));
      setPhase('result');
    } catch {
      // Tarmoq xatosi: natija ekraniga o'tamiz, lekin qayta urinish imkonini qoldiramiz
      // (started bayrog'ini saqlab qolamiz — refresh'da ham tiklanadi).
      finishingRef.current = false;
      setPhase('result');
    }
  }, [sessionId]);

  // ---- avtosave ----
  const saveAnswer = useCallback(
    async (sqId: string, payload: AnswerPayload) => {
      setSaveState('saving');
      try {
        await submitAnswer(sessionId, sqId, payload);
        setSaveState('saved');
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 400) {
          // Muddat o'tgan yoki sessiya faol emas — yakunlaymiz.
          await goToResult();
          return;
        }
        setSaveState('error');
      }
    },
    [sessionId, goToResult],
  );

  const changeAnswer = useCallback(
    (sqId: string, payload: AnswerPayload) => {
      setAnswers((prev) => ({ ...prev, [sqId]: payload }));
      if (timersRef.current[sqId]) clearTimeout(timersRef.current[sqId]);
      timersRef.current[sqId] = setTimeout(() => void saveAnswer(sqId, payload), 500);
    },
    [saveAnswer],
  );

  // ---- halollik nazorati ----
  useTabGuard(phase === 'active', async () => {
    try {
      const res = await recordTabSwitch(sessionId);
      setTabCount(res.tabSwitches);
      setTabWarning(true);
      if (res.terminated) {
        await goToResult();
      }
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 400) {
        await goToResult();
      }
    }
  });

  function handleStart(): void {
    localStorage.setItem(startedKey(sessionId), '1');
    setPhase('active');
  }

  async function handleConfirmFinish(): Promise<void> {
    setFinishing(true);
    await goToResult();
    setFinishing(false);
    setShowFinish(false);
  }

  function toggleFlag(sqId: string): void {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(sqId)) next.delete(sqId);
      else next.add(sqId);
      return next;
    });
  }

  async function handleExit(): Promise<void> {
    await logout();
    navigate('/start', { replace: true });
  }

  // ---- render ----
  if (phase === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="text-sm text-red-600">{errorMsg}</p>
        <Button
          variant="secondary"
          size="icon"
          className="mt-4"
          title={uz.test.exit}
          aria-label={uz.test.exit}
          onClick={() => navigate('/start')}
        >
          <LogOut size={16} />
        </Button>
      </div>
    );
  }

  if (phase === 'result') {
    if (result) {
      return <TestResult result={result} onExit={handleExit} />;
    }
    // Natija olinmadi (tarmoq xatosi) — qayta urinish yoki chiqish.
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <p className="text-sm text-red-600">{uz.test.resultError}</p>
        <div className="flex justify-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            title={uz.common.retry}
            aria-label={uz.common.retry}
            onClick={() => void goToResult()}
          >
            <RotateCcw size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={uz.test.exit}
            aria-label={uz.test.exit}
            onClick={handleExit}
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'intro' && session) {
    return <TestIntro session={session} onStart={handleStart} />;
  }

  if (phase === 'active' && session) {
    return (
      <ActiveTest
        session={session}
        answers={answers}
        flagged={flagged}
        currentIndex={currentIndex}
        saveState={saveState}
        tabCount={tabCount}
        tabWarning={tabWarning}
        onDismissWarning={() => setTabWarning(false)}
        onSelect={setCurrentIndex}
        onChangeAnswer={changeAnswer}
        onToggleFlag={toggleFlag}
        onExpire={goToResult}
        onFinish={() => setShowFinish(true)}
        finishModal={
          <Modal
            open={showFinish}
            onClose={() => !finishing && setShowFinish(false)}
            title={uz.test.finishConfirmTitle}
            footer={
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  title={uz.common.cancel}
                  aria-label={uz.common.cancel}
                  disabled={finishing}
                  onClick={() => setShowFinish(false)}
                >
                  <X size={16} />
                </Button>
                <Button
                  variant="primary"
                  size="icon"
                  title={uz.test.finish}
                  aria-label={uz.test.finish}
                  loading={finishing}
                  onClick={handleConfirmFinish}
                >
                  <Send size={16} />
                </Button>
              </>
            }
          >
            <p className="text-sm text-gray-700">{uz.test.finishConfirmText}</p>
            <UnansweredNote session={session} answers={answers} />
          </Modal>
        }
      />
    );
  }

  return null;
}

function UnansweredNote({
  session,
  answers,
}: {
  session: ExamineeSession;
  answers: Record<string, AnswerPayload>;
}) {
  const count = session.questions.filter(
    (q) => !isAnswered(q, answers[q.sessionQuestionId]),
  ).length;
  if (count === 0) return null;
  return (
    <p className="mt-2 text-sm text-yellow-700">
      {uz.test.finishConfirmUnanswered.replace('{count}', String(count))}
    </p>
  );
}

interface ActiveTestProps {
  session: ExamineeSession;
  answers: Record<string, AnswerPayload>;
  flagged: Set<string>;
  currentIndex: number;
  saveState: SaveState;
  tabCount: number;
  tabWarning: boolean;
  onDismissWarning: () => void;
  onSelect: (index: number) => void;
  onChangeAnswer: (sqId: string, payload: AnswerPayload) => void;
  onToggleFlag: (sqId: string) => void;
  onExpire: () => void;
  onFinish: () => void;
  finishModal: ReactNode;
}

function ActiveTest({
  session,
  answers,
  flagged,
  currentIndex,
  saveState,
  tabCount,
  tabWarning,
  onDismissWarning,
  onSelect,
  onChangeAnswer,
  onToggleFlag,
  onExpire,
  onFinish,
  finishModal,
}: ActiveTestProps) {
  const seconds = useCountdown(session.deadlineAt, session.serverNow, onExpire);
  const questions = session.questions;
  const q = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const canPrev = session.navigation === 'free' && currentIndex > 0;
  const isFlagged = flagged.has(q.sessionQuestionId);
  const lowTime = seconds <= 60;

  function block(e: SyntheticEvent): void {
    e.preventDefault();
  }

  return (
    <div className="select-none space-y-4" onCopy={block} onCut={block} onContextMenu={block}>
      {/* Taymer va saqlash holati */}
      <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-gray-200 bg-gray-50/95 px-6 py-3 backdrop-blur">
        <div>
          <p className="text-xs text-gray-500">{uz.test.remainingTime}</p>
          <p
            className={cn(
              'font-mono text-xl font-semibold tabular-nums',
              lowTime ? 'text-red-600' : 'text-gray-900',
            )}
          >
            {formatClock(seconds)}
          </p>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      {tabWarning && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3">
          <div className="text-sm text-yellow-800">
            <p className="font-medium">{uz.test.tabWarningTitle}</p>
            <p>
              {uz.test.tabWarning
                .replace('{count}', String(tabCount))
                .replace('{max}', String(session.maxTabSwitches))}
            </p>
            {tabCount >= session.maxTabSwitches && (
              <p className="mt-0.5 font-medium">{uz.test.tabWarningLast}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onDismissWarning}
            title={uz.common.close}
            aria-label={uz.common.close}
            className="shrink-0 text-yellow-700 hover:text-yellow-900"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Savollar paneli */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <QuestionNav
          questions={questions}
          answers={answers}
          flagged={flagged}
          currentIndex={currentIndex}
          navigation={session.navigation}
          onSelect={onSelect}
        />
      </div>

      {/* Joriy savol */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <QuestionView
          question={q}
          index={currentIndex}
          total={questions.length}
          value={answers[q.sessionQuestionId] ?? {}}
          onChange={(payload) => onChangeAnswer(q.sessionQuestionId, payload)}
        />
      </div>

      {/* Navigatsiya tugmalari */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="icon"
          title={uz.test.previous}
          aria-label={uz.test.previous}
          disabled={!canPrev}
          onClick={() => onSelect(currentIndex - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          variant={isFlagged ? 'primary' : 'ghost'}
          size="icon"
          title={isFlagged ? uz.test.unflag : uz.test.flag}
          aria-label={isFlagged ? uz.test.unflag : uz.test.flag}
          onClick={() => onToggleFlag(q.sessionQuestionId)}
        >
          <Flag size={16} />
        </Button>
        {isLast ? (
          <Button
            variant="primary"
            size="icon"
            title={uz.test.finish}
            aria-label={uz.test.finish}
            onClick={onFinish}
          >
            <Send size={16} />
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="icon"
            title={uz.test.next}
            aria-label={uz.test.next}
            onClick={() => onSelect(currentIndex + 1)}
          >
            <ChevronRight size={16} />
          </Button>
        )}
      </div>

      {/* Oxirgi bo'lmasa ham yakunlash imkoni */}
      {!isLast && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            title={uz.test.finish}
            aria-label={uz.test.finish}
            onClick={onFinish}
          >
            <Send size={16} />
          </Button>
        </div>
      )}

      {finishModal}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  const map: Record<Exclude<SaveState, 'idle'>, { text: string; cls: string }> = {
    saving: { text: uz.test.saving, cls: 'text-gray-500' },
    saved: { text: uz.test.saved, cls: 'text-green-600' },
    error: { text: uz.test.saveError, cls: 'text-red-600' },
  };
  const { text, cls } = map[state];
  return <span className={cn('text-xs', cls)}>{text}</span>;
}
