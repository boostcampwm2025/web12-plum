import { z } from 'zod'

export const fileSchema = z.custom<any>((val) => {
  if (!val || typeof val !== 'object') return false;

  // 브라우저의 File 객체이거나, 서버의 Multer 객체인 특징이 있는지 확인
  // 브라우저: 'name' 속성 존재 / 서버: 'originalname' 속성 존재
  const isBrowserFile = 'name' in val && 'size' in val;
  const isServerFile = 'originalname' in val && 'size' in val;

  return isBrowserFile || isServerFile;
}, {
  message: "유효한 파일 형식이 아닙니다.",
});

export type Status = 'pending' | 'active' | 'ended';
