import iconsCheckBoxFilled from '@/assets/icons/check-box-filled.svg?react';
import iconsCheckBox from '@/assets/icons/check-box.svg?react';
import iconsChevronRight from '@/assets/icons/chevron-right.svg?react';
import iconsClose from '@/assets/icons/close.svg?react';
import iconsDownload from '@/assets/icons/download.svg?react';
import iconsHand from '@/assets/icons/hand.svg?react';
import iconsMaximizing from '@/assets/icons/maximizing.svg?react';
import iconsMedal from '@/assets/icons/medal.svg?react';
import iconsMinus from '@/assets/icons/minus.svg?react';
import iconsPlus from '@/assets/icons/plus.svg?react';
import iconsTrash from '@/assets/icons/trash.svg?react';
import iconsUpload from '@/assets/icons/upload.svg?react';
import iconsVideoOff from '@/assets/icons/video-off.svg?react';
import iconsWarning from '@/assets/icons/warning.svg?react';

import type { ComponentType, SVGProps } from 'react';

export const iconMap = {
  'check-box-filled': iconsCheckBoxFilled,
  'check-box': iconsCheckBox,
  'chevron-right': iconsChevronRight,
  close: iconsClose,
  download: iconsDownload,
  hand: iconsHand,
  maximizing: iconsMaximizing,
  medal: iconsMedal,
  minus: iconsMinus,
  plus: iconsPlus,
  trash: iconsTrash,
  upload: iconsUpload,
  'video-off': iconsVideoOff,
  warning: iconsWarning,
};

export type IconName = keyof typeof iconMap;
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
