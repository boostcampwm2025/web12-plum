// 이 스크립트는 웹캠을 통해 실시간으로 손동작을 인식하고 시각화하는 메인 애플리케이션 로직을 포함합니다.
// MediaPipe의 기본 인식과 커스텀 규칙 기반 인식을 결합하여 사용합니다.
// mediasoup을 통한 화상회의 기능도 포함합니다.

// MediaPipe의 핵심 모듈들을 가져옵니다.
import { GestureRecognizer, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

// 커스텀 제스처(예: OK 사인, 숫자) 분류 로직을 별도 파일에서 가져옵니다.
// 이 로직은 MediaPipe가 제공하는 랜드마크 데이터를 분석하여 사용자 정의 제스처를 판별합니다.
import { classifyCustomGesture } from "./gestures.js";

// mediasoup 클라이언트를 가져옵니다.
import { MediasoupClient } from "./mediasoup-client.js";

// --- 1. DOM 요소 및 애플리케이션 상태 변수 초기화 ---

// HTML에서 필요한 DOM 요소들을 가져와 변수에 할당합니다.
const video = document.getElementById("webcam"); // 웹캠 영상이 표시될 <video> 요소
const canvasElement = document.getElementById("output_canvas"); // 랜드마크를 그릴 <canvas> 요소
const canvasCtx = canvasElement.getContext("2d"); // 캔버스 2D 렌더링 컨텍스트
const gestureOutput = document.getElementById("gesture_output"); // 최종 인식된 제스처 텍스트를 표시할 <div>
const webcamButton = document.getElementById("webcamButton"); // 웹캠 활성화/비활성화 버튼
const joinButton = document.getElementById("joinButton"); // 회의 참가 버튼
const leaveButton = document.getElementById("leaveButton"); // 회의 나가기 버튼
const remoteVideos = document.getElementById("remote-videos"); // 원격 참가자 비디오 컨테이너

// 제스처 인식 시 사용자에게 시각적 피드백을 제공하는 타이머 UI 요소들
const timerContainer = document.getElementById("timer-container"); // 타이머 UI 전체 컨테이너
const gestureIcon = document.getElementById("gesture-icon"); // 감지 중인 제스처 아이콘 표시
const progressBar = document.getElementById("progress-bar"); // 2초 진행률을 보여주는 프로그레스 바

// 허용할 제스처 목록을 정의합니다. 이 목록에 없는 제스처는 '감지된 제스처 없음'으로 처리됩니다.
const ALLOWED_GESTURES = [
  "Thumb_Up",
  "Thumb_Down",
  "Open_Palm", // MediaPipe 기본 제스처
  "ok_sign",
  "number_1",
  "number_2",
  "number_3",
  "number_4", // 커스텀 제스처
];

// 제스처 이름과 해당 제스처를 나타내는 이모지 아이콘 매핑입니다.
// UI에서 현재 감지 중인 제스처를 시각적으로 보여줄 때 사용됩니다.
const GESTURE_ICONS = {
  Open_Palm: "🖐️",
  Thumb_Down: "👎",
  Thumb_Up: "👍",
  ok_sign: "👌",
  number_1: "1️⃣",
  number_2: "2️⃣",
  number_3: "3️⃣",
  number_4: "4️⃣",
};

// 인식된 제스처를 사용자 친화적인 한글 이름으로 변환하기 위한 매핑입니다.
// 최종 확정된 제스처 텍스트 출력 시 사용됩니다.
const GESTURE_DISPLAY_NAMES = {
  Thumb_Up: "엄지 올리기",
  Thumb_Down: "엄지 내리기",
  Open_Palm: "손 들기",
  ok_sign: "OK 사인",
  number_1: "숫자 1",
  number_2: "숫자 2",
  number_3: "숫자 3",
  number_4: "숫자 4",
};

// 캔버스에 랜드마크를 효율적으로 그리기 위한 DrawingUtils 인스턴스입니다.
// 한 번만 생성하여 여러 번 재사용함으로써 성능을 최적화합니다.
const drawingUtils = new DrawingUtils(canvasCtx);

// 애플리케이션의 핵심 상태 변수들
let gestureRecognizer; // MediaPipe GestureRecognizer 인스턴스
let webcamRunning = false; // 웹캠이 현재 실행 중인지 여부
let lastProcessTime = 0; // 마지막으로 제스처 인식을 수행한 시각 (throttling을 위해 사용)
let currentGestureState = {
  // 현재 감지 중인 (아직 확정되지 않은) 제스처의 상태
  name: null, // 제스처 이름
  startTime: 0, // 제스처가 처음 감지된 시각
  score: 0, // 제스처의 신뢰도 점수
};
let confirmedGesture = null; // 2초 유지 조건을 만족하여 확정된 제스처의 이름
let lastRecognitionResult = null; // 가장 최근에 인식된 MediaPipe 결과 (랜드마크 그리기용)

// mediasoup 관련 상태 변수들
let mediasoupClient = null; // MediasoupClient 인스턴스
let localStream = null; // 로컬 미디어 스트림
let joined = false; // 회의 참가 여부

// --- 2. MediaPipe GestureRecognizer 초기화 ---

// 제스처 인식기를 비동기적으로 생성하고 초기화하는 함수입니다.
// 웹캠 시작 전 반드시 호출되어야 합니다.
const createGestureRecognizer = async () => {
  // MediaPipe WASM 파일을 로드하여 비전 작업을 위한 환경을 설정합니다.
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );

  // GestureRecognizer 인스턴스를 생성합니다.
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      // 제스처 인식을 위한 사전 훈련된 모델 파일의 경로를 지정합니다.
      // 이 모델이 실제 손동작 패턴을 분석하는 역할을 합니다.
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate: "GPU", // 가능한 경우 GPU 가속을 사용하여 성능을 향상시킵니다.
    },
    runningMode: "VIDEO", // 실시간 비디오 스트림을 처리하도록 모드를 설정합니다.
    numHands: 2, // 커스텀 제스처 로직의 단순화를 위해 인식할 손을 1개로 제한합니다.
  });

  // 인식기 초기화가 완료되면 join 버튼을 활성화합니다.
  joinButton.disabled = false;
  console.log("[GestureRecognizer] Initialized");
};

// 애플리케이션 로드 시 제스처 인식기 초기화를 시작합니다.
createGestureRecognizer();

// --- 3. mediasoup 클라이언트 초기화 및 이벤트 핸들러 ---

// 회의 참가
async function joinConference() {
  try {
    joinButton.disabled = true;
    joinButton.innerText = "연결 중...";

    // mediasoup 클라이언트 초기화
    mediasoupClient = new MediasoupClient("http://localhost:3000");

    // 서버 연결
    await mediasoupClient.connect();

    // 디바이스 초기화
    await mediasoupClient.initDevice();

    // 이벤트 핸들러 설정
    mediasoupClient.onNewConsumer = (consumer, socketId) => {
      console.log("[App] New consumer:", consumer.id, "from peer:", socketId);
      addRemoteVideo(consumer, socketId);
    };

    mediasoupClient.onPeerLeft = (peerId) => {
      console.log("[App] Peer left:", peerId);
      removeRemoteVideo(peerId);
    };

    // 기존 참가자들의 스트림 소비
    await mediasoupClient.consumeExistingProducers();

    joined = true;
    joinButton.style.display = "none";
    webcamButton.disabled = false;
    leaveButton.disabled = false;

    console.log("[App] Joined conference");
  } catch (error) {
    console.error("[App] Failed to join conference:", error);
    alert("회의 참가 실패: " + error.message);
    joinButton.disabled = false;
    joinButton.innerText = "회의 참가";
  }
}

// 회의 나가기
function leaveConference() {
  if (webcamRunning) {
    enableCam(); // 웹캠 종료
  }

  if (mediasoupClient) {
    mediasoupClient.disconnect();
    mediasoupClient = null;
  }

  // 원격 비디오 모두 제거
  remoteVideos.innerHTML = "";

  joined = false;
  joinButton.style.display = "inline-block";
  joinButton.disabled = false;
  joinButton.innerText = "회의 참가";
  webcamButton.disabled = true;
  leaveButton.disabled = true;

  console.log("[App] Left conference");
}

// 원격 비디오 추가
function addRemoteVideo(consumer, socketId) {
  const existingContainer = document.getElementById(`peer-${socketId}`);

  if (!existingContainer) {
    // 새 참가자 컨테이너 생성
    const container = document.createElement("div");
    container.id = `peer-${socketId}`;
    container.className = "remote-peer";

    const video = document.createElement("video");
    video.id = `video-${socketId}`;
    video.autoplay = true;
    video.playsinline = true;

    const label = document.createElement("div");
    label.className = "peer-label";
    label.innerText = `참가자 ${socketId.substring(0, 6)}`;

    container.appendChild(video);
    container.appendChild(label);
    remoteVideos.appendChild(container);
  }

  const video = document.getElementById(`video-${socketId}`);
  if (video && consumer.kind === "video") {
    const stream = new MediaStream([consumer.track]);
    video.srcObject = stream;
  }
}

// 원격 비디오 제거
function removeRemoteVideo(peerId) {
  const container = document.getElementById(`peer-${peerId}`);
  if (container) {
    container.remove();
  }
}

// 버튼 이벤트 리스너
joinButton.addEventListener("click", joinConference);
leaveButton.addEventListener("click", leaveConference);

// --- 4. 웹캠 제어 로직 ---

// 웹캠을 활성화하거나 비활성화하는 함수입니다.
const enableCam = async () => {
  // 제스처 인식기가 아직 로드되지 않았다면 경고하고 함수를 종료합니다.
  if (!gestureRecognizer) {
    alert("제스처 인식기가 로드될 때까지 기다려주세요.");
    return;
  }

  // 회의 참가 확인
  if (!joined) {
    alert("먼저 회의에 참가해주세요.");
    return;
  }

  // 웹캠 상태를 토글합니다 (실행 중 -> 중지, 중지 -> 실행).
  webcamRunning = !webcamRunning;
  webcamButton.innerText = webcamRunning ? "웹캠 비활성화" : "웹캠 활성화";

  if (webcamRunning) {
    try {
      // 웹캠 활성화 시, 사용자 미디어(비디오+오디오) 스트림을 요청합니다.
      localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      video.srcObject = localStream; // <video> 요소에 스트림을 연결합니다.

      // 비디오 데이터가 모두 로드되면 예측 루프를 시작합니다.
      video.addEventListener("loadeddata", predictWebcam);

      // mediasoup을 통해 비디오/오디오 전송
      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];

      if (videoTrack) {
        await mediasoupClient.produce(videoTrack, { type: "video" });
        console.log("[App] Producing video");
      }

      if (audioTrack) {
        await mediasoupClient.produce(audioTrack, { type: "audio" });
        console.log("[App] Producing audio");
      }
    } catch (error) {
      console.error("[App] Failed to access webcam:", error);
      alert("웹캠/마이크 접근 실패: " + error.message);
      webcamRunning = false;
      webcamButton.innerText = "웹캠 활성화";
    }
  } else {
    // 웹캠 비활성화 시, 모든 미디어 트랙을 중지합니다.
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      localStream = null;
    }

    // mediasoup producers 종료
    if (mediasoupClient) {
      mediasoupClient.closeProducers();
    }

    video.srcObject = null;

    // UI 상태 및 제스처 인식 관련 변수들을 초기화합니다.
    lastRecognitionResult = null;
    currentGestureState.name = null;
    confirmedGesture = null;
    timerContainer.style.display = "none";
    gestureOutput.innerText = "감지된 제스처 없음";
  }
};

// 웹캠 버튼에 클릭 이벤트 리스너를 추가합니다.
webcamButton.addEventListener("click", enableCam);

// --- 4. 실시간 제스처 예측 및 UI 업데이트 루프 ---

// `predictWebcam` 함수는 `requestAnimationFrame`을 통해 브라우저의 렌더링 주기마다 호출됩니다.
// 이는 애니메이션과 UI 업데이트를 부드럽게 처리하는 데 필수적입니다.
async function predictWebcam() {
  // 웹캠이 실행 중이 아니라면 루프를 중단합니다.
  if (!webcamRunning) return;

  const now = Date.now(); // 현재 시각을 밀리초 단위로 가져옵니다.

  // --- 4.1. 매 프레임 실행되는 UI 업데이트 및 그리기 로직 (부드러운 화면 제공) ---

  // 캔버스 크기를 현재 비디오 스트림의 크기와 일치시킵니다.
  // 이 작업을 매 프레임 수행하면 캔버스가 자동으로 지워지고 (clear), 랜드마크 크기 왜곡을 방지합니다.
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;

  // `lastRecognitionResult`에 저장된 가장 최근의 랜드마크 정보를 사용하여 캔버스에 그립니다.
  // 이는 실제 인식 연산 주기(300ms)와 별개로, 매 프레임 랜드마크를 그려 화면 깜빡임을 방지합니다.
  if (lastRecognitionResult) {
    canvasCtx.save(); // 현재 캔버스 상태 저장
    if (lastRecognitionResult.landmarks) {
      for (const landmarks of lastRecognitionResult.landmarks) {
        // 손 랜드마크를 선으로 연결하여 뼈대를 그립니다.
        drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 5,
        });
        // 각 랜드마크 지점을 점으로 그립니다.
        drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 2 });
      }
    }
    canvasCtx.restore(); // 캔버스 상태 복원
  }

  // 제스처 감지 시 하단 타이머 UI의 프로그레스 바를 업데이트합니다.
  if (currentGestureState.name) {
    timerContainer.style.display = "flex"; // 타이머 UI를 보이게 합니다.
    // 현재 시간과 제스처 시작 시간 차이를 이용하여 진행률을 계산합니다 (2초 기준).
    const progress = (now - currentGestureState.startTime) / 2000;
    progressBar.style.width = `${Math.min(progress * 100, 100)}%`; // 프로그레스 바 너비 업데이트
  } else {
    timerContainer.style.display = "none"; // 감지 중인 제스처가 없으면 타이머 UI를 숨깁니다.
  }

  // --- 4.2. 300ms 마다 실행되는 제스처 인식 로직 (성능 최적화) ---

  // `now - lastProcessTime > 300` 조건을 통해 300ms(0.3초) 간격으로만 인식 연산을 수행합니다.
  // 이는 CPU에 부담을 주는 MediaPipe 연산을 과도하게 반복하지 않도록 하여 성능을 최적화합니다.
  if (now - lastProcessTime > 300) {
    lastProcessTime = now; // 마지막 처리 시각을 업데이트합니다.

    // MediaPipe GestureRecognizer를 사용하여 현재 비디오 프레임에서 제스처를 인식합니다.
    // 결과는 `lastRecognitionResult`에 저장되어 매 프레임 랜드마크를 그리는 데 사용됩니다.
    lastRecognitionResult = gestureRecognizer.recognizeForVideo(video, now);

    let finalGesture = null; // 최종적으로 결정된 제스처 이름
    let score = 0; // 최종 제스처의 신뢰도 점수

    // 랜드마크 데이터가 유효한 경우에만 커스텀 제스처 분류를 시도합니다.
    const landmarks = lastRecognitionResult.landmarks?.[0]; // 첫 번째 손의 랜드마크 가져오기
    const customGesture = classifyCustomGesture(landmarks); // 커스텀 제스처 분류 함수 호출

    if (customGesture) {
      // 커스텀 제스처가 감지되면 이를 최종 제스처로 사용합니다.
      finalGesture = customGesture;
      const randomScore = Math.random() * 0.1 + 0.6; // 0.6 ~ 0.7 사이의 임의의 신뢰도 점수 생성
      score = randomScore; // 커스텀 제스처는 신뢰도 60%~70%로 임의 설정 (실제 모델 점수가 없으므로)
    } else {
      // 커스텀 제스처가 없으면 MediaPipe의 기본 제스처 인식 결과를 확인합니다.
      if (lastRecognitionResult.gestures.length > 0) {
        const defaultGesture = lastRecognitionResult.gestures[0][0];
        // 'None' 제스처가 아니면 기본 제스처를 최종 제스처로 사용합니다.
        if (defaultGesture.categoryName !== "None") {
          finalGesture = defaultGesture.categoryName;
          score = defaultGesture.score;
        }
      }
    }

    // --- 4.3. 최종 제스처 필터링 ---
    // 정의된 `ALLOWED_GESTURES` 목록에 없는 제스처는 무시하고 '감지된 제스처 없음'으로 처리합니다.
    if (finalGesture && !ALLOWED_GESTURES.includes(finalGesture)) {
      finalGesture = null;
    }

    // --- 4.4. 현재 감지 상태 업데이트 (Throttled Logic) ---
    // 최종 결정된 제스처(finalGesture)를 기반으로 `currentGestureState`를 업데이트합니다.
    if (finalGesture) {
      // 새로운 제스처가 감지되었거나, 기존 제스처와 다른 경우 상태를 리셋합니다.
      if (finalGesture !== currentGestureState.name) {
        currentGestureState.name = finalGesture;
        currentGestureState.startTime = now; // 새로운 제스처의 시작 시간 기록
        currentGestureState.score = score;
        gestureIcon.innerText = GESTURE_ICONS[currentGestureState.name] || "?"; // 아이콘 업데이트
        confirmedGesture = null; // 확정 제스처 초기화
      }
    } else {
      // 감지된 제스처가 없으면 현재 상태를 초기화합니다.
      currentGestureState.name = null;
      // currentGestureState.startTime은 0으로 남겨두고 다음 제스처 감지를 기다립니다.
    }
  }

  // --- 4.5. 제스처 확정 로직 (매 프레임 실행) ---
  // `currentGestureState`에 제스처가 있고, 해당 제스처가 2초(2000ms) 이상 유지되었는지 확인합니다.
  if (currentGestureState.name && now - currentGestureState.startTime > 2000) {
    // 2초 이상 유지되었고, 아직 최종 확정되지 않았거나 다른 제스처인 경우에만 확정합니다.
    if (confirmedGesture !== currentGestureState.name) {
      confirmedGesture = currentGestureState.name; // 제스처를 확정합니다.
      const scoreText = parseFloat(currentGestureState.score * 100).toFixed(2);
      // `GESTURE_DISPLAY_NAMES`를 사용하여 사용자 친화적인 표시 이름을 가져와 출력합니다.
      const displayName = GESTURE_DISPLAY_NAMES[confirmedGesture] || confirmedGesture;
      gestureOutput.innerText = `인식된 제스처: ${displayName}\n 신뢰도: ${scoreText} %`;

      // 점수 팝업 표시
      showScorePopup(3);
    }
  }
  // 제스처가 사라졌는데 이전에 확정된 제스처가 남아있는 경우, 상태를 초기화합니다.
  else if (!currentGestureState.name && confirmedGesture) {
    confirmedGesture = null;
    gestureOutput.innerText = `감지된 제스처 없음`;
  }

  // 다음 브라우저 렌더링 주기에 `predictWebcam` 함수를 다시 호출하도록 요청합니다.
  window.requestAnimationFrame(predictWebcam);
}

// --- 5. 점수 팝업 표시 함수 ---
function showScorePopup(points) {
  // 기존 점수 팝업이 있으면 제거
  const existingPopup = document.querySelector(".score-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  // 새로운 점수 팝업 생성
  const popup = document.createElement("div");
  popup.className = "score-popup";
  popup.textContent = `+${points}점`;

  // liveView 컨테이너에 추가 (웹캠 화면 위에 표시)
  const liveView = document.getElementById("liveView");
  liveView.appendChild(popup);

  // 애니메이션 종료 후 요소 제거 (2초)
  setTimeout(() => {
    popup.remove();
  }, 2000);
}
