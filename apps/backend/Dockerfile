# 빌드 스테이지 (Build stage)
FROM node:20-alpine AS builder

# Mediasoup 빌드를 위한 필수 패키지 설치
# python3, py3-pip, make, g++, linux-headers (커널 헤더) 등이 필요함
RUN apk add --no-cache python3 py3-pip make g++ linux-headers

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
FROM node:20-alpine

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# 워크스페이스 루트의 패키지 파일 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-interfaces/package.json ./packages/shared-interfaces/

# 빌더 스테이지에서 빌드된 node_modules 복사 (Mediasoup 포함)
# 프로덕션에서 재설치하지 않고 빌더에서 빌드된 것을 사용
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/packages/shared-interfaces/node_modules ./packages/shared-interfaces/node_modules

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
