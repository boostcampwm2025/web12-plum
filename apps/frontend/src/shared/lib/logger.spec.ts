import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  let consoleDebugSpy: MockInstance;
  let consoleInfoSpy: MockInstance;
  let consoleWarnSpy: MockInstance;
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('기본 로거 (카테고리 없음)', () => {
    it('debug 메서드는 console.debug를 호출한다', () => {
      logger.debug('테스트 메시지');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] 테스트 메시지');
    });

    it('info 메서드는 console.info를 호출한다', () => {
      logger.info('테스트 메시지');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] 테스트 메시지');
    });

    it('warn 메서드는 console.warn을 호출한다', () => {
      logger.warn('테스트 메시지');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] 테스트 메시지');
    });

    it('error 메서드는 console.error를 호출한다', () => {
      logger.error('테스트 메시지');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] 테스트 메시지');
    });

    it('추가 인자를 전달할 수 있다', () => {
      const obj = { key: 'value' };
      const num = 123;

      logger.info('테스트', obj, num);

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] 테스트', obj, num);
    });
  });

  describe('카테고리별 로거', () => {
    describe('API 카테고리', () => {
      it('debug 메서드는 스타일이 적용된 메시지를 출력한다', () => {
        logger.api.debug('API 요청');

        expect(consoleDebugSpy).toHaveBeenCalled();
        const [message] = consoleDebugSpy.mock.calls[0];
        expect(message).toContain('[DEBUG]');
        expect(message).toContain('%c');
      });

      it('info 메서드는 스타일이 적용된 메시지를 출력한다', () => {
        logger.api.info('API 응답');

        expect(consoleInfoSpy).toHaveBeenCalled();
        const [message] = consoleInfoSpy.mock.calls[0];
        expect(message).toContain('[INFO]');
        expect(message).toContain('%c');
      });

      it('warn 메서드는 스타일이 적용된 메시지를 출력한다', () => {
        logger.api.warn('API 경고');

        expect(consoleWarnSpy).toHaveBeenCalled();
        const [message] = consoleWarnSpy.mock.calls[0];
        expect(message).toContain('[WARN]');
        expect(message).toContain('%c');
      });

      it('error 메서드는 스타일이 적용된 메시지를 출력한다', () => {
        logger.api.error('API 에러');

        expect(consoleErrorSpy).toHaveBeenCalled();
        const [message] = consoleErrorSpy.mock.calls[0];
        expect(message).toContain('[ERROR]');
        expect(message).toContain('%c');
      });

      it('추가 인자를 전달할 수 있다', () => {
        const data = { status: 200 };

        logger.api.info('요청 성공', data);

        expect(consoleInfoSpy).toHaveBeenCalled();
        const calls = consoleInfoSpy.mock.calls[0];
        expect(calls).toContain(data);
      });
    });

    describe('Socket 카테고리', () => {
      it('info 메서드가 정상 작동한다', () => {
        logger.socket.info('소켓 연결');

        expect(consoleInfoSpy).toHaveBeenCalled();
        const [message] = consoleInfoSpy.mock.calls[0];
        expect(message).toContain('[INFO]');
      });
    });

    describe('UI 카테고리', () => {
      it('debug 메서드가 정상 작동한다', () => {
        logger.ui.debug('버튼 클릭');

        expect(consoleDebugSpy).toHaveBeenCalled();
        const [message] = consoleDebugSpy.mock.calls[0];
        expect(message).toContain('[DEBUG]');
      });
    });

    describe('Store 카테고리', () => {
      it('warn 메서드가 정상 작동한다', () => {
        logger.store.warn('상태 업데이트');

        expect(consoleWarnSpy).toHaveBeenCalled();
        const [message] = consoleWarnSpy.mock.calls[0];
        expect(message).toContain('[WARN]');
      });
    });

    describe('Custom 카테고리', () => {
      it('error 메서드가 정상 작동한다', () => {
        logger.custom.error('커스텀 에러');

        expect(consoleErrorSpy).toHaveBeenCalled();
        const [message] = consoleErrorSpy.mock.calls[0];
        expect(message).toContain('[ERROR]');
      });
    });
  });

  describe('유틸리티 메서드', () => {
    it('group은 console.group을 호출한다', () => {
      const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

      logger.group('테스트 그룹');

      expect(groupSpy).toHaveBeenCalledWith('테스트 그룹');

      groupSpy.mockRestore();
    });

    it('groupEnd는 console.groupEnd를 호출한다', () => {
      const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      logger.groupEnd();

      expect(groupEndSpy).toHaveBeenCalled();

      groupEndSpy.mockRestore();
    });

    it('table은 console.table을 호출한다', () => {
      const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
      const data = [{ name: 'Alice', age: 25 }];

      logger.table(data);

      expect(tableSpy).toHaveBeenCalledWith(data);

      tableSpy.mockRestore();
    });

    it('time은 console.time을 호출한다', () => {
      const timeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});

      logger.time('작업');

      expect(timeSpy).toHaveBeenCalledWith('작업');

      timeSpy.mockRestore();
    });

    it('timeEnd는 console.timeEnd를 호출한다', () => {
      const timeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => {});

      logger.timeEnd('작업');

      expect(timeEndSpy).toHaveBeenCalledWith('작업');

      timeEndSpy.mockRestore();
    });
  });

  describe('개발 환경에서만 로그 출력', () => {
    it('개발 환경(DEV=true)에서는 로그가 출력된다', () => {
      logger.debug('디버그 메시지');
      logger.info('정보 메시지');
      logger.warn('경고 메시지');
      logger.error('에러 메시지');

      expect(consoleDebugSpy).toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('개발 환경에서 카테고리 로그가 출력된다', () => {
      logger.api.info('API 메시지');
      logger.socket.debug('소켓 메시지');

      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('개발 환경에서 유틸리티 메서드가 실행된다', () => {
      const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
      const timeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});

      logger.group('그룹');
      logger.table([]);
      logger.time('타이머');

      expect(groupSpy).toHaveBeenCalled();
      expect(tableSpy).toHaveBeenCalled();
      expect(timeSpy).toHaveBeenCalled();

      groupSpy.mockRestore();
      tableSpy.mockRestore();
      timeSpy.mockRestore();
    });
  });

  describe('메시지 포맷팅', () => {
    it('카테고리 로그는 카테고리가 레벨보다 앞에 온다', () => {
      logger.api.info('메시지');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const [message] = consoleInfoSpy.mock.calls[0];

      // %c...%c [LEVEL] 순서 확인
      const categoryEndIndex = message.indexOf('%c', message.indexOf('%c') + 1);
      const levelIndex = message.indexOf('[INFO]');
      expect(categoryEndIndex).toBeLessThan(levelIndex);
    });

    it('레벨 라벨에는 공백 패딩이 없다', () => {
      logger.debug('메시지');
      logger.info('메시지');
      logger.warn('메시지');
      logger.error('메시지');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] 메시지');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] 메시지');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] 메시지');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] 메시지');
    });
  });
});
