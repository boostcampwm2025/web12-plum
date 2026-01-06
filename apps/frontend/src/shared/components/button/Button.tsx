import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { iconMap, type IconName } from '@/shared/components/icon/iconMap';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconName;
  children?: ReactNode;
}

export default function Button({ icon, children, className, ...props }: ButtonProps) {
  const Icon = icon ? iconMap[icon] : null;

  return (
    <button
      className={cn('flex items-center justify-center gap-2 rounded-lg font-medium', className)}
      {...props}
    >
      {Icon && <Icon className="h-5 w-5" />}
      {children && <span>{children}</span>}
    </button>
  );
}
