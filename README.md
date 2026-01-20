<div align="center">
  <img width="1000" alt="banner" src="https://github.com/user-attachments/assets/361b9118-ddaa-4575-a64f-59127b1eec62" />

# PLUM

**강의는 놀이처럼, 성과는 전문가처럼!** ✨

[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Mediasoup](https://img.shields.io/badge/Mediasoup-darkred?logo=webrtc&logoColor=white)](https://mediasoup.org/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)

[📖 Project Wiki](https://github.com/boostcampwm2025/web12-plum/wiki) &nbsp; | &nbsp; [🚀 Live Demo](https://web12-plum.vercel.app/)

</div>

---

## 💫 Background & Problem

> [!IMPORTANT]
> **"카메라 너머 수강생들은 지금 제 수업을 잘 따라오고 있을까요?"**
>
> 실시간 비대면 교육 환경에서 가장 큰 장벽은 기술적 연결이 아닌 **상호작용의 부재**입니다.

**1. 비대면 교육의 확산과 도구의 한계**

실시간 비대면 교육은 급격히 증가하고 있지만, 정작 교육 현장에서는 교육 특화 도구가 부족하여 일반 회의용 솔루션(Zoom, Google Meet 등)에 의존하고 있습니다. 이러한 범용 도구들은 **화상회의 기능에는 충실하지만, 교육에 필수적인 상호작용 레이어는 부족**한 실정입니다.

**2. 소통의 단절: "듣고 있나요?"라는 질문의 반복**

한국교육학술정보원(KERIS)의 조사에 따르면, 온라인 교육 환경에서 강의자와 학습자 간의 가장 큰 장벽은 **상호작용의 부재**입니다.

- **학습자의 수동화**: 채팅이나 음성 답변에 대한 심리적 부담감으로 인해 참여율이 저하됩니다.
- **강의자의 피드백 부재**: 청중의 반응을 파악할 시각적·비언어적 채널이 없어, 강의자는 벽을 보고 이야기하는 듯한 **단방향 강의**를 지속하게 됩니다.

## 🎯 Core Solution & Values

<div align="center">
  <strong>PLUM은 WebRTC 기술과 AI 제스처 인식을 결합하여 강의자와 수강생을 실시간으로 연결합니다.</strong>
  
  <br />
  <br />

  <img width="800" height="434" alt="PLUM Core Solution" src="https://github.com/user-attachments/assets/2944b46b-4934-470c-b6e8-8db23184b30b" />
  <br />
  <br />
</div>

- **Interactivity (상호작용)**: 단방향 강의를 벗어나 청중이 능동적으로 참여하는 수업 경험을 제공합니다. 제스처 인식, 실시간 투표, 인터랙티브 질문 시스템을 통해 **모든 수강생은 관객이 아닌 주인공이 됩니다.**
- **Visibility (가시성)**: 강의자는 수강생의 제스처와 참여도 데이터를 대시보드를 통해 실시간으로 확인할 수 있습니다. **보이지 않던 비언어적 반응을 시각화**하여, 흐름에 맞는 즉각적인 대응과 공감 기반의 강의 진행을 돕습니다.
- **Insight (통찰)**: 강의 종료 후 LLM 기반 자동 요약과 참여 분석 리포트를 제공합니다. 수업 중 발생한 유의미한 데이터를 분석하여 **강의의 질을 개선하고 더 나은 학습 커리큘럼**을 설계할 수 있는 기반을 마련합니다.

---

## 🚀 Quick Start

### ⚙️ Installation & Run

프로젝트를 클론한 후, 다음 명령어를 순서대로 실행하여 개발 환경을 설정하고 애플리케이션을 실행합니다.

```bash
# 의존성 설치
pnpm install

# 환경 변수 파일 생성
cp apps/backend/.env.local.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env

# 로컬 인프라 (Redis, Prometheus 등) 실행
docker-compose -f docker-compose.local.yml up -d

# 공통 패키지 빌드 (백엔드/프론트엔드에서 사용)
pnpm --filter @plum/shared-interfaces build

# 백엔드 및 프론트엔드 애플리케이션 실행
pnpm dev
```

- 서비스 접속하기: `http://localhost:5173`
- Grafana 대시보드 접속: `http://localhost:3001` (ID / PW: admin / admin)

### 🖥️ System Requirements

- Runtime
  - Node.js 18.0.0+
  - pnpm 9.15.0+
- Infrastructure
  - Docker & Docker Compose (for local infrastructure)
- Build Tools (for Mediasoup)
  - Windows: Visual Studio Build Tools (C++ Desktop development) & Python 3
  - macOS: Xcode Command Line Tools (xcode-select --install)
  - Linux: build-essential, python3, make, g+

---

## 🏗️ Architecture

### Infrastructure Architecture

<div align="center">
  <img width="100%" alt="PLUM Infrastructure Diagram" src="https://github.com/user-attachments/assets/0dbae0d3-93e3-4d48-af7d-56b4abb4710c" />
</div>

### Monitoring & Observability

<div align="center">
  <img width="100%" alt="PLUM Monitoring Diagram" src="https://github.com/user-attachments/assets/0c3170a6-dd7c-45eb-8a9c-5ac76b60943d" />
</div>

### 📂 Project Structure

```bash
├── apps/
│   ├── backend/
│   │   └── src/
│   │       ├── common/       # 공통 모듈 (Filter, Interceptor 등)
│   │       ├── interaction/  # 채팅 및 인터랙션 (Socket.IO)
│   │       ├── mediasoup/    # MediaSoup SFU 설정 및 로직
│   │       ├── redis/        # Redis 상태 관리 (Adapter)
│   │       └── room/         # 강의실 관리
│   ├── frontend/
│   │   └── src/
│   │       ├── feature/      # 기능 단위 컴포넌트 (Create, Enter, Room)
│   │       ├── pages/        # 라우트 페이지
│   │       ├── shared/       # 공용 컴포넌트 및 유틸리티
│   │       └── store/        # 전역 상태 관리 (Zustand)
│   └── load-test/            # 성능 테스트 (K6, Artillery)
├── packages/
│   └── shared-interfaces/    # 공용 타입 및 DTO 정의
├── .github/                  # CI/CD Workflows
└── docker-compose.yml        # 인프라 설정
```

### Technology Stack

| Category           | Technology                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**       | ![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white) ![Zustand](https://img.shields.io/badge/Zustand-443E38?logo=react&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)          |
| **Backend**        | ![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white) ![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white) ![Mediasoup](https://img.shields.io/badge/Mediasoup-darkred?logo=webrtc&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)                                                                                                      |
| **Infra & DevOps** | ![NCP Cloud](https://img.shields.io/badge/NCP_Cloud-03C75A?logo=naver&logoColor=white) ![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white) ![AWS S3](https://img.shields.io/badge/AWS_S3-569A31?logo=amazon-s3&logoColor=white) |
| **Monitoring**     | ![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?logo=prometheus&logoColor=white) ![Grafana](https://img.shields.io/badge/Grafana-F46800?logo=grafana&logoColor=white) ![Loki](https://img.shields.io/badge/Loki-F46800?logo=grafana&logoColor=white) ![Sentry](https://img.shields.io/badge/Sentry-362D59?logo=sentry&logoColor=white)                                                                                                       |
| **Testing**        | ![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white) ![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white) ![k6](https://img.shields.io/badge/k6-7D64FF?logo=k6&logoColor=white) ![Artillery](https://img.shields.io/badge/Artillery-5A3E7F?logo=artillery&logoColor=white)                                                                                                          |
| **Monorepo**       | ![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=white) ![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)                                                                                                                                                                                                                                                                                    |

---

## 👥 Meet Our Team

**TIKI**는 탁구의 리듬감 있는 대화인 '티키타카(Tiki-taka)'에서 영감을 얻었습니다.  
**즐거운 협업**을 가장 큰 가치로 두고, 사용자와 개발자 모두가 만족하는 **완성도 높은 개발을 지향합니다.**

<div align="center">
  
  |                                       Dogi                                       |                                            Rocky                                            |                                       Dani                                       |                                      Max                                      |
  |:--------------------------------------------------------------------------------:|:-------------------------------------------------------------------------------------------:|:--------------------------------------------------------------------------------:|:-----------------------------------------------------------------------------:|
  | [![Dogi](https://github.com/YunDo-Gi.png?size=150)](https://github.com/YunDo-Gi) | [![Rocky](https://github.com/KimDongGyun23.png?size=150)](https://github.com/KimDongGyun23) | [![Dani](https://github.com/dami0806.png?size=150)](https://github.com/dami0806) | [![Max](https://github.com/yuchem2.png?size=150)](https://github.com/yuchem2) |
  |                        [곽윤철](https://github.com/YunDo-Gi)                        |                           [김동균](https://github.com/KimDongGyun23)                           |                        [박다미](https://github.com/dami0806)                        |                       [윤재현](https://github.com/yuchem2)                       |
  
  <br />
  
  ### ✨ PLUM 프로젝트를 확인해주셔서 감사합니다!
  저희의 고민과 노력이 담긴 프로젝트입니다. 질문이나 피드백은 언제나 환영합니다.
  
  <br />

**[ 📖 프로젝트 위키 바로가기 ](https://github.com/boostcampwm2025/web12-plum/wiki) &nbsp; | &nbsp; [ 🚀 라이브 데모 체험하기 ](https://web12-plum.vercel.app/)**

  <br />
  
  Copyright © 2026 **PLUM Team (TIKI)**. All rights reserved.
</div>
