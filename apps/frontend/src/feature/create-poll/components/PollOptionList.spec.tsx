import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { describe, it, expect } from 'vitest';
import { PollOptionList } from './PollOptionList';
import { PollFormValues } from '../schema';

const TestWrapper = ({ initialOptions }: { initialOptions: { value: string }[] }) => {
  const methods = useForm<PollFormValues>({
    defaultValues: {
      options: initialOptions,
    },
  });

  const { fields, remove } = useFieldArray({
    control: methods.control,
    name: 'options',
  });

  return (
    <FormProvider {...methods}>
      <PollOptionList
        fields={fields}
        register={methods.register}
        onDelete={remove}
      />
    </FormProvider>
  );
};

describe('PollOptionList', () => {
  const user = userEvent.setup();

  it('초기 렌더링 시 필드 배열의 개수만큼 선택지 입력창이 표시되어야 한다', () => {
    const initialOptions = [{ value: '옵션 1' }, { value: '옵션 2' }];

    render(<TestWrapper initialOptions={initialOptions} />);

    const inputs = screen.getAllByPlaceholderText(/선택지 \d/);
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('옵션 1');
    expect(inputs[1]).toHaveValue('옵션 2');
  });

  it('선택지 개수가 최소 기준(MIN_POLL_OPTIONS) 이하일 경우 삭제 버튼이 비활성화되어야 한다', () => {
    const initialOptions = [{ value: '옵션 1' }, { value: '옵션 2' }];

    render(<TestWrapper initialOptions={initialOptions} />);

    const deleteButtons = screen.getAllByRole('button', { name: /삭제/ });
    deleteButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('선택지 개수가 최소 기준보다 많을 경우 삭제 버튼이 활성화되어야 한다', () => {
    const initialOptions = [{ value: '옵션 1' }, { value: '옵션 2' }, { value: '옵션 3' }];

    render(<TestWrapper initialOptions={initialOptions} />);

    const deleteButtons = screen.getAllByRole('button', { name: /삭제/ });
    expect(deleteButtons[0]).toBeEnabled();
  });

  it('삭제 버튼을 클릭하면 해당 선택지가 목록에서 제거되어야 한다', async () => {
    const initialOptions = [
      { value: '삭제될 옵션' },
      { value: '남을 옵션 1' },
      { value: '남을 옵션 2' },
    ];
    render(<TestWrapper initialOptions={initialOptions} />);

    const deleteButtons = screen.getAllByRole('button', { name: /삭제/ });
    await user.click(deleteButtons[0]);

    const inputs = screen.getAllByPlaceholderText(/선택지 \d/);
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('남을 옵션 1');
  });

  it('사용자가 입력창에 텍스트를 입력하면 값이 업데이트되어야 한다', async () => {
    const initialOptions = [{ value: '' }, { value: '' }];
    render(<TestWrapper initialOptions={initialOptions} />);

    const firstInput = screen.getByPlaceholderText('선택지 1');
    await user.type(firstInput, '새로운 투표 후보');

    expect(firstInput).toHaveValue('새로운 투표 후보');
  });
});
