import { logger } from '../lib/logger';
import { ApiError } from './types';

export const defaultErrorHandler = (error: ApiError): void => {
  logger.api.error('API 요청 실패', {
    message: error.message,
    statusCode: error.statusCode,
  });

  switch (error.statusCode) {
    case 400:
      break;

    // 로그인 추가되면 401 처리 필요

    case 403:
      logger.api.warn('접근 권한이 없습니다.');
      break;

    case 404:
      logger.api.warn('요청한 리소스를 찾을 수 없습니다.');
      break;

    case 500:
    case 502:
    case 503:
      logger.api.error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      break;

    default:
      if (!error.statusCode) {
        logger.api.error('네트워크 오류가 발생했습니다.');
      }
      break;
  }
};
