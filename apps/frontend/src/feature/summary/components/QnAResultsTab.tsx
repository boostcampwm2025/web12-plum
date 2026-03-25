import { useState } from 'react';
import type { Answer } from '@plum/shared-interfaces';

import { Icon } from '@/shared/components/icon/Icon';
import { cn } from '@/shared/lib/utils';

import { useSummaryStore } from '../stores/useSummaryStore';

interface QnaAnswerItemProps {
  name: string;
  answer: Answer;
}

/**
 * 단일 qna 답변 항목 컴포넌트
 * @param name 참여자 이름
 * @param answer 답변 데이터
 */
function QnaAnswerItem({ name, answer }: QnaAnswerItemProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3">
        <p className="text-primary w-full max-w-30 shrink-0 font-bold wrap-break-word">{name}</p>
        <p className="text-subtext-light grow font-bold">{answer.text}</p>
      </div>
    </div>
  );
}

interface QnaAnswerListProps {
  isOpen: boolean;
  answers: Answer[];
}

/**
 * QnA 답변 리스트 컴포넌트
 * @param isOpen 열림 상태
 * @param answers 답변 데이터 배열
 */
function QnaAnswerList({ isOpen, answers }: QnaAnswerListProps) {
  if (!isOpen) return null;

  return (
    <div className="flex flex-col gap-6 p-6">
      {answers.length > 0 ? (
        answers.map((answer) => (
          <QnaAnswerItem
            key={answer.participantId}
            name={answer.participantName}
            answer={answer}
          />
        ))
      ) : (
        <p className="text-subtext-light py-4 text-center">등록된 답변이 없습니다.</p>
      )}
    </div>
  );
}

interface QnaResultCardProps {
  title: string;
  answers: Answer[];
}

/**
 * 단일 qna 결과를 보여주는 카드 컴포넌트
 * @param title qna 제목
 * @param answers 답변 데이터 배열
 */
function QnaAccordionCard({ title, answers }: QnaResultCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const totalAnswers = answers.length;

  return (
    <article className="flex flex-col rounded-2xl bg-gray-600">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-3 p-6"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <h4 className="text-text grow text-left text-xl font-bold">{title}</h4>
        <span className="text-subtext-light shrink-0">{totalAnswers}명 참여</span>
        <Icon
          name="chevron"
          size={24}
          className={cn(`text-subtext-light transition-transform`, isOpen ? 'rotate-180' : '')}
        />
      </button>
      <QnaAnswerList
        isOpen={isOpen}
        answers={answers}
      />
    </article>
  );
}

/**
 * QnA 결과 탭 컴포넌트
 */
export function QnAResultsTab() {
  const qnas = useSummaryStore((state) => state.summaryData?.qnas ?? []);

  if (qnas.length === 0) {
    return (
      <section className="mt-10 flex flex-col gap-4 rounded-2xl bg-gray-600 p-6">
        <p className="text-subtext-light py-4 text-center">등록된 QnA가 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="mt-10 flex flex-col gap-4">
      {qnas.map((qna) => (
        <QnaAccordionCard
          key={qna.id}
          title={qna.title}
          answers={qna.answers}
        />
      ))}
    </section>
  );
}
