import type { Step } from 'react-joyride';

export interface ExtendedStep extends Step {
  openPanel?: 'chat' | 'info' | 'menu';
}

// 공통 스탭
const mediaSteps: ExtendedStep[] = [
  {
    target: '[data-guide="mic"]',
    content: '마이크를 켜고 끌 수 있어요.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-guide="cam"]',
    content: '카메라를 켜고 끌 수 있어요.',
    disableBeacon: true,
    placement: 'bottom',
  },
];

const gestureStep: ExtendedStep = {
  target: '[data-guide="gesture"]',
  content: '제스처를 통해 소통할 수 있어요. 카메라로도 제스처를 인식해요.',
  disableBeacon: true,
  placement: 'bottom',
};

const chatStep: ExtendedStep = {
  target: '[data-guide="chat"]',
  content: '채팅으로 실시간 소통하세요.',
  disableBeacon: true,
  placement: 'bottom',
};

const camLayoutStep: ExtendedStep = {
  target: '[data-guide="cam-layout"]',
  content: '카메라 영역을 호버하면 버튼으로 레이아웃을 변경할 수 있어요.',
  disableBeacon: true,
  placement: 'bottom',
};

const infoPanelSteps: ExtendedStep[] = [
  {
    target: '[data-guide="info"]',
    content: '강의 정보를 확인하고 설정을 변경할 수 있어요.',
    disableBeacon: true,
    placement: 'bottom',
    openPanel: 'info',
  },
  {
    target: '[data-guide="info-join-link"]',
    content: '참여 링크를 복사해서 공유하세요.',
    disableBeacon: true,
    placement: 'left',
  },
  {
    target: '[data-guide="info-files"]',
    content: '업로드된 발표 자료를 다운로드할 수 있어요.',
    disableBeacon: true,
    placement: 'left',
  },
  {
    target: '[data-guide="info-background"]',
    content: '배경 효과를 설정해서 깔끔한 화면을 보여주세요.',
    disableBeacon: true,
    placement: 'left',
  },
];

export const presenterSteps: ExtendedStep[] = [
  camLayoutStep,
  ...mediaSteps,
  {
    target: '[data-guide="screen-share"]',
    content: '화면을 공유해서 발표 자료를 보여주세요.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-guide="ranking"]',
    content: '청중의 참여도 순위를 확인할 수 있어요.',
    disableBeacon: true,
    placement: 'bottom',
  },
  gestureStep,
  chatStep,
  ...infoPanelSteps,
  {
    target: '[data-guide="menu"]',
    content: '투표, Q&A 등 다양한 상호작용 기능을 사용할 수 있어요.',
    disableBeacon: true,
    placement: 'bottom',
    openPanel: 'menu',
  },
  {
    target: '[data-guide="menu-vote"]',
    content: '투표를 생성하고 관리하세요. 청중의 의견을 빠르게 수집할 수 있어요.',
    disableBeacon: true,
    placement: 'left',
  },
  {
    target: '[data-guide="menu-qna"]',
    content: 'Q&A 세션을 열어 청중에게 질문을 하고 답변을 받아보세요.',
    disableBeacon: true,
    placement: 'left',
  },
  {
    target: '[data-guide="menu-material"]',
    content: '발표 자료를 업로드하고 관리하세요.',
    disableBeacon: true,
    placement: 'left',
  },
];

export const audienceSteps: ExtendedStep[] = [
  camLayoutStep,
  ...mediaSteps,
  {
    target: '[data-guide="vote"]',
    content: '발표자가 시작한 투표에 참여할 수 있어요.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-guide="qna"]',
    content: 'Q&A 세션에서 질문에 답변하세요.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-guide="ranking"]',
    content: '참여도 순위와 자신의 점수를 확인하세요. 활발하게 참여하면 점수가 올라가요!',
    disableBeacon: true,
    placement: 'bottom',
  },
  gestureStep,
  chatStep,
  ...infoPanelSteps,
];
