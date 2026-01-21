/**
 * Phase 1: 발표자 브라우저 로직
 * - 브라우저에서 직접 mediasoup-client + Socket.IO 사용
 * - Canvas로 fake video stream 생성
 * - AudioContext로 fake audio stream 생성
 * - Producer 생성 및 RTP 전송
 */

import { chromium, Page, Browser } from 'playwright';
import { RoomInfo, delay } from './utils';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class HostBrowser {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private roomInfo: RoomInfo | null = null;

  async launch(roomInfo: RoomInfo): Promise<void> {
    this.roomInfo = roomInfo;
    console.log(`🚀 발표자 브라우저 시작: ${roomInfo.roomId}`);

    this.browser = await chromium.launch({
      headless: true,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    });
    this.page = await this.browser.newPage();

    // 브라우저 콘솔 로그 캡처
    this.page.on('console', (msg) => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // 실제 프론트엔드 페이지 로드 (CORS 문제 없음)
    const frontendUrl = `https://web12-plum-dev.vercel.app/enter/${roomInfo.roomId}`;
    console.log(`🌐 프론트엔드 페이지 로드: ${frontendUrl}`);
    await this.page.goto(frontendUrl, { waitUntil: 'networkidle' });

    // 페이지가 로드될 때까지 대기
    await delay(2000);

    console.log(`✅ 발표자 프론트엔드 페이지 로드 완료`);

    // Socket.IO 연결 확인 (프론트엔드에서 자동으로 연결됨)
    await this.waitForSocketConnection();
  }

  /**
   * 페이지가 완전히 로드되고 상호작용 가능할 때까지 대기
   */
  private async waitForSocketConnection(): Promise<void> {
    console.log(`🔌 프론트엔드 앱 초기화 대기 중...`);

    // React 앱이 렌더링될 때까지 대기
    try {
      await this.page!.waitForSelector('button, input, video, canvas', { timeout: 10000 });
      console.log(`✅ 프론트엔드 앱 로드 완료`);
    } catch {
      console.error('프론트엔드 앱 로드 실패');
      throw new Error('프론트엔드 앱 로드 타임아웃');
    }

    // mediasoup-client 번들 주입
    const bundlePath = path.join(__dirname, '..', 'bundle-mediasoup.js');
    await this.page!.addScriptTag({ path: bundlePath });
    await delay(500);

    // Socket.IO 클라이언트 CDN 주입
    await this.page!.addScriptTag({
      url: 'https://cdn.socket.io/4.8.1/socket.io.min.js',
    });

    // mediasoup-client 로드 확인 및 수정
    const mediasoupExists = await this.page!.evaluate(() => {
      const ms = (window as any).mediasoupClient;
      if (ms?.default?.Device) {
        (window as any).mediasoupClient = ms.default;
        console.log('[Test] mediasoup-client 로드 완료');
        return true;
      }
      return ms && ms.Device;
    });

    if (!mediasoupExists) {
      throw new Error('mediasoup-client.Device가 없습니다');
    }

    // Socket.IO 연결 (프론트엔드 Origin으로 자동 연결됨)
    await this.connectSocket();
  }

  /**
   * Socket.IO 연결 (프론트엔드 페이지에서 허용된 Origin 사용)
   */
  private async connectSocket(): Promise<void> {
    console.log(`🔌 Socket.IO 연결 중...`);

    // URL에서 roomId 추출
    const roomId = await this.page!.evaluate(() => {
      const match = window.location.pathname.match(/\/enter\/(.+)/);
      return match ? match[1] : null;
    });

    if (!roomId) {
      throw new Error('URL에서 roomId를 찾을 수 없습니다');
    }

    // roomInfo는 launch 메서드에서 저장됨
    const participantId = this.roomInfo!.hostId;

    await this.page!.evaluate(
      async ({ roomId, participantId }) => {
        return new Promise<void>((resolve, reject) => {
          const socketUrl = 'https://tiki-plum.n-e.kr/session';
          const socket = (window as any).io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 3,
            timeout: 10000,
            path: '/socket.io',
          });

          socket.on('connect', () => {
            console.log('[Test] Socket 연결 성공:', socket.id);

            // join_room 이벤트 전송 (발표자로 입장)
            socket.emit('join_room', { roomId, participantId }, (response: any) => {
              console.log('[Test] join_room 응답:', response);
              if (response && response.success) {
                console.log('[Test] join_room 성공');
                (window as any).testSocket = socket;
                // join_room 응답에 포함된 RTP Capabilities 저장
                (window as any).rtpCapabilities = response.mediasoup.routerRtpCapabilities;
                console.log('[Test] RTP Capabilities 저장 완료');
                resolve();
              } else {
                reject(new Error('join_room 실패: ' + JSON.stringify(response)));
              }
            });
          });

          socket.on('connect_error', (error: Error) => {
            console.error('[Test] Socket 연결 실패:', error.message);
            reject(new Error('Socket 연결 실패: ' + error.message));
          });

          setTimeout(() => reject(new Error('Socket 연결 타임아웃')), 30000);
        });
      },
      { roomId, participantId },
    );

    console.log(`✅ Socket.IO 연결 및 join_room 완료`);
  }

  /**
   * Canvas + AudioContext로 fake stream 생성 (video + audio + screen)
   */
  async createFakeStream(): Promise<void> {
    console.log(`🎨 Fake stream 생성 중 (video, audio, screen)...`);

    await this.page!.evaluate(() => {
      // Canvas로 fake video (카메라)
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d')!;

      let hue = 0;
      setInterval(() => {
        hue = (hue + 10) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = 'white';
        ctx.font = '48px sans-serif';
        ctx.fillText(`Host Camera - ${Date.now()}`, 50, 240);
      }, 1000);

      const videoStream = canvas.captureStream(30);
      const videoTrack = videoStream.getVideoTracks()[0];

      // Canvas로 fake screen (화면공유)
      const screenCanvas = document.createElement('canvas');
      screenCanvas.width = 1920;
      screenCanvas.height = 1080;
      const screenCtx = screenCanvas.getContext('2d')!;

      let screenFrame = 0;
      setInterval(() => {
        screenFrame++;
        screenCtx.fillStyle = '#1a1a2e';
        screenCtx.fillRect(0, 0, 1920, 1080);
        screenCtx.fillStyle = '#16213e';
        screenCtx.fillRect(50, 50, 1820, 980);
        screenCtx.fillStyle = '#0f3460';
        screenCtx.fillRect(100, 100, 1720, 880);
        screenCtx.fillStyle = '#ffffff';
        screenCtx.font = '72px monospace';
        screenCtx.fillText('Screen Share - Slide ' + (screenFrame % 10), 200, 540);
        screenCtx.font = '36px sans-serif';
        screenCtx.fillText('PLUM Load Test - Frame ' + screenFrame, 200, 640);
      }, 1000);

      const screenStream = screenCanvas.captureStream(30);
      const screenTrack = screenStream.getVideoTracks()[0];

      // AudioContext로 fake audio
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const dest = audioCtx.createMediaStreamDestination();
      oscillator.connect(dest);
      oscillator.frequency.value = 440;
      oscillator.start();

      const audioTrack = dest.stream.getAudioTracks()[0];

      (window as any).fakeStream = new MediaStream([videoTrack, audioTrack]);
      (window as any).fakeScreenStream = new MediaStream([screenTrack]);
      console.log('Fake stream 생성 완료 (video, audio, screen)');
    });

    console.log(`✅ Fake stream 생성 완료 (video, audio, screen)`);
  }

  /**
   * mediasoup Producer 생성 (video + audio + screen)
   */
  async createProducers(): Promise<void> {
    console.log(`📡 mediasoup Producer 생성 중 (video, audio, screen)...`);

    await this.page!.evaluate(async () => {
      const socket = (window as any).testSocket;
      const mediasoupClient = (window as any).mediasoupClient;
      const stream = (window as any).fakeStream;
      const screenStream = (window as any).fakeScreenStream;

      if (!socket || !socket.connected) {
        throw new Error('Socket이 연결되지 않았습니다');
      }
      if (!mediasoupClient || !mediasoupClient.Device) {
        throw new Error('mediasoup-client가 로드되지 않았습니다');
      }
      if (!stream) {
        throw new Error('fakeStream이 생성되지 않았습니다');
      }
      if (!screenStream) {
        throw new Error('fakeScreenStream이 생성되지 않았습니다');
      }

      console.log('[Producer] 초기화 시작');

      // Device 생성
      const device = new mediasoupClient.Device();
      console.log('[Producer] Device 생성 완료');

      // join_room 응답에서 저장한 RTP Capabilities 사용
      const rtpCapabilities = (window as any).rtpCapabilities;
      if (!rtpCapabilities) {
        throw new Error('RTP Capabilities가 저장되지 않았습니다');
      }
      console.log('[Producer] RTP Capabilities 로드 중...');

      await device.load({ routerRtpCapabilities: rtpCapabilities });
      console.log('[Producer] Device 로드 완료');

      // Send Transport 생성
      console.log('[Producer] create_transport 요청 중...');
      const transportInfo = await new Promise((resolve, reject) => {
        socket.emit('create_transport', { type: 'send' }, (response: any) => {
          console.log('[Producer] create_transport 응답:', response);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      const sendTransport = device.createSendTransport(transportInfo);

      sendTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
        try {
          console.log('[Producer] connect_transport 요청 중...');
          socket.emit(
            'connect_transport',
            {
              transportId: sendTransport.id,
              dtlsParameters,
            },
            (response: any) => {
              console.log('[Producer] connect_transport 응답:', response);
              if (response.error) {
                errback(new Error(response.error));
              } else {
                callback();
              }
            },
          );
        } catch (error) {
          errback(error);
        }
      });

      sendTransport.on(
        'produce',
        async ({ kind, rtpParameters, appData }: any, callback: any, errback: any) => {
          try {
            console.log('[Producer] produce 요청 중... kind:', kind, 'appData:', appData);
            socket.emit(
              'produce',
              {
                transportId: sendTransport.id,
                kind,
                rtpParameters,
                appData,
              },
              (response: any) => {
                console.log('[Producer] produce 응답:', response);
                if (response.error) {
                  errback(new Error(response.error));
                } else {
                  callback({ id: response.id });
                }
              },
            );
          } catch (error) {
            errback(error);
          }
        },
      );

      // Video Producer 생성 (카메라)
      const videoTrack = stream.getVideoTracks()[0];
      const videoProducer = await sendTransport.produce({
        track: videoTrack,
        encodings: [{ maxBitrate: 100000 }, { maxBitrate: 300000 }, { maxBitrate: 900000 }],
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
      });
      console.log(`[Producer] video 생성 완료: ${videoProducer.id}`);

      // Audio Producer 생성 (마이크)
      const audioTrack = stream.getAudioTracks()[0];
      const audioProducer = await sendTransport.produce({
        track: audioTrack,
      });
      console.log(`[Producer] audio 생성 완료: ${audioProducer.id}`);

      // Screen Producer 생성 (화면공유)
      const screenTrack = screenStream.getVideoTracks()[0];
      const screenProducer = await sendTransport.produce({
        track: screenTrack,
        encodings: [{ maxBitrate: 2000000 }], // 2Mbps
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
        appData: { share: true }, // 화면공유 플래그
      });
      console.log(`[Producer] screen 생성 완료: ${screenProducer.id}`);

      (window as any).device = device;
      (window as any).sendTransport = sendTransport;
      (window as any).videoProducer = videoProducer;
      (window as any).audioProducer = audioProducer;
      (window as any).screenProducer = screenProducer;

      console.log(
        `Producer 생성 완료: video=${videoProducer.id}, audio=${audioProducer.id}, screen=${screenProducer.id}`,
      );
    });

    console.log(`✅ mediasoup Producer 생성 완료 (video, audio, screen)`);
  }

  /**
   * 연결 유지
   */
  async maintain(durationMs: number): Promise<void> {
    console.log(`⏳ 발표자 연결 유지 (${durationMs / 1000}초)...`);
    await delay(durationMs);
    console.log(`✅ 발표자 연결 유지 완료`);
  }

  /**
   * 리소스 정리
   */
  async cleanup(): Promise<void> {
    console.log(`🧹 발표자 리소스 정리 중...`);

    if (this.page) {
      await this.page.close();
    }

    if (this.browser) {
      await this.browser.close();
    }

    console.log(`✅ 발표자 리소스 정리 완료`);
  }
}
