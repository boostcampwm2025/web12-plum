import { ArgumentsHost } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { WsExceptionFilter } from './wsException.filter.js';

describe('WsExceptionFilter', () => {
  let filter: WsExceptionFilter;
  let mockClient: any;
  let mockArgumentsHost: any;
  let mockLogger: any;
  let mockWsContext: any;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
    };

    filter = new WsExceptionFilter(mockLogger);

    mockClient = {
      emit: jest.fn(),
    };

    // switchToWs가 반환할 객체
    mockWsContext = {
      getClient: jest.fn().mockReturnValue(mockClient),
      getPattern: jest.fn().mockReturnValue('test_event'),
    };

    // ArgumentsHost Mocking 수정
    mockArgumentsHost = {
      switchToWs: jest.fn().mockReturnValue(mockWsContext),
      getArgs: jest.fn().mockReturnValue([{}, { event: 'test_event' }]),
    };
  });

  it('Ack 콜백이 있을 경우 콜백을 호출해야 한다', () => {
    const ackCallback = jest.fn();
    // 마지막 인자에 콜백 함수 추가
    mockArgumentsHost.getArgs.mockReturnValue([{}, {}, ackCallback]);

    const exception = new WsException('검증 에러');
    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    // 콜백이 호출되었는지 확인
    expect(ackCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: '검증 에러',
      }),
    );
    // 콜백이 호출되었다면 emit은 발생하지 않아야 함 (구현에 따라 다름)
    expect(mockClient.emit).not.toHaveBeenCalledWith('error_occurred', expect.anything());
  });

  it('Ack 콜백이 없을 경우 error_occurred 이벤트를 emit 해야 한다', () => {
    mockArgumentsHost.getArgs.mockReturnValue([{}, {}]);

    const exception = new WsException('검증 에러');
    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockClient.emit).toHaveBeenCalledWith(
      'error_occurred',
      expect.objectContaining({
        success: false,
        error: '검증 에러',
      }),
    );
  });

  it('WsException 발생 시 메시지를 추출하여 응답해야 한다', () => {
    const exception = new WsException('잘못된 요청입니다');
    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockClient.emit).toHaveBeenCalledWith(
      'error_occurred',
      expect.objectContaining({
        success: false,
        error: '잘못된 요청입니다',
      }),
    );
  });

  it('일반 Error 발생 시 메시지를 추출하여 응답해야 한다', () => {
    const exception = new Error('DB 접속 실패');
    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockClient.emit).toHaveBeenCalledWith(
      'error_occurred',
      expect.objectContaining({
        success: false,
        error: 'DB 접속 실패',
      }),
    );
  });
});
