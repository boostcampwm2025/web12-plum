import { cn } from '@/shared/lib/utils';
import { type IconName } from '@/shared/components/icon/iconMap';
import { Icon } from '@/shared/components/icon/Icon';
import Button from './Button';

interface RoomButtonProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  icon: IconName;
  isActive?: boolean;
  tooltip?: string;
}

export default function RoomButton({
  icon,
  isActive = false,
  tooltip,
  className,
  ...props
}: RoomButtonProps) {
  return (
    <div className="relative">
      <Button
        tooltip={tooltip}
        className={cn(
          'h-12 w-12 rounded-full p-3',
          isActive ? 'bg-primary' : 'bg-gray-200',
          className,
        )}
        {...props}
      >
        <Icon
          name={icon}
          size={24}
        />
      </Button>
    </div>
  );
}
