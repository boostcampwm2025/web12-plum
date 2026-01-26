import iconsBreakdownRoom from '@/assets/icons/breakdown-room.svg?react';
import iconsClap from '@/assets/icons/clap.svg?react';
import iconsGraph from '@/assets/icons/graph.svg?react';
import iconsQuestion from '@/assets/icons/question.svg?react';
import iconsCamDisabled from '@/assets/icons/cam-disabled.svg?react';
import iconsCam from '@/assets/icons/cam.svg?react';
import iconsChat from '@/assets/icons/chat.svg?react';
import iconsCheckBoxFilled from '@/assets/icons/check-box-filled.svg?react';
import iconsCheckBox from '@/assets/icons/check-box.svg?react';
import iconsCheck from '@/assets/icons/check.svg?react';
import iconsChevron from '@/assets/icons/chevron.svg?react';
import iconsCopy from '@/assets/icons/copy.svg?react';
import iconsDownload from '@/assets/icons/download.svg?react';
import iconsExit from '@/assets/icons/exit.svg?react';
import iconsInfo from '@/assets/icons/info.svg?react';
import iconsInteraction from '@/assets/icons/interaction.svg?react';
import iconsMaximize from '@/assets/icons/maximize.svg?react';
import iconsMegaphone from '@/assets/icons/megaphone.svg?react';
import iconsMenu from '@/assets/icons/menu.svg?react';
import iconsMic from '@/assets/icons/mic.svg?react';
import iconsMicDisabled from '@/assets/icons/mic-disabled.svg?react';
import iconsMinimize from '@/assets/icons/minimize.svg?react';
import iconsMinus from '@/assets/icons/minus.svg?react';
import iconsPencil from '@/assets/icons/pencil.svg?react';
import iconsPip from '@/assets/icons/pip.svg?react';
import iconsPlus from '@/assets/icons/plus.svg?react';
import iconsQna from '@/assets/icons/qna.svg?react';
import iconsRanking from '@/assets/icons/ranking.svg?react';
import iconsScreenShare from '@/assets/icons/screen-share.svg?react';
import iconsSend from '@/assets/icons/send.svg?react';
import iconsSideOpen from '@/assets/icons/side-open.svg?react';
import iconsSiren from '@/assets/icons/siren.svg?react';
import iconsStart from '@/assets/icons/start.svg?react';
import iconsStop from '@/assets/icons/stop.svg?react';
import iconsTimer from '@/assets/icons/timer.svg?react';
import iconsTrash from '@/assets/icons/trash.svg?react';
import iconsTrend from '@/assets/icons/trend.svg?react';
import iconsUpload from '@/assets/icons/upload.svg?react';
import iconsUsers from '@/assets/icons/users.svg?react';
import iconsVote from '@/assets/icons/vote.svg?react';
import iconsX from '@/assets/icons/x.svg?react';
import iconsGestureO from '@/assets/icons/gesture/o.svg?react';
import iconsGestureX from '@/assets/icons/gesture/x.svg?react';

import iconsThumbsDown from '@/assets/icons/gesture/thumbs-down.svg?react';
import iconsThumbsUp from '@/assets/icons/gesture/thumbs-up.svg?react';
import iconsHandRaise from '@/assets/icons/gesture/hand-raise.svg?react';
import iconsCircleCheck from '@/assets/icons/gesture/circle-check.svg?react';
import iconOne from '@/assets/icons/gesture/one.svg?react';
import iconTwo from '@/assets/icons/gesture/two.svg?react';
import iconThree from '@/assets/icons/gesture/three.svg?react';
import iconFour from '@/assets/icons/gesture/four.svg?react';
import iconsToastCheck from '@/assets/icons/gesture/toast-check.svg?react';
import iconsToastExclamation from '@/assets/icons/gesture/toast-exclamation.svg?react';
import iconsToastGesture from '@/assets/icons/gesture/toast-gesture.svg?react';
import iconsToastInfo from '@/assets/icons/gesture/toast-info.svg?react';

import type { ComponentType, SVGProps } from 'react';

export const iconMap = {
  'breakdown-room': iconsBreakdownRoom,
  clap: iconsClap,
  graph: iconsGraph,
  question: iconsQuestion,
  'cam-disabled': iconsCamDisabled,
  cam: iconsCam,
  chat: iconsChat,
  'check-box-filled': iconsCheckBoxFilled,
  'check-box': iconsCheckBox,
  check: iconsCheck,
  chevron: iconsChevron,
  copy: iconsCopy,
  download: iconsDownload,
  exit: iconsExit,
  info: iconsInfo,
  interaction: iconsInteraction,
  maximize: iconsMaximize,
  megaphone: iconsMegaphone,
  menu: iconsMenu,
  mic: iconsMic,
  'mic-disabled': iconsMicDisabled,
  minimize: iconsMinimize,
  minus: iconsMinus,
  pencil: iconsPencil,
  pip: iconsPip,
  plus: iconsPlus,
  qna: iconsQna,
  ranking: iconsRanking,
  'screen-share': iconsScreenShare,
  send: iconsSend,
  'side-open': iconsSideOpen,
  siren: iconsSiren,
  start: iconsStart,
  stop: iconsStop,
  timer: iconsTimer,
  trash: iconsTrash,
  trend: iconsTrend,
  upload: iconsUpload,
  users: iconsUsers,
  vote: iconsVote,
  x: iconsX,

  // hand gesture icons
  'thumbs-down': iconsThumbsDown,
  'thumbs-up': iconsThumbsUp,
  'hand-raise': iconsHandRaise,
  'circle-check': iconsCircleCheck,
  one: iconOne,
  two: iconTwo,
  three: iconThree,
  four: iconFour,
  'gesture-o': iconsGestureO,
  'gesture-x': iconsGestureX,
  'toast-check': iconsToastCheck,
  'toast-exclamation': iconsToastExclamation,
  'toast-gesture': iconsToastGesture,
  'toast-info': iconsToastInfo,
};

export type IconName = keyof typeof iconMap;
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
