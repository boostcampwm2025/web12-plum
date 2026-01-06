import iconsBreakdownRoom from '@/assets/icons/breakdown-room.svg?react';
import iconsCamDisabled from '@/assets/icons/cam-disabled.svg?react';
import iconsCam from '@/assets/icons/cam.svg?react';
import iconsChat from '@/assets/icons/chat.svg?react';
import iconsCheckBoxFilled from '@/assets/icons/check-box-filled.svg?react';
import iconsCheckBox from '@/assets/icons/check-box.svg?react';
import iconsCheck from '@/assets/icons/check.svg?react';
import iconsChevron from '@/assets/icons/chevron.svg?react';
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

import type { ComponentType, SVGProps } from 'react';

export const iconMap = {
  'breakdown-room': iconsBreakdownRoom,
  'cam-disabled': iconsCamDisabled,
  cam: iconsCam,
  chat: iconsChat,
  'check-box-filled': iconsCheckBoxFilled,
  'check-box': iconsCheckBox,
  check: iconsCheck,
  chevron: iconsChevron,
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
};

export type IconName = keyof typeof iconMap;
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
