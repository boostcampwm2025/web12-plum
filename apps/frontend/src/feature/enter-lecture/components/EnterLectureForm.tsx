import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  enterLectureDefaultValues,
  enterLectureFormSchema,
  EnterLectureFormValues,
} from '../schema';
import { LectureNameSection } from './LectureNameSection';
import { NicknameSection } from './NicknameSection';
import { AgreementSection } from './AgreementSection';
import { DeviceCheckSection } from './DeviceCheckSection';
import { SubmitButton } from './SubmitButton';

interface EnterLectureFormProps {
  lectureName: string;
}

/**
 * 강의실 입장 폼 컴포넌트
 *
 * FormProvider로 하위 컴포넌트에 폼 컨텍스트를 제공하고,
 * 각 섹션 컴포넌트를 합성하는 레이아웃 역할
 */
export function EnterLectureForm({ lectureName }: EnterLectureFormProps) {
  const formMethods = useForm<EnterLectureFormValues>({
    resolver: zodResolver(enterLectureFormSchema),
    defaultValues: { ...enterLectureDefaultValues, name: lectureName },
    mode: 'onChange',
  });

  return (
    <FormProvider {...formMethods}>
      <form className="mt-10 flex flex-col gap-8 rounded-2xl bg-gray-600 p-6">
        <LectureNameSection />
        <NicknameSection />
        <AgreementSection />
        <DeviceCheckSection />
        <SubmitButton />
      </form>
    </FormProvider>
  );
}
