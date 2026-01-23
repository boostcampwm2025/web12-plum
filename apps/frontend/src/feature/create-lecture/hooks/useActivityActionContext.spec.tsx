import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FormProvider, useForm } from 'react-hook-form';
import { ActivityProvider, useActivityActionContext } from './useActivityActionContext';
import { CreateRoomRequest } from '@plum/shared-interfaces';
import '@testing-library/jest-dom';

/**
 * 테스트용 UI 컴포넌트
 */
function TestComponent() {
  const { polls, qnas, actions } = useActivityActionContext();

  return (
    <div>
      <div data-testid="poll-count">{polls.length}</div>
      <div data-testid="qna-count">{qnas.length}</div>
      {polls.length > 0 && <div data-testid="first-poll-title">{polls[0].title}</div>}

      <button onClick={() => actions.addPoll({ title: 'New Poll', options: [], timeLimit: 60 })}>
        Add Poll
      </button>
      <button
        onClick={() => actions.editPoll(0, { title: 'Updated Poll', options: [], timeLimit: 60 })}
      >
        Edit Poll
      </button>
      <button onClick={() => actions.deletePoll(0)}>Delete Poll</button>
    </div>
  );
}

/**
 * 폼 환경을 제공하는 Wrapper
 */
function FormWrapper({ children }: { children: React.ReactNode }) {
  const methods = useForm<CreateRoomRequest>({
    defaultValues: {
      polls: [],
      qnas: [],
    },
  });
  return (
    <FormProvider {...methods}>
      <ActivityProvider>{children}</ActivityProvider>
    </FormProvider>
  );
}

describe('ActivityContext 테스트', () => {
  it('초기 활동 목록은 비어 있어야 한다.', () => {
    render(
      <FormWrapper>
        <TestComponent />
      </FormWrapper>,
    );

    expect(screen.getByTestId('poll-count')).toHaveTextContent('0');
    expect(screen.getByTestId('qna-count')).toHaveTextContent('0');
  });

  it('addPoll 호출 시 polls 목록에 아이템이 추가되어야 한다.', () => {
    render(
      <FormWrapper>
        <TestComponent />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByText('Add Poll'));

    expect(screen.getByTestId('poll-count')).toHaveTextContent('1');
    expect(screen.getByTestId('first-poll-title')).toHaveTextContent('New Poll');
  });

  it('editPoll 호출 시 특정 인덱스의 아이템이 수정되어야 한다.', () => {
    render(
      <FormWrapper>
        <TestComponent />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByText('Add Poll'));
    fireEvent.click(screen.getByText('Edit Poll'));

    expect(screen.getByTestId('first-poll-title')).toHaveTextContent('Updated Poll');
    expect(screen.getByTestId('poll-count')).toHaveTextContent('1');
  });

  it('deletePoll 호출 시 특정 인덱스의 아이템이 제거되어야 한다.', () => {
    render(
      <FormWrapper>
        <TestComponent />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByText('Add Poll'));
    expect(screen.getByTestId('poll-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByText('Delete Poll'));
    expect(screen.getByTestId('poll-count')).toHaveTextContent('0');
  });

  it('Provider 없이 사용 시 에러를 던져야 한다.', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      'useActivity는 ActivityProvider 내에서 사용되어야 합니다',
    );

    consoleSpy.mockRestore();
  });
});
