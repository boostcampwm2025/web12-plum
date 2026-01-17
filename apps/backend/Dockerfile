# 빌드 스테이지 (Build stage)
# Alpine 대신 Debian 기반 이미지 사용 (Mediasoup prebuilt binary 호환성)
FROM node:20-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# 워크스페이스 루트 패키지 파일 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# 모든 워크스페이스 패키지 파일 복사
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-interfaces/package.json ./packages/shared-interfaces/

# 모든 의존성 설치 (워크스페이스 모드)
# Mediasoup이 여기서 빌드됨
RUN HUSKY=0 pnpm install --frozen-lockfile

# 소스 파일 복사
COPY apps/backend/ ./apps/backend/
COPY packages/shared-interfaces/ ./packages/shared-interfaces/

# shared-interfaces 먼저 빌드 (백엔드가 이에 의존함)
WORKDIR /app/packages/shared-interfaces
RUN pnpm run build

# 백엔드 빌드
WORKDIR /app/apps/backend
RUN pnpm run build

# 프로덕션 스테이지 (Production stage)
# Alpine 대신 Debian 기반 이미지 사용 (Mediasoup 실행 호환성)
FROM node:20-slim

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# 워크스페이스 루트의 패키지 파일 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-interfaces/package.json ./packages/shared-interfaces/

# 프로덕션 의존성만 설치 (devDependencies 제외)
# Mediasoup prebuilt binary가 이제 정상 동작함 (Debian glibc 호환)
RUN HUSKY=0 pnpm install --frozen-lockfile --prod

# 빌더 스테이지에서 빌드된 애플리케이션 복사
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared-interfaces ./packages/shared-interfaces

# 백엔드로 작업 디렉토리 설정
WORKDIR /app/apps/backend

# Expose port
EXPOSE 3000

# 환경을 프로덕션으로 설정
ENV NODE_ENV=production

# 애플리케이션 시작
CMD ["node", "dist/main"]
