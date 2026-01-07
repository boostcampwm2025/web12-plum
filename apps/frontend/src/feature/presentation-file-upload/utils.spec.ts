import { describe, it, expect } from 'vitest';
import { validateFileForUpload } from './utils';
import { FILE_MAX_SIZE_BYTES } from './constants';

describe('validateFileForUpload', () => {
  describe('유효한 파일 형식', () => {
    it('PDF 파일은 에러를 반환하지 않는다', () => {
      const file = new File(['content'], 'presentation.pdf', {
        type: 'application/pdf',
      });

      const result = validateFileForUpload(file);

      expect(result).toBeNull();
    });

    it('PPT 파일은 에러를 반환하지 않는다', () => {
      const file = new File(['content'], 'presentation.ppt', {
        type: 'application/vnd.ms-powerpoint',
      });

      const result = validateFileForUpload(file);

      expect(result).toBeNull();
    });

    it('PPTX 파일은 에러를 반환하지 않는다', () => {
      const file = new File(['content'], 'presentation.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });

      const result = validateFileForUpload(file);

      expect(result).toBeNull();
    });
  });

  describe('유효하지 않은 파일 형식', () => {
    it('TXT 파일은 에러 메시지를 반환한다', () => {
      const file = new File(['content'], 'document.txt', {
        type: 'text/plain',
      });

      const result = validateFileForUpload(file);

      expect(result).toBe(
        '허용되지 않는 파일 형식입니다. .pdf, .ppt, .pptx 파일만 업로드 가능합니다.',
      );
    });

    it('DOCX 파일은 에러 메시지를 반환한다', () => {
      const file = new File(['content'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const result = validateFileForUpload(file);

      expect(result).toBe(
        '허용되지 않는 파일 형식입니다. .pdf, .ppt, .pptx 파일만 업로드 가능합니다.',
      );
    });

    it('이미지 파일은 에러 메시지를 반환한다', () => {
      const file = new File(['content'], 'image.png', {
        type: 'image/png',
      });

      const result = validateFileForUpload(file);

      expect(result).toBe(
        '허용되지 않는 파일 형식입니다. .pdf, .ppt, .pptx 파일만 업로드 가능합니다.',
      );
    });

    it('빈 MIME 타입은 에러 메시지를 반환한다', () => {
      const file = new File(['content'], 'unknown', {
        type: '',
      });

      const result = validateFileForUpload(file);

      expect(result).toBe(
        '허용되지 않는 파일 형식입니다. .pdf, .ppt, .pptx 파일만 업로드 가능합니다.',
      );
    });
  });

  describe('파일 크기 검증', () => {
    it('최대 크기 이하의 파일은 에러를 반환하지 않는다', () => {
      const file = new File(['a'.repeat(FILE_MAX_SIZE_BYTES - 1)], 'presentation.pdf', {
        type: 'application/pdf',
      });

      const result = validateFileForUpload(file);

      expect(result).toBeNull();
    });

    it('최대 크기와 같은 파일은 에러를 반환하지 않는다', () => {
      const file = new File(['a'.repeat(FILE_MAX_SIZE_BYTES)], 'presentation.pdf', {
        type: 'application/pdf',
      });

      const result = validateFileForUpload(file);

      expect(result).toBeNull();
    });

    it('최대 크기를 초과하는 파일은 에러 메시지를 반환한다', () => {
      const file = new File(['a'.repeat(FILE_MAX_SIZE_BYTES + 1)], 'presentation.pdf', {
        type: 'application/pdf',
      });

      const result = validateFileForUpload(file);

      expect(result).toBe('파일 크기가 너무 큽니다. 최대 50MB까지 업로드 가능합니다.');
    });

    it('0바이트 파일은 에러를 반환하지 않는다', () => {
      const file = new File([], 'empty.pdf', {
        type: 'application/pdf',
      });

      const result = validateFileForUpload(file);

      expect(result).toBeNull();
    });
  });

  describe('복합 검증', () => {
    it('유효하지 않은 형식이면서 크기가 큰 파일은 형식 에러를 우선 반환한다', () => {
      const file = new File(['a'.repeat(FILE_MAX_SIZE_BYTES + 1)], 'document.txt', {
        type: 'text/plain',
      });

      const result = validateFileForUpload(file);

      expect(result).toBe(
        '허용되지 않는 파일 형식입니다. .pdf, .ppt, .pptx 파일만 업로드 가능합니다.',
      );
    });
  });
});
