# MediaPipe 손동작 인식 웹 애플리케이션

Vercel 배포를 위해 제작된 간단한 단일 페이지 웹 애플리케이션입니다. MediaPipe의 [Gesture Recognizer](https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer/web_js?hl=ko)를 사용하여 웹캠을 통해 실시간으로 손동작을 인식하고 표시합니다.

## 기술 스택

*   **HTML/CSS/JavaScript**: 웹 페이지의 기본 구조와 스타일, 동작을 구현합니다.
*   **MediaPipe Tasks Vision**: Google에서 제공하는 머신러닝 라이브러리로, 웹에서 바로 손동작 인식을 수행합니다.
*   **Vite**: 빠른 개발 서버와 효율적인 빌드 도구로 사용됩니다.

## 프로젝트 구조

```
/
|-- index.html        # 메인 페이지
|-- style.css         # 스타일 시트
|-- script.js         # MediaPipe 연동 및 로직
|-- package.json      # 프로젝트 정보 및 의존성
|-- README.md         # 프로젝트 설명 파일
```

## 실행 방법

### 1. 의존성 설치

프로젝트를 실행하기 위해 Node.js와 npm이 필요합니다. 프로젝트 루트 디렉토리에서 다음 명령어를 실행하여 Vite를 설치합니다.

```bash
npm install
```

### 2. 개발 서버 실행

다음 명령어를 실행하여 Vite 개발 서버를 시작합니다.

```bash
npm run dev
```

서버가 실행되면 터미널에 표시된 주소(보통 `http://localhost:5173`)로 접속하여 웹캠 접근을 허용한 후 손동작 인식을 테스트할 수 있습니다.

## 구현 상세

이 프로젝트의 핵심 기능은 `script.js` 파일과 MediaPipe 라이브러리를 통해 구현됩니다.

### MediaPipe Gesture Recognizer

**MediaPipe**는 Google에서 개발한 오픈소스 프레임워크로, 비전, 오디오 등 다양한 데이터를 처리하는 머신러닝 파이프라인을 쉽게 구축할 수 있도록 도와줍니다. 이 프로젝트에서는 웹 브라우저에서 실시간으로 손동작을 인식하는 **Gesture Recognizer** 작업을 사용합니다.

*   **모델 로드**: 사전 훈련된 제스처 인식 모델(`.task` 파일)을 Google의 CDN에서 가져와 사용합니다. 이 모델은 손의 21개 랜드마크를 감지하고, 이를 기반으로 'Victory', 'Thumb_Up' 등 미리 정의된 제스처를 분류합니다.
*   **실행 환경**: WebAssembly(WASM)를 사용하여 브라우저에서 네이티브에 가까운 속도로 모델을 실행하며, GPU 가속을 통해 성능을 최적화합니다.

### script.js의 역할

`script.js` 파일은 MediaPipe를 웹 페이지에 통합하고, 전체 동작 과정을 제어하는 역할을 합니다.

1.  **초기화 (`createGestureRecognizer` 함수)**
    *   페이지가 로드되면, `@mediapipe/tasks-vision` 패키지에서 필요한 모듈(`GestureRecognizer`, `FilesetResolver`, `DrawingUtils`)을 가져옵니다.
    *   `FilesetResolver`를 사용하여 MediaPipe의 WASM 파일들을 로드합니다.
    *   `GestureRecognizer.createFromOptions`를 호출하여 제스처 인식기를 비동기적으로 생성하고 초기화합니다. 이 과정에서 인식할 최대 손 개수(`numHands`), 비디오 스트림 처리 모드(`runningMode`) 등의 옵션을 설정합니다.

2.  **웹캠 활성화 (`enableCam` 함수)**
    *   사용자가 '웹캠 활성화' 버튼을 클릭하면, `navigator.mediaDevices.getUserMedia` API를 통해 사용자의 웹캠에 접근을 요청합니다.
    *   스트림이 성공적으로 연결되면 `<video>` 요소에 웹캠 영상을 출력하고, `loadeddata` 이벤트가 발생하면 실시간 예측을 시작합니다.

3.  **실시간 예측 루프 (`predictWebcam` 함수)**
    *   이 함수는 `window.requestAnimationFrame`을 통해 브라우저의 렌더링 주기에 맞춰 반복적으로 호출됩니다. 이는 효율적인 비디오 처리를 보장합니다.
    *   각 프레임마다 `<video>` 요소의 현재 화면을 `gestureRecognizer.recognizeForVideo` 메서드에 전달하여 손동작 인식을 수행합니다.
    *   `lastVideoTime`을 체크하여 동일한 프레임에 대한 중복 예측을 방지합니다.

4.  **결과 시각화 및 표시**
    *   **랜드마크 그리기**: MediaPipe가 반환한 결과에는 각 손의 랜드마크 좌표가 포함되어 있습니다. `DrawingUtils`를 사용하여 이 좌표들을 `<canvas>` 요소 위에 점과 선으로 그려(손 모양 시각화) 사용자에게 보여줍니다.
    *   **제스처 결과 출력**: 인식된 제스처가 있는 경우(예: 주먹, 손가락 하트), 제스처의 이름(`categoryName`)과 신뢰도(`score`)를 가져와 화면 우측의 텍스트 영역에 표시합니다.

## Vercel 배포

이 프로젝트는 GitHub 레포지토리에 푸시한 후 Vercel에 연결하여 쉽게 배포할 수 있습니다.

1.  GitHub에 새로운 레포지토리를 생성하고 코드를 푸시합니다.
2.  Vercel에 로그인하여 'Add New... > Project'를 선택합니다.
3.  생성한 GitHub 레포지토리를 가져옵니다.
4.  Vercel이 자동으로 Vite 프로젝트임을 감지합니다. 별도의 설정 변경 없이 'Deploy' 버튼을 클릭하여 배포를 완료합니다.

배포가 완료되면 제공되는 Vercel URL을 통해 언제 어디서든 손동작 인식 기능을 사용할 수 있습니다.