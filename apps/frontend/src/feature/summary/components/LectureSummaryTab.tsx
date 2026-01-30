const mockLectureSummary = {
  keyTopics: [
    'React의 기본 개념과 사용법',
    '상태 관리와 컴포넌트 라이프사이클 이해',
    'React Router를 이용한 라우팅 구현',
    'Redux를 활용한 전역 상태 관리',
    'React Hooks의 활용과 커스텀 훅 만들기',
  ],
  timelines: [
    {
      startMinute: '00:00',
      endMinute: '20:00',
      title: '오리엔테이션 및 학습 환경 조성',
      items: [
        '본 강의에서 다룰 현대적인 프론트엔드 개발 생태계와 React의 역할에 대해 개괄적으로 설명하였습니다.',
        '효율적인 실습을 위해 필수 도구인 Node.js 환경과 VS Code 확장 프로그램 설치 여부를 함께 점검했습니다.',
      ],
    },
    {
      startMinute: '20:00',
      endMinute: '40:00',
      title: 'React의 탄생 배경과 철학적 이해',
      items: [
        '명령형 프로그래밍과 대비되는 선언적 프로그래밍의 특징을 파악하고 React가 이를 어떻게 구현하는지 학습했습니다.',
        'Virtual DOM이 실제 DOM 조작 성능을 어떻게 최적화하며 개발자 경험을 개선하는지 심도 있게 다루었습니다.',
      ],
    },
    {
      startMinute: '40:00',
      endMinute: '60:00',
      title: 'JSX 문법 규격과 컴포넌트 기초 설계',
      items: [
        'HTML과 유사해 보이지만 엄격한 JavaScript 확장 문법인 JSX의 작성 규칙과 Babel의 변환 과정을 확인했습니다.',
        '재사용 가능한 UI 단위를 만들기 위한 함수형 컴포넌트의 정의 방법과 Props를 통한 데이터 전달 원리를 익혔습니다.',
      ],
    },
    {
      startMinute: '60:00',
      endMinute: '80:00',
      title: '중간 휴식 및 사전 질의응답 세션',
      items: [
        '본격적인 상태 관리 학습에 앞서 수강생들이 평소 궁금해하던 프론트엔드 커리어에 대한 질의응답을 진행했습니다.',
        '실습 도중 발생한 환경 설정 오류를 개별적으로 해결하며 다음 세션을 위한 준비 시간을 가졌습니다.',
      ],
    },
    {
      startMinute: '80:00',
      endMinute: '100:00',
      title: 'useState를 활용한 동적 상태 제어',
      items: [
        'React Hooks의 핵심인 useState를 사용하여 사용자 상호작용에 따라 UI가 실시간으로 변화하는 로직을 구현했습니다.',
        '상태 업데이트 시 불변성을 유지해야 하는 이유와 객체/배열 데이터를 안전하게 수정하는 최신 문법을 적용해 보았습니다.',
      ],
    },
  ],
};

interface HighlightsSectionProps {
  topics: string[];
}

/**
 * 주요 주제 섹션 컴포넌트
 * @param topics 주요 주제 목록
 */
function HighlightsSection({ topics }: HighlightsSectionProps) {
  return (
    <section className="mt-10 flex flex-col gap-6 rounded-2xl bg-gray-600 p-6">
      <h4 className="text-text text-xl font-bold">주요 주제</h4>
      <ul className="flex flex-col gap-3">
        {topics.map((topic, index) => (
          <li
            key={index}
            className="text-subtext-light flex gap-3"
          >
            <div className="bg-subtext-light my-2.5 size-1 rounded-full" />
            <span className="break-keep">{topic}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface TimelineItemProps {
  title: string;
  items: string[];
  startMinute: string;
  endMinute: string;
}

/**
 * 단일 타임라인 아이템 컴포넌트
 * @param title 타임라인 제목
 * @param items 타임라인 항목들
 * @param startMinute 시작 시간
 * @param endMinute 종료 시간
 */
function TimelineItem({ title, items, startMinute, endMinute }: TimelineItemProps) {
  return (
    <article className="flex flex-col gap-6 rounded-2xl border border-gray-300 p-6">
      <div className="flex gap-3">
        <h5 className="text-primary grow text-xl font-bold">{title}</h5>
        <p className="text-text">
          {startMinute} ~ {endMinute}
        </p>
      </div>
      <ul className="flex list-inside list-disc flex-col gap-3">
        {items.map((item, index) => (
          <li
            key={index}
            className="text-subtext-light flex gap-3"
          >
            <div className="bg-subtext-light my-2.5 size-1 rounded-full" />
            <span className="break-keep">{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

interface TimelineProps {
  timelines: Array<{ title: string; items: string[]; startMinute: string; endMinute: string }>;
}

/**
 * 시간대별 요약 섹션 컴포넌트
 * @param timelines 시간대별 요약 데이터 배열
 */
function TimelineSection({ timelines }: TimelineProps) {
  return (
    <section className="mt-10 flex flex-col gap-6 rounded-2xl bg-gray-600 p-6">
      <h4 className="text-text text-xl font-bold">시간대별 요약</h4>
      {timelines.length > 0 ? (
        <div className="flex flex-col gap-10">
          {timelines.map((timeline, index) => (
            <TimelineItem
              key={index}
              title={timeline.title}
              items={timeline.items}
              startMinute={timeline.startMinute}
              endMinute={timeline.endMinute}
            />
          ))}
        </div>
      ) : (
        <p className="text-subtext-light py-4 text-center">강의 요약이 없습니다.</p>
      )}
    </section>
  );
}

/**
 * 강의 요약 탭 컴포넌트
 */
export function LectureSummaryTab() {
  return (
    <>
      <HighlightsSection topics={mockLectureSummary.keyTopics} />
      <TimelineSection timelines={mockLectureSummary.timelines} />
    </>
  );
}
