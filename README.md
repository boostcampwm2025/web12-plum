<div align="center">
  <img width="1000" alt="banner" src="https://github.com/user-attachments/assets/361b9118-ddaa-4575-a64f-59127b1eec62" />
</div>

<br />
  
<div align="center">
  <a href="https://github.com/boostcampwm2025/web12-plum/wiki">
    <img width="269" height="78" alt="image" src="https://github.com/user-attachments/assets/098ccc6d-c2d2-4db3-981b-69fee3ea702b" />
  </a>
  <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
  <a href="https://web12-plum-dev.vercel.app/">
    <img width="261" height="78" alt="image" src="https://github.com/user-attachments/assets/31584581-40f0-4b23-b56e-c7c87f508e02" />
  </a>
</div>

<div align="center">

<br />

# PLUM

**강의실은 놀이터처럼, 결과는 전문가처럼!** ✨

[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Mediasoup](https://img.shields.io/badge/Mediasoup-darkred?logo=webrtc&logoColor=white)](https://mediasoup.org/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)

</div>

<br />

<h2>
  <img width="1209" height="60" alt="image" src="https://github.com/user-attachments/assets/5e42ad61-56bd-43e0-a8e8-ceb8622e4417" />
</h2>

> _**"카메라 너머 수강생들은 지금 제 수업을 잘 따라오고 있을까요?"**_


**1. 비대면 교육의 확산과 도구의 한계**

실시간 비대면 교육은 급격히 증가하고 있지만, 정작 교육 현장에서는 교육 특화 도구가 부족하여 일반 회의용 솔루션(Zoom, Google Meet 등)에 의존하고 있습니다. 이러한 범용 도구들은 화상회의 기능에는 충실하지만, 교육에 필수적인 상호작용 레이어는 부족한 실정입니다.

<br />

**2. 소통의 단절: "듣고 있나요?"라는 질문의 반복**

<div align="center">
  <img width="600" alt="image" src="https://github.com/user-attachments/assets/9128770c-4a2b-4c83-976c-1d797cad34c7" />
</div>

한국교육학술정보원(KERIS)의 조사에 따르면, 온라인 교육 환경에서 강의자와 학습자 간의 가장 큰 장벽은 상호작용의 부재입니다.

- **학습자의 수동화**: 채팅이나 음성 답변에 대한 심리적 부담감으로 인해 참여율이 저하됩니다.

- **강의자의 피드백 부재**: 청중의 반응을 파악할 시각적·비언어적 채널이 없어, 강의자는 벽을 보고 이야기하는 듯한 단방향 강의를 지속하게 됩니다.

<br />

<h2>
  <img width="1209" height="60" alt="image" src="https://github.com/user-attachments/assets/4060f0a5-c4a4-4293-9fb6-e06be6578eec" />
</h2>

<div align="center">
  <strong>PLUM은 WebRTC 기술과 AI 제스처 인식을 결합하여 강의자와 수강생을 실시간으로 연결합니다.</strong>
  
  <br />
  <br />

  <img width="400" alt="Group 29" src="https://github.com/user-attachments/assets/02e3f9d8-d530-4ee6-a2e6-7eea7af1f1b6" />

  <br />
  <br />
</div>

> **Interactivity (상호작용)**

- 단방향 강의를 벗어나 청중이 능동적으로 참여하는 수업 경험을 제공합니다.

- 제스처 인식, 실시간 투표, 인터랙티브 질문 시스템을 통해 **모든 수강생은 관객이 아닌 주인공이 됩니다.

<br />

> **Visibility (가시성)**

- 강의자는 수강생의 제스처와 참여도 데이터를 대시보드를 통해 실시간으로 확인할 수 있습니다.

- 보이지 않던 비언어적 반응을 시각화하여, 흐름에 맞는 즉각적인 대응과 공감 기반의 강의 진행을 돕습니다.

<br />

> **Insight (통찰)**

- 강의 종료 후 LLM 기반 자동 요약과 참여 분석 리포트를 제공합니다.

- 수업 중 발생한 유의미한 데이터를 분석하여 강의의 질을 개선하고 더 나은 학습 커리큘럼을 설계할 수 있는 기반을 마련합니다.

<br />

<h2>
  <img width="1209" height="60" alt="image" src="https://github.com/user-attachments/assets/d00c648b-cf55-41d8-8d17-9b7e4cde2ebd" />
</h2>

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

# ffmpeg 설치
## macOS
brew install ffmpeg
## Windows (PowerShell 관리자 권한)
winget install Gyan.FFmpeg
## Linux (Debian/Ubuntu)
sudo apt update && sudo apt install ffmpeg

# 백엔드 및 프론트엔드 애플리케이션 실행
pnpm dev
```

- 서비스 접속하기: `http://localhost:5173`
- Grafana 대시보드 접속: `http://localhost:3001` (ID / PW: admin / admin)

<br />

### 🖥️ System Requirements

- Runtime
  - Node.js 18.0.0+
  - pnpm 9.15.0+
- Media Processing
  - FFmpeg: `segment` 뮤서 및 `concat` 필터 지원 버전 (시스템 PATH 등록 필수)
- Infrastructure
  - Docker & Docker Compose (for local infrastructure)
- Build Tools (for Mediasoup)
  - Windows: Visual Studio Build Tools (C++ Desktop development) & Python 3
  - macOS: Xcode Command Line Tools (xcode-select --install)
  - Linux: build-essential, python3, make, g+

<br />

<h2>
  <img width="1209" height="60" alt="image" src="https://github.com/user-attachments/assets/307f0ab9-ec1f-4147-ac8c-7e9b3ce95774" />
</h2>

### Infrastructure Architecture

<div align="center">
  <img width="100%" alt="PLUM Infrastructure Diagram" src="https://github.com/user-attachments/assets/0dbae0d3-93e3-4d48-af7d-56b4abb4710c" />
</div>

### Monitoring & Observability

<div align="center">
  <img width="100%" alt="PLUM Monitoring Diagram" src="https://github.com/user-attachments/assets/0c3170a6-dd7c-45eb-8a9c-5ac76b60943d" />
</div>

### Project Structure

```
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
│   │       ├── app/          # 앱 설정 (라우팅, 스타일)
│   │       ├── feature/      # 기능 단위 컴포넌트 (create-lecture, enter-lecture, room, summary)
│   │       ├── pages/        # 라우트 페이지
│   │       ├── shared/       # 공용 컴포넌트, API 클라이언트, 훅, 유틸리티
│   │       ├── store/        # 전역 상태 관리 (Zustand)
│   │       ├── mediasoup/    # MediaSoup WebRTC 클라이언트 설정
│   │       ├── assets/       # 이미지, 폰트 등 정적 자산
│   │       ├── types/        # TypeScript 타입 정의
│   │       ├── mocks/        # 테스트용 Mock 데이터
│   │       ├── App.tsx       # 루트 컴포넌트
│   │       └── main.tsx      # 앱 진입점
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

<br />

<h2>
  <img width="1209" height="60" alt="image" src="https://github.com/user-attachments/assets/35be108e-5d39-4cac-9ee5-8ef439e14a95" />
</h2>

<h3>
  <img width="2418" height="72" alt="image" src="https://github.com/user-attachments/assets/636ce89b-bec3-41a2-b608-d5fda7b9d1b7" />
</h3>

강의 시작 전에 투표와 Q&A를 미리 구성하고 발표 자료를 업로드하여 체계적인 강의 준비가 가능합니다.

<br />

<div align="center">
  <img width="600" alt="image" src="https://github.com/user-attachments/assets/36e64870-a980-445a-aab7-a6b179c44b37" />
</div>

<br />
<br />

<h3>
  <img width="2418" height="72" alt="image" src="https://github.com/user-attachments/assets/eabe2358-c212-4e4b-a184-91fc83a5df44" />
</h3>

카메라를 통해 손가락 제스처를 인식하여 말 없이도 의견을 표현할 수 있으며, 투표 참여도 손가락으로 간편하게 가능합니다.

<br />

<div align="center">
  <img width="600" alt="image" src="https://github.com/user-attachments/assets/c5270713-bc34-4e68-8e92-88731ca7934a" />
</div>

<br />
<br />

<h3>
  <img width="2418" height="72" alt="image" src="https://github.com/user-attachments/assets/ee4496af-d4b6-4547-a9e2-e851dfcbf9c5" />
</h3>

강의 중 즉석에서 투표를 생성하고 청중의 의견을 실시간으로 수집할 수 있으며, 제스처로도 참여할 수 있습니다.

<br />

<div align="center">
  <img width="600" alt="image" src="https://github.com/user-attachments/assets/cad6614e-774c-4f98-b04a-95960fdf5b94" /><br />
  <figcaption align="center">▲ 발표자 기준</figcaption>
</div>

<br />

<div align="center">
  <img width="600" alt="image" src="https://github.com/user-attachments/assets/91b03080-f9ab-4b6e-a070-19ffc30bd039" /><br />
  <figcaption align="center">▲ 청중 기준</figcaption>
</div>

<br />
<br />

<h3>
  <img width="2418" height="72" alt="image" src="https://github.com/user-attachments/assets/735a7d5d-2da9-4ced-b932-a6eff8918a54" />
</h3>

강의 중 질문을 던지고 청중의 답변을 실시간으로 받아볼 수 있습니다. 익명 답변 수집 기능을 통해 답변에 대한 심리적 부담감을 덜어줍니다.

<br />

<div align="center">
  <img width="600" alt="image" src="https://github.com/user-attachments/assets/a39aab06-0e68-4401-9b5f-15cbc37005e0" /><br />
  <figcaption align="center">▲ 발표자 기준</figcaption>
</div>

<br />

<div align="center">
  <img width="600" alt="image" src="https://github.com/user-attachments/assets/45abc02b-bf4c-4ba8-8600-3344e500cae0" /><br />
  <figcaption align="center">▲ 청중 기준</figcaption>
</div>

<br />
<br />

<h3>
  <img width="2418" height="72" alt="image" src="https://github.com/user-attachments/assets/899f7dc4-0bc1-4a69-b0d5-acadac0b3805" />
</h3>

강의 중 텍스트 기반 채팅으로 자유롭게 소통하고 질문을 주고받을 수 있습니다.

<br />

<div align="center">
  <img width="600" alt="스크린샷 2026-02-04 오후 12 27 13" src="https://github.com/user-attachments/assets/1bcb6ce7-194a-4e65-8a59-92c804704f78" />
</div>

<br />
<br />

<h3>
  <img width="2418" height="72" alt="image" src="https://github.com/user-attachments/assets/491027a2-09ea-4ed6-9fa0-cd6f51e51c39" />
</h3>

제스처, 투표, Q&A 참여 등을 기반으로 실시간 참여도 점수와 순위를 확인할 수 있어 수강생의 능동적 참여를 유도합니다.

<br />

<div align="center">
  <img width="600" alt="스크린샷 2026-02-04 오후 12 27 21" src="https://github.com/user-attachments/assets/2cfa51ee-f69b-408d-b8c9-e8133157957c" />
</div>

<br />

<h2>
  <img width="1209" height="60" alt="image" src="https://github.com/user-attachments/assets/f64085d5-15ee-4da5-bd85-b086dac8ed39" />
</h2>

**TIKI**는 탁구의 리듬감 있는 대화인 '티키타카(Tiki-taka)'에서 영감을 얻었습니다..

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
