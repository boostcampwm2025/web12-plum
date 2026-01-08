/**
 * 로그 레벨 타입
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 카테고리 타입
 */
type LogCategory = 'API' | 'Socket' | 'UI' | 'Store' | 'Custom';

/**
 * 개발 환경 여부
 */
const isDev = import.meta.env.DEV;

/**
 * 레벨별 라벨
 */
const LEVEL_LABEL: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
};

/**
 * 카테고리별 배경색 정의
 */
const CATEGORY_COLORS: Record<LogCategory, string> = {
  API: '#2563EB',
  Socket: '#7C3AED',
  UI: '#059669',
  Store: '#D97706',
  Custom: '#57534E',
};

/**
 * 로그 메시지를 포맷팅하고 콘솔에 출력
 */
const formatMessage = (
  level: LogLevel,
  category: LogCategory | undefined,
  message: string,
  ...args: unknown[]
): void => {
  if (!isDev) return;

  const label = LEVEL_LABEL[level];

  if (category) {
    const bgColor = CATEGORY_COLORS[category] ?? '#6B7280';

    const paddedCategory = category
      .padStart(category.length + Math.floor((6 - category.length) / 2), ' ')
      .padEnd(6, ' ');

    const styledCategory = `%c${paddedCategory}%c`;
    const categoryStyle = `background: ${bgColor}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;`;
    const resetStyle = '';

    const fullMessage = `${styledCategory} [${label}] ${message}`;

    switch (level) {
      case 'debug':
        console.debug(fullMessage, categoryStyle, resetStyle, ...args);
        break;
      case 'info':
        console.info(fullMessage, categoryStyle, resetStyle, ...args);
        break;
      case 'warn':
        console.warn(fullMessage, categoryStyle, resetStyle, ...args);
        break;
      case 'error':
        console.error(fullMessage, categoryStyle, resetStyle, ...args);
        break;
    }
  } else {
    const fullMessage = `[${label}] ${message}`;

    switch (level) {
      case 'debug':
        console.debug(fullMessage, ...args);
        break;
      case 'info':
        console.info(fullMessage, ...args);
        break;
      case 'warn':
        console.warn(fullMessage, ...args);
        break;
      case 'error':
        console.error(fullMessage, ...args);
        break;
    }
  }
};

const debug = (message: string, ...args: unknown[]): void => {
  formatMessage('debug', undefined, message, ...args);
};
const info = (message: string, ...args: unknown[]): void => {
  formatMessage('info', undefined, message, ...args);
};
const warn = (message: string, ...args: unknown[]): void => {
  formatMessage('warn', undefined, message, ...args);
};
const error = (message: string, ...args: unknown[]): void => {
  formatMessage('error', undefined, message, ...args);
};

const group = (label: string): void => {
  if (!isDev) return;
  console.group(label);
};
const groupEnd = (): void => {
  if (!isDev) return;
  console.groupEnd();
};
const table = (data: unknown): void => {
  if (!isDev) return;
  console.table(data);
};
const time = (label: string): void => {
  if (!isDev) return;
  console.time(label);
};
const timeEnd = (label: string): void => {
  if (!isDev) return;
  console.timeEnd(label);
};

/**
 * 카테고리별 로거
 */
const createCategoryLogger = (category: LogCategory) => ({
  debug: (message: string, ...args: unknown[]) =>
    formatMessage('debug', category, message, ...args),
  info: (message: string, ...args: unknown[]) => formatMessage('info', category, message, ...args),
  warn: (message: string, ...args: unknown[]) => formatMessage('warn', category, message, ...args),
  error: (message: string, ...args: unknown[]) =>
    formatMessage('error', category, message, ...args),
});

/**
 * 통합 로거 객체
 */
export const logger = {
  debug,
  info,
  warn,
  error,
  group,
  groupEnd,
  table,
  time,
  timeEnd,

  api: createCategoryLogger('API'),
  socket: createCategoryLogger('Socket'),
  ui: createCategoryLogger('UI'),
  store: createCategoryLogger('Store'),
  custom: createCategoryLogger('Custom'),
};
