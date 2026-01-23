import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ActivityModalProvider, useActivityModalContext } from './useActivityModalContext';
import '@testing-library/jest-dom';

/**
 * 컨텍스트 상태를 확인하기 위한 테스트용 컴포넌트
 */
function TestComponent() {
  const { modalState, openCreatePollModal, openEditQnaModal, closeModal } =
    useActivityModalContext();

  return (
    <div>
      <div data-testid="modal-type">{modalState.type}</div>
      <div data-testid="modal-index">
        {modalState.type === 'edit-poll' || modalState.type === 'edit-qna'
          ? modalState.index
          : 'none'}
      </div>
      <button onClick={openCreatePollModal}>Open Create Poll</button>
      <button onClick={() => openEditQnaModal(5)}>Open Edit QnA 5</button>
      <button onClick={closeModal}>Close Modal</button>
    </div>
  );
}

describe('ActivityModalContext 테스트', () => {
  it('초기 상태는 { type: "none" } 이어야 한다.', () => {
    render(
      <ActivityModalProvider>
        <TestComponent />
      </ActivityModalProvider>,
    );

    expect(screen.getByTestId('modal-type')).toHaveTextContent('none');
  });

  it('openCreatePollModal 호출 시 상태가 create-poll로 변경되어야 한다.', () => {
    render(
      <ActivityModalProvider>
        <TestComponent />
      </ActivityModalProvider>,
    );

    fireEvent.click(screen.getByText('Open Create Poll'));
    expect(screen.getByTestId('modal-type')).toHaveTextContent('create-poll');
  });

  it('openEditQnaModal 호출 시 해당 인덱스와 함께 edit-qna 상태로 변경되어야 한다.', () => {
    render(
      <ActivityModalProvider>
        <TestComponent />
      </ActivityModalProvider>,
    );

    fireEvent.click(screen.getByText('Open Edit QnA 5'));
    expect(screen.getByTestId('modal-type')).toHaveTextContent('edit-qna');
    expect(screen.getByTestId('modal-index')).toHaveTextContent('5');
  });

  it('closeModal 호출 시 상태가 다시 none으로 돌아가야 한다.', () => {
    render(
      <ActivityModalProvider>
        <TestComponent />
      </ActivityModalProvider>,
    );

    fireEvent.click(screen.getByText('Open Create Poll'));
    fireEvent.click(screen.getByText('Close Modal'));

    expect(screen.getByTestId('modal-type')).toHaveTextContent('none');
  });

  it('Provider 없이 useActivityModal 사용 시 에러를 던져야 한다.', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      'useActivityModal은 ActivityModalProvider 내에서 사용되어야 합니다',
    );

    consoleSpy.mockRestore();
  });
});
