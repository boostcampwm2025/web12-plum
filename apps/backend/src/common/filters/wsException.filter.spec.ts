import { ArgumentsHost } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { WsExceptionFilter } from './wsException.filter.js';

describe('WsExceptionFilter', () => {
  let filter: WsExceptionFilter;
  let mockClient: any;
  let mockArgumentsHost: any;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
    };

    filter = new WsExceptionFilter(mockLogger);

    // 소켓 클라이언트 Mocking
    mockClient = {
      emit: jest.fn(),
    };

    // ArgumentsHost Mocking
    mockArgumentsHost = {
      switchToWs: jest.fn().mockReturnValue({
        getClient: () => mockClient,
      }),
      getArgs: jest.fn().mockReturnValue([{}, { event: 'test_event' }]),
    };
  });

  it('객체로 WsException 발생 시 정의된 에러 객체를 emit 해야 한다', () => {
    const errorData = { message: '잘못된 요청입니다' };
    const exception = new WsException(errorData);

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockClient.emit).toHaveBeenCalledWith(
      'error_occurred',
      expect.objectContaining({
        event: 'test_event',
        ...errorData,
      }),
    );
  });

  it('문자열로 WsException 발생 시 정의된 에러 메시지를 포함한 객체를 emit 해야 한다', () => {
    const errorData = '잘못된 요청입니다';
    const exception = new WsException(errorData);

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockClient.emit).toHaveBeenCalledWith(
      'error_occurred',
      expect.objectContaining({
        event: 'test_event',
        message: errorData,
      }),
    );
  });

  it('일반 Error 발생 시 internal server error를 emit 해야 한다', () => {
    const exception = new Error('서버 에러 발생');

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockClient.emit).toHaveBeenCalledWith(
      'error_occurred',
      expect.objectContaining({
        status: 'error',
        message: 'internal server error',
      }),
    );
  });

  it('알 수 없는 예외 발생 시 internal server error를 emit 해야 한다', () => {
    filter.catch('Unexpected String', mockArgumentsHost as ArgumentsHost);

    expect(mockClient.emit).toHaveBeenCalledWith(
      'error_occurred',
      expect.objectContaining({
        message: 'internal server error',
      }),
    );
  });
});
