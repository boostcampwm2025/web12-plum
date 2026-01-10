import { createContext, useContext, useId, ReactNode } from 'react';
import { Label } from './Label';
import { Input, InputProps } from './Input';
import { HelpText } from './HelpText';
import { cn } from '../lib/utils';

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
      <section className={classNames}>{children}</section>
    </FormFieldContext.Provider>
  );
}

interface FormFieldLabelProps {
  children: ReactNode;
  className?: string;
  size?: 'md' | 'lg';
}

/**
 * FormField의 Label 컴포넌트
 * Root에서 제공하는 id와 required 상태를 자동으로 연결
 * @param children 라벨 내용
 * @param className 추가 클래스 이름
 * @param size 라벨 크기
 * @returns FormField Label JSX 요소
 */
function FormFieldLabel({ children, className, size }: FormFieldLabelProps) {
  const { id, required } = useFormFieldContext();

  return (
    <Label
      htmlFor={id}
      required={required}
      size={size}
      className={className}
    >
      {children}
    </Label>
  );
}

type FormFieldInputProps = Omit<InputProps, 'id'>;

/**
 * FormField의 Input 컴포넌트
 * Root에서 제공하는 id와 에러 상태를 자동으로 연결
 * @param props Input 컴포넌트에 전달할 속성들
 * @returns FormField Input JSX 요소
 */
function FormFieldInput(props: FormFieldInputProps) {
  const { id, error } = useFormFieldContext();

  return (
    <Input
      {...props}
      id={id}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${id}-error` : undefined}
    />
  );
}

interface FormFieldHelpTextProps {
  children: string;
  className?: string;
}

/**
 * FormField의 HelpText 컴포넌트
 * Root에서 제공하는 설명 텍스트를 표시
 * @param children 도움말 텍스트 내용
 * @param className 추가 클래스 이름
 * @returns FormField HelpText JSX 요소
 */
function FormFieldHelpText({ children, className }: FormFieldHelpTextProps) {
  const { id } = useFormFieldContext();

  return (
    <HelpText
      id={`${id}-help`}
      className={className}
    >
      {children}
    </HelpText>
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
  Label: FormFieldLabel,
  Input: FormFieldInput,
  HelpText: FormFieldHelpText,
  Error: FormFieldError,
});
