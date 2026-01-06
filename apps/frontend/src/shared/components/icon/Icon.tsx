import { SVGProps } from 'react';
import { IconComponent, iconMap, IconName } from '@/shared/components/icon/iconMap';

/**
 * 기본 아이콘 크기 (24px)
 */
const DEFAULT_ICON_SIZE = 24;

type IconProps = {
  name: IconName;
  size?: number | string;
  className?: string;
  label?: string;
  decorative?: boolean;
} & SVGProps<SVGSVGElement>;

/**
 * 아이콘 컴포넌트
 * @param name 아이콘 이름
 * @param size 아이콘 크기 (width, height 동일하게 적용, 기본값: 24)
 * @param width 아이콘 너비
 * @param height 아이콘 높이
 * @param className 추가 클래스 이름
 * @param label 접근성 레이블
 * @param decorative 장식용 아이콘 여부 (기본값: false)
 * @returns 아이콘 SVG 컴포넌트
 */
export const Icon = ({
  name,
  size,
  width,
  height,
  className,
  label,
  decorative = false,
  ...props
}: IconProps) => {
  const SvgIcon: IconComponent | undefined = iconMap[name];

  if (!SvgIcon) {
    if (import.meta.env.DEV) console.warn(`Icon "${name}"을 찾을 수 없습니다.`);
    return null;
  }

  const finalWidth = size || width || DEFAULT_ICON_SIZE;
  const finalHeight = size || height || DEFAULT_ICON_SIZE;

  // 접근성 속성
  const accessibilityProps = decorative
    ? { 'aria-hidden': true, role: 'presentation' }
    : { 'aria-label': label || name, role: 'img' };

  return (
    <SvgIcon
      width={finalWidth}
      height={finalHeight}
      className={className}
      {...accessibilityProps}
      {...props}
    />
  );
};
