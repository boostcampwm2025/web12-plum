import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export type ToggleSize = 'sm' | 'md';

export type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  size?: ToggleSize;
};

const sizeStyles: Record<ToggleSize, { track: string; knob: string; translate: string }> = {
  md: {
    track: 'h-9 w-16',
    knob: 'size-7',
    translate: 'translate-x-7',
  },
  sm: {
    track: 'h-7 w-12',
    knob: 'size-5',
    translate: 'translate-x-5',
  },
};

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { className, size = 'md', ...props },
  ref,
) {
  const isChecked = props.checked;
  const styles = sizeStyles[size];

  return (
    <>
      <input
        {...props}
        type="checkbox"
        className="sr-only"
        ref={ref}
      />
      <label
        htmlFor={props.id}
        role="switch"
        aria-checked={isChecked}
        aria-describedby={props['aria-describedby']}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full border-4 border-transparent transition-colors duration-200 ease-in-out',
          styles.track,
          isChecked ? 'bg-primary' : 'bg-gray-300',
          props.disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'bg-text inline-block transform rounded-full transition duration-200 ease-in-out',
            styles.knob,
            isChecked ? styles.translate : 'translate-x-0',
          )}
        />
      </label>
    </>
  );
});
