# 화상회의 + 제스처 인식 웹 애플리케이션

MediaPipe를 이용한 실시간 제스처 인식과 mediasoup을 이용한 화상회의 기능을 통합한 웹 애플리케이션입니다. MediaPipe의 [Gesture Recognizer](https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer/web_js?hl=ko)를 사용하여 웹캠을 통해 실시간으로 손동작을 인식하고, mediasoup SFU를 통해 대규모 화상회의를 지원합니다.

## 주요 기능

- **실시간 제스처 인식**: MediaPipe를 사용하여 손 제스처를 실시간으로 인식
  - 기본 제스처: 엄지 올리기, 엄지 내리기, 손 들기
  - 커스텀 제스처: OK 사인, 숫자 1-4
- **화상회의**: mediasoup SFU를 통한 대규모 화상회의 지원 (10명 이상)
- **제스처 + 화상회의 통합**: 화상회의 중에도 본인 카메라에서 제스처 인식

## 프로젝트 구조

```
.
├── client/                 # 프론트엔드 애플리케이션
│   ├── index.html         # 메인 HTML 파일
│   ├── style.css          # 스타일시트
│   ├── script.js          # 메인 클라이언트 로직 (제스처 인식 + 화상회의)
│   ├── gestures.js        # 커스텀 제스처 분류 로직
│   ├── mediasoup-client.js # mediasoup 클라이언트 래퍼
│   ├── vite.config.ts     # Vite 설정
│   └── package.json       # 클라이언트 의존성
│
├── server/                # NestJS 백엔드 서버
│   ├── src/
│   │   ├── config/
│   │   │   └── mediasoup.config.ts  # mediasoup 설정
│   │   ├── mediasoup/
│   │   │   ├── mediasoup.module.ts  # Mediasoup 모듈
│   │   │   ├── mediasoup.service.ts # Mediasoup 서비스 로직
│   │   │   └── mediasoup.gateway.ts # WebSocket Gateway
│   │   ├── app.module.ts            # 앱 루트 모듈
│   │   └── main.ts                  # 서버 엔트리 포인트
│   └── package.json                 # 서버 의존성
│
└── package.json           # 루트 스크립트 (dev, build, start)
```

## 설치 및 실행

### 빠른 시작 (권장)

프로젝트를 실행하기 위해 Node.js (v18 이상)와 npm이 필요합니다.

```bash
# 프로젝트 루트 디렉토리에서

# 1. 모든 의존성 설치 (클라이언트 + 서버)
npm run install:all

# 2. 개발 모드로 동시 실행 (클라이언트 + 서버)
npm run dev
```

서버가 `http://localhost:3000`에서 실행되고, 클라이언트는 `http://localhost:5173`에서 자동으로 열립니다.

### 개별 실행

필요에 따라 클라이언트와 서버를 개별적으로 실행할 수 있습니다.

#### 서버만 실행

```bash
# 개발 모드
npm run dev:server

# 또는 직접 실행
cd server
npm run start:dev
```

#### 클라이언트만 실행

```bash
# 개발 모드
npm run dev:client

# 또는 직접 실행
cd client
npm run dev
```

### 프로덕션 빌드

```bash
# 클라이언트 + 서버 모두 빌드
npm run build

# 프로덕션 모드로 실행
npm start
```

## 사용 방법

1. **회의 참가**: "회의 참가" 버튼을 클릭하여 mediasoup 서버에 연결
2. **웹캠 활성화**: "웹캠 활성화" 버튼을 클릭하여 카메라/마이크 스트림 시작
3. **제스처 인식**: 카메라 앞에서 제스처를 취하면 자동으로 인식됩니다
   - 제스처가 2초 이상 유지되면 확정되어 화면에 표시됩니다
4. **다중 참가자**: 여러 브라우저 탭/창에서 접속하여 화상회의를 테스트할 수 있습니다
5. **회의 나가기**: "회의 나가기" 버튼을 클릭하여 연결 종료

## 인식 가능한 제스처

### MediaPipe 기본 제스처

- **엄지 올리기** (Thumb_Up): 👍
- **엄지 내리기** (Thumb_Down): 👎
- **손 들기** (Open_Palm): 🖐️

### 커스텀 제스처

- **OK 사인**: 👌 - 엄지와 검지를 붙이고 나머지 손가락은 펴기
- **숫자 1**: 1️⃣ - 검지만 펴기
- **숫자 2**: 2️⃣ - 검지와 중지 펴기
- **숫자 3**: 3️⃣ - 검지, 중지, 약지 펴기
- **숫자 4**: 4️⃣ - 네 손가락 모두 펴기
