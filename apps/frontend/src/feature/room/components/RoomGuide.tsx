import { useState, useEffect, useMemo, useCallback } from 'react';
import Joyride, { ACTIONS, CallBackProps, EVENTS, STATUS } from 'react-joyride';
import { useRoomStore } from '../stores/useRoomStore';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { audienceSteps, presenterSteps, type ExtendedStep } from './RoomGuide.steps.ts';

const GUIDE_STORAGE_KEY = 'plum-room-guide-completed';

export function RoomGuide() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const myRole = useRoomStore((state) => state.myInfo?.role);
  const activeSidePanel = useRoomUIStore((state) => state.activeSidePanel);
  const setActiveSidePanel = useRoomUIStore((state) => state.setActiveSidePanel);

  const steps = useMemo(() => (myRole === 'presenter' ? presenterSteps : audienceSteps), [myRole]);

  const locale = useMemo(
    () => ({
      back: '이전',
      close: '닫기',
      last: '완료',
      nextLabelWithProgress: `다음 ({step}/{steps})`,
      skip: '건너뛰기',
    }),
    [],
  );

  const styles = useMemo(
    () => ({
      options: {
        primaryColor: '#7b4cfe',
        backgroundColor: '#26263a',
        textColor: '#f8f6ff',
        arrowColor: '#26263a',
        zIndex: 10000,
      },
      tooltip: {
        borderRadius: 12,
        padding: 16,
      },
      tooltipContent: {
        padding: '8px 12px',
      },
      buttonNext: {
        fontSize: '14px',
        backgroundColor: '#7b4cfe',
        borderRadius: 8,
        padding: '8px 16px',
      },
      buttonBack: {
        fontSize: '14px',
        color: '#f8f6ff',
        marginRight: 8,
      },
      buttonSkip: {
        color: '#9191a1',
      },
    }),
    [],
  );

  const floaterProps = useMemo(
    () => ({
      disableAnimation: true,
      hideArrow: false,
    }),
    [],
  );

  useEffect(() => {
    if (!myRole) return;

    const completed = localStorage.getItem(GUIDE_STORAGE_KEY);
    if (completed) {
      const parsed = JSON.parse(completed) as Record<string, boolean>;
      if (parsed[myRole]) return;
    }

    let rafId = 0;
    let cancelled = false;
    const waitForFirstTarget = () => {
      if (cancelled) return;
      const first = steps[0];
      const ready =
        !first || typeof first.target !== 'string' || document.querySelector(first.target);
      if (ready) {
        setStepIndex(0);
        setRun(true);
        return;
      }
      rafId = requestAnimationFrame(waitForFirstTarget);
    };
    waitForFirstTarget();
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [myRole, steps]);

  const markCompleted = useCallback(() => {
    if (!myRole) return;
    const existing = localStorage.getItem(GUIDE_STORAGE_KEY);
    const parsed = existing ? (JSON.parse(existing) as Record<string, boolean>) : {};
    parsed[myRole] = true;
    localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(parsed));
  }, [myRole]);

  const finishGuide = useCallback(() => {
    markCompleted();
    setRun(false);
    setStepIndex(0);
    // 열려있는 사이드 패널 닫기
    if (activeSidePanel) {
      setActiveSidePanel(activeSidePanel);
    }
  }, [markCompleted, activeSidePanel, setActiveSidePanel]);

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, type, index } = data;

      // 완료 또는 건너뛰기
      const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
      if (finishedStatuses.includes(status)) {
        finishGuide();
        return;
      }

      // 스텝 이동 처리
      if (type === EVENTS.STEP_AFTER && typeof index === 'number') {
        let nextIndex = index;
        if (action === ACTIONS.NEXT) {
          nextIndex = index + 1;
        } else if (action === ACTIONS.PREV) {
          nextIndex = Math.max(0, index - 1);
        }

        const findNextExistingStep = (start: number, dir: 1 | -1) => {
          let i = start;
          while (i >= 0 && i < steps.length) {
            const target = steps[i]?.target;
            const exists =
              typeof target !== 'string' ? true : document.querySelector(target) !== null;
            if (exists) return i;
            i += dir;
          }
          return -1;
        };

        if (action === ACTIONS.NEXT) {
          const resolved = findNextExistingStep(nextIndex, 1);
          if (resolved === -1) {
            finishGuide();
            return;
          }
          nextIndex = resolved;
        } else if (action === ACTIONS.PREV) {
          const resolved = findNextExistingStep(nextIndex, -1);
          nextIndex = Math.max(0, resolved);
        }

        const nextStep = steps[nextIndex] as ExtendedStep | undefined;
        if (nextStep?.openPanel) {
          // 패널을 열고 잠시 후 스텝 이동
          setActiveSidePanel(nextStep.openPanel);
          setTimeout(() => setStepIndex(nextIndex), 300);
        } else {
          setStepIndex(nextIndex);
        }
      }
    },
    [steps, finishGuide, setActiveSidePanel],
  );

  if (!myRole) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      hideCloseButton
      showSkipButton
      showProgress
      disableScrolling
      disableScrollParentFix
      spotlightPadding={4}
      callback={handleCallback}
      floaterProps={floaterProps}
      locale={locale}
      styles={styles}
    />
  );
}
