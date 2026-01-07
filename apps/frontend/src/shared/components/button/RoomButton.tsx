import { cn } from '@/shared/lib/utils';
import { type IconName } from '@/shared/components/icon/iconMap';
import { Icon } from '@/shared/components/icon/Icon';
import Button from './Button';

interface RoomButtonProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  icon: IconName;
  isActive?: boolean;
  hasAlarm?: boolean;
  tooltip?: string;
  variant?: 'default' | 'ghost';
}

export default function RoomButton({
  icon,
  isActive = false,
  hasAlarm = false,
  tooltip,
  variant = 'default',
  className,
  ...props
}: RoomButtonProps) {
  const isGhost = variant === 'ghost';

  return (
    <div className="relative inline-block">
      <Button
        tooltip={tooltip}
        className={cn(
          'rounded-full p-3',
          isGhost ? 'bg-transparent' : isActive ? 'bg-primary' : 'bg-gray-200',
          className,
        )}
        {...props}
      >
        <Icon
          name={icon}
          size={24}
          className={cn(isGhost && isActive && 'text-primary fill-primary')}
        />{' '}
      </Button>
      {hasAlarm && <span className="bg-error absolute top-0 right-0 h-3 w-3 rounded-full" />}
    </div>
  );
}
