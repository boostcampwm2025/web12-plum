const ALLOWED_ORIGINS = [
  // 개발 환경
  'https://web12-plum-dev.vercel.app',
  'https://tiki-plum.n-e.kr',
  // 운영 환경
  'https://web12-plum.vercel.app',
  'https://tiki-plum.o-r.kr',
  // 로컬 개발
  'http://localhost:5173',
  'http://localhost:4173',
];

export const CORS_CONFIG = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // origin이 없는 경우 (서버 간 요청, curl 등) 허용
    if (!origin) {
      callback(null, true);
      return;
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin}가 허용되지 않았습니다.`));
    }
  },
  credentials: true,
};
