import { createContext, useContext, useId, ReactNode, forwardRef, ComponentProps } from 'react';
import { Input, InputProps } from './Input';
import { cn } from '../lib/utils';
import { cva, VariantProps } from 'class-variance-authority';

interface FormFieldContextValue {
  id: string;
  error?: string;
  required?: boolean;
}

/**
 * FormField 컨텍스트
 */
const FormFieldContext = createContext<FormFieldContextValue | null>(null);

/**
 * FormField 컨텍스트를 사용하는 커스텀 훅
 * @returns FormField 컨텍스트 값
 */
function useFormFieldContext() {
  const context = useContext(FormFieldContext);
  if (!context) {
    throw new Error('FormField 하위 컴포넌트는 FormField 내부에서 사용되어야 합니다');
  }
  return context;
}

interface FormFieldRootProps {
  children: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

/**
 * FormField의 Root 컴포넌트
 * @param children 하위 컴포넌트들
 * @param error 에러 메시지
 * @param required 필수 입력 여부
 * @param className 추가 클래스 이름
 * @returns FormField Root JSX 요소
 */
function FormFieldRoot({ children, error, required, className }: FormFieldRootProps) {
  const id = useId();
  const classNames = cn('flex flex-col', className);

  return (
    <FormFieldContext.Provider value={{ id, error, required }}>
      <fieldset className={classNames}>{children}</fieldset>
    </FormFieldContext.Provider>
  );
}

const legendVariants = cva('text-text mb-2 block font-bold', {
  variants: {
    size: {
      lg: 'text-xl',
      md: 'text-sm',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

interface FormFieldLegendProps
  extends Omit<ComponentProps<'legend'>, 'size'>, VariantProps<typeof legendVariants> {
  children: ReactNode;
  className?: string;
  size?: 'md' | 'lg';
}

/**
 * FormField의 Legend 컴포넌트
 * Root에서 제공하는 required 상태를 자동으로 연결
 * @param children 라벨 내용
 * @param className 추가 클래스 이름
 * @param size 라벨 크기
 * @returns FormField Legend JSX 요소
 */
function FormFieldLegend({ children, className, size, ...props }: FormFieldLegendProps) {
  const { required } = useFormFieldContext();

  return (
    <legend
      className={cn(legendVariants({ size, className }))}
      {...props}
    >
      {children}
      {required && <span className="text-primary ml-1">*</span>}
    </legend>
  );
}

type FormFieldInputProps = Omit<InputProps, 'id'>;

/**
 * FormField의 Input 컴포넌트
 * Root에서 제공하는 id와 에러 상태를 자동으로 연결
 * @param props Input 컴포넌트에 전달할 속성들
 * @returns FormField Input JSX 요소
 */
const FormFieldInput = forwardRef<HTMLInputElement, FormFieldInputProps>((props, ref) => {
  const { id, error } = useFormFieldContext();

  return (
    <Input
      {...props}
      id={id}
      ref={ref}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${id}-error` : undefined}
    />
  );
});

FormFieldInput.displayName = 'FormFieldInput';

const helpTextVariants = cva('mt-1 text-sm', {
  variants: {
    variant: {
      default: 'text-subtext-light',
      error: 'text-error',
      success: 'text-success',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface FormFieldHelpTextProps
  extends Omit<ComponentProps<'p'>, 'children'>, VariantProps<typeof helpTextVariants> {
  children: string;
  className?: string;
}

/**
 * FormField의 HelpText 컴포넌트
 * Root에서 제공하는 설명 텍스트를 표시
 * @param children 도움말 텍스트 내용
 * @param className 추가 클래스 이름
 * @param variant 도움말 텍스트 변형 스타일
 * @returns FormField HelpText JSX 요소
 */
function FormFieldHelpText({ children, className, variant, ...props }: FormFieldHelpTextProps) {
  const { id } = useFormFieldContext();

  return (
    <p
      id={`${id}-help`}
      className={cn(helpTextVariants({ variant }), className)}
      {...props}
    >
      {children}
    </p>
  );
}

interface FormFieldLabelProps {
  children: ReactNode;
  className?: string;
}

/**
 * FormField의 Label 컴포넌트
 * Root에서 제공하는 id를 자동으로 연결
 * @param children 라벨 내용
 * @param className 추가 클래스 이름
 * @returns FormField Label JSX 요소
 */

function FormFieldLabel({ children, className }: FormFieldLabelProps) {
  const { id } = useFormFieldContext();

  return (
    <label
      htmlFor={id}
      className={className}
    >
      {children}
    </label>
  );
}

interface FormFieldErrorProps {
  children?: ReactNode;
  className?: string;
}

/**
 * FormField의 Error 컴포넌트
 * Root에서 제공하는 error 메시지를 표시
 * @param children 커스텀 에러 메시지 내용
 * @param className 추가 클래스 이름
 * @returns FormField Error JSX 요소
 */
function FormFieldError({ children, className = '' }: FormFieldErrorProps) {
  const { id, error } = useFormFieldContext();

  if (!error && !children) return null;

  return (
    <p
      id={`${id}-error`}
      role="alert"
      className={`text-error text-sm ${className}`}
    >
      {children || error}
    </p>
  );
}

/**
 * 폼 필드 컴포넌트
 */
export const FormField = Object.assign(FormFieldRoot, {
  Legend: FormFieldLegend,
  Label: FormFieldLabel,
  Input: FormFieldInput,
  HelpText: FormFieldHelpText,
  Error: FormFieldError,
});
