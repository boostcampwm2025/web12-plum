import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FormField } from './FormField';

describe('FormField', () => {
  describe('기본 렌더링', () => {
    it('Label과 Input이 함께 렌더링된다', () => {
      render(
        <FormField>
          <FormField.Label>이메일</FormField.Label>
          <FormField.Input placeholder="email@example.com" />
        </FormField>,
      );

      expect(screen.getByText('이메일')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument();
    });

    it('Label과 Input이 id로 자동 연결된다', () => {
      render(
        <FormField>
          <FormField.Label>닉네임</FormField.Label>
          <FormField.Input />
        </FormField>,
      );

      const label = screen.getByText('닉네임');
      const input = screen.getByRole('textbox');
      const labelFor = label.getAttribute('for');
      const inputId = input.getAttribute('id');

      expect(labelFor).toBeTruthy();
      expect(inputId).toBeTruthy();
      expect(labelFor).toBe(inputId);
    });

    it('Root 없이 하위 컴포넌트를 사용하면 에러가 발생한다', () => {
      expect(() => {
        render(<FormField.Label>라벨</FormField.Label>);
      }).toThrow('FormField 하위 컴포넌트는 FormField 내부에서 사용되어야 합니다');
    });
  });

  describe('required 속성', () => {
    it('required가 true일 때 Label에 별표가 표시된다', () => {
      render(
        <FormField required>
          <FormField.Label>필수 항목</FormField.Label>
          <FormField.Input />
        </FormField>,
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('required가 false일 때 Label에 별표가 표시되지 않는다', () => {
      render(
        <FormField>
          <FormField.Label>선택 항목</FormField.Label>
          <FormField.Input />
        </FormField>,
      );

      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('error 처리', () => {
    it('error prop이 있을 때 에러 메시지가 표시된다', () => {
      render(
        <FormField error="이메일 형식이 올바르지 않습니다">
          <FormField.Label>이메일</FormField.Label>
          <FormField.Input />
          <FormField.Error />
        </FormField>,
      );

      expect(screen.getByText('이메일 형식이 올바르지 않습니다')).toBeInTheDocument();
    });

    it('error가 없을 때 Error 컴포넌트는 렌더링되지 않는다', () => {
      render(
        <FormField>
          <FormField.Label>입력</FormField.Label>
          <FormField.Input />
          <FormField.Error />
        </FormField>,
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('Error 컴포넌트에 children을 전달하면 우선적으로 표시된다', () => {
      render(
        <FormField error="기본 에러">
          <FormField.Label>입력</FormField.Label>
          <FormField.Input />
          <FormField.Error>커스텀 에러 메시지</FormField.Error>
        </FormField>,
      );

      expect(screen.getByText('커스텀 에러 메시지')).toBeInTheDocument();
      expect(screen.queryByText('기본 에러')).not.toBeInTheDocument();
    });
  });

  describe('HelpText', () => {
    it('HelpText가 렌더링된다', () => {
      render(
        <FormField>
          <FormField.Label>비밀번호</FormField.Label>
          <FormField.Input type="password" />
          <FormField.HelpText>8자 이상 입력해주세요</FormField.HelpText>
        </FormField>,
      );

      expect(screen.getByText('8자 이상 입력해주세요')).toBeInTheDocument();
    });

    it('HelpText에 고유 id가 설정된다', () => {
      render(
        <FormField>
          <FormField.Label>입력</FormField.Label>
          <FormField.Input />
          <FormField.HelpText>도움말</FormField.HelpText>
        </FormField>,
      );

      const helpText = screen.getByText('도움말');
      const helpTextId = helpText.getAttribute('id');

      expect(helpTextId).toMatch(/-help$/);
    });
  });

  describe('Input 상호작용', () => {
    it('Input에 텍스트를 입력할 수 있다', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <FormField>
          <FormField.Label>이름</FormField.Label>
          <FormField.Input onChange={handleChange} />
        </FormField>,
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '홍길동');

      expect(handleChange).toHaveBeenCalled();
    });

    it('Input의 모든 props가 정상적으로 전달된다', () => {
      render(
        <FormField>
          <FormField.Label>검색</FormField.Label>
          <FormField.Input
            placeholder="검색어 입력"
            type="search"
            size="lg"
          />
        </FormField>,
      );

      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('placeholder', '검색어 입력');
      expect(input).toHaveAttribute('type', 'search');
    });
  });

  describe('복잡한 사용 사례', () => {
    it('모든 요소가 함께 렌더링된다', () => {
      render(
        <FormField
          required
          error="필수 항목입니다"
        >
          <FormField.Label>이메일</FormField.Label>
          <FormField.Input
            type="email"
            placeholder="email@example.com"
          />
          <FormField.HelpText>회사 이메일을 입력해주세요</FormField.HelpText>
          <FormField.Error />
        </FormField>,
      );

      expect(screen.getByText('이메일')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument();
      expect(screen.getByText('회사 이메일을 입력해주세요')).toBeInTheDocument();
      expect(screen.getByText('필수 항목입니다')).toBeInTheDocument();
    });
  });
});
