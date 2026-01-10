import { Modal } from '@/shared/components/Modal';
import { usePollOptions } from '../hooks/usePollOptions';

import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { Icon } from '@/shared/components/icon/Icon';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Label } from '@/shared/components/Label';
import { PollOptionList } from './PollOptionList';
import { DEFAULT_TIME_LIMIT, TimeLimitDropdown } from './common';
import { logger } from '@/shared/lib/logger';
import { CreatePollFormValidator } from '../lib/formValidator';

interface FormSectionProps {
  required: boolean;
  title: string;
  children: ReactNode;
}

/**
 * 폼 섹션 컴포넌트
 * @param required 필수 입력 여부
 * @param title 섹션 제목
 */
function FormSection({ required, title, children }: FormSectionProps) {
  return (
    <section>
      <Label
        required={required}
        className="font-extrabold"
      >
        {title}
      </Label>
      {children}
    </section>
  );
}

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 투표 생성 모달 컴포넌트
 * @param isOpen 모달 열림 상태
 * @param onClose 모달 닫기 핸들러
 */
export function CreatePollModal({ isOpen, onClose }: CreatePollModalProps) {
  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME_LIMIT);
  const { options, addOption, deleteOption, updateOption, canAddMore, canDelete } =
    usePollOptions();

  // 폼 유효성 검사기 설정
  const validator = useMemo(
    () =>
      new CreatePollFormValidator()
        .withTitleRules()
        .withOptionsRules()
        .withTimeLimitRules()
        .build(),
    [],
  );

  // 폼 전체 유효성 검사 결과
  const isFormValid = useMemo(() => {
    const isValid = validator.isValid({ title, options, timeLimit });
    return isValid;
  }, [title, options, timeLimit, validator]);

  // 폼 제출 핸들러
  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();

    const validationResult = validator.validate({ title, options, timeLimit });

    if (!validationResult.isValid) {
      logger.ui.warn('폼 유효성 검사 실패', validationResult.errors);
      return;
    }

    const submitData = {
      title: title.trim(),
      options: options.map((option) => option.value.trim()),
      timeLimit,
    };

    // TODO: 투표 생성 API 호출
    logger.ui.info('투표 생성 데이터', submitData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-181.5"
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={handleFormSubmit}
      >
        <header className="flex items-center justify-between gap-2 pb-4">
          <h2 className="text-text text-base font-extrabold">새로운 투표 추가</h2>
          <Button
            variant="icon"
            aria-label="모달 닫기"
            onClick={onClose}
          >
            <Icon
              name="x"
              size={24}
              strokeWidth={2}
              decorative
              className="text-text"
            />
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-4">
            <FormSection
              required
              title="투표 제목"
            >
              <Input
                size="md"
                placeholder="무엇을 묻고 싶으신가요?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormSection>

            <FormSection
              required
              title="투표 선택지"
            >
              <div className="flex flex-col gap-3">
                <PollOptionList
                  options={options}
                  onDeleteOption={deleteOption}
                  onUpdateOption={updateOption}
                  canDelete={canDelete}
                />
                <Button
                  variant="ghost"
                  className="text-primary mx-auto flex items-center gap-2"
                  onClick={addOption}
                  disabled={!canAddMore}
                >
                  <Icon
                    name="plus"
                    size={14}
                    decorative
                  />
                  <span>선택지 추가</span>
                </Button>
              </div>
            </FormSection>

            <FormSection
              required
              title="제한 시간"
            >
              <TimeLimitDropdown
                selectedTime={timeLimit}
                onChange={setTimeLimit}
              />
            </FormSection>
          </main>

          <footer className="mt-4">
            <Button
              type="submit"
              className="mx-auto w-full max-w-38.5"
              disabled={!isFormValid}
            >
              추가하기
            </Button>
          </footer>
        </div>
      </form>
    </Modal>
  );
}
