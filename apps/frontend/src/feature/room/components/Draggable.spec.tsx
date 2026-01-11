import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Draggable } from './Draggable';

describe('Draggable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('children이 렌더링된다', () => {
    render(
      <Draggable>
        <div>드래그 가능한 컨텐츠</div>
      </Draggable>,
    );

    expect(screen.getByText('드래그 가능한 컨텐츠')).toBeInTheDocument();
  });

  it('기본 스타일 클래스가 적용된다', () => {
    const { container } = render(
      <Draggable>
        <div>컨텐츠</div>
      </Draggable>,
    );

    const draggableElement = container.firstChild as HTMLElement;
    expect(draggableElement).toHaveClass('absolute', 'right-4', 'bottom-4', 'cursor-move');
  });

  it('커스텀 className이 병합된다', () => {
    const { container } = render(
      <Draggable className="custom-class">
        <div>컨텐츠</div>
      </Draggable>,
    );

    const draggableElement = container.firstChild as HTMLElement;
    expect(draggableElement).toHaveClass('absolute', 'custom-class');
  });

  it('마우스 다운 이벤트 핸들러가 등록된다', () => {
    const { container } = render(
      <Draggable>
        <div>컨텐츠</div>
      </Draggable>,
    );

    const draggableElement = container.firstChild as HTMLElement;
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

    fireEvent.mouseDown(draggableElement, {
      clientX: 100,
      clientY: 100,
    });

    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

    addEventListenerSpy.mockRestore();
  });

  it('버튼 요소 클릭 시 드래그가 시작되지 않는다', () => {
    render(
      <Draggable>
        <button>버튼</button>
      </Draggable>,
    );

    const button = screen.getByRole('button');
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

    fireEvent.mouseDown(button, {
      clientX: 100,
      clientY: 100,
    });

    expect(addEventListenerSpy).not.toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
  });

  it('마우스 업 시 이벤트 리스너가 제거된다', () => {
    const { container } = render(
      <Draggable>
        <div>컨텐츠</div>
      </Draggable>,
    );

    const draggableElement = container.firstChild as HTMLElement;
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    fireEvent.mouseDown(draggableElement, {
      clientX: 100,
      clientY: 100,
    });

    fireEvent.mouseUp(document);

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it('드래그 중 요소의 위치가 변경된다', () => {
    const { container } = render(
      <div style={{ width: '800px', height: '600px', position: 'relative' }}>
        <Draggable>
          <div>컨텐츠</div>
        </Draggable>
      </div>,
    );

    const draggableElement = container.querySelector('.absolute') as HTMLElement;

    fireEvent.mouseDown(draggableElement, {
      clientX: 100,
      clientY: 100,
    });

    fireEvent.mouseMove(document, {
      clientX: 150,
      clientY: 150,
    });

    vi.runAllTimers();

    expect(draggableElement.style.left).toBeDefined();
    expect(draggableElement.style.top).toBeDefined();
  });

  it('마우스 업 시 스냅 애니메이션이 적용된다', () => {
    const { container } = render(
      <div style={{ width: '800px', height: '600px', position: 'relative' }}>
        <Draggable>
          <div>컨텐츠</div>
        </Draggable>
      </div>,
    );

    const draggableElement = container.querySelector('.absolute') as HTMLElement;

    fireEvent.mouseDown(draggableElement, {
      clientX: 100,
      clientY: 100,
    });

    fireEvent.mouseMove(document, {
      clientX: 150,
      clientY: 150,
    });

    fireEvent.mouseUp(document);

    expect(draggableElement.style.transition).toContain('300ms');
  });
});
