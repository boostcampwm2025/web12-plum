/**
 * Phase 1: 청중 브라우저 로직
 * - 브라우저에서 직접 mediasoup-client + Socket.IO 사용
 * - Consumer 생성 및 미디어 수신
 */

import { chromium, Page, Browser } from 'playwright';
import { RoomInfo, ParticipantInfo, delay, FRONTEND_URL, BACKEND_URL } from './utils';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ParticipantBrowser {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private roomInfo: RoomInfo | null = null;
  private participantInfo: ParticipantInfo | null = null;

  async launch(roomInfo: RoomInfo, participantInfo: ParticipantInfo): Promise<void> {
    this.roomInfo = roomInfo;
    this.participantInfo = participantInfo;
    console.log(`🚀 청중 브라우저 시작: ${participantInfo.name}`);

    this.browser = await chromium.launch({
      headless: true,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    });
    this.page = await this.browser.newPage();

    // 브라우저 콘솔 로그 캡처
    this.page.on('console', (msg) => {
      console.log(`[${participantInfo.name}] ${msg.type()}: ${msg.text()}`);
    });

    // 실제 프론트엔드 페이지 로드
    const frontendUrl = `${FRONTEND_URL}/enter/${roomInfo.roomId}`;
    await this.page.goto(frontendUrl, { waitUntil: 'networkidle' });
    await delay(2000);

    console.log(`✅ ${participantInfo.name} 프론트엔드 페이지 로드 완료`);

    // Socket.IO 연결
    await this.connectSocket();
  }

  /**
   * Socket.IO 연결 및 join_room
   */
  private async connectSocket(): Promise<void> {
    console.log(`🔌 ${this.participantInfo!.name} Socket.IO 연결 중...`);

    // React 앱 로드 대기
    try {
      await this.page!.waitForSelector('button, input, video, canvas', { timeout: 10000 });
    } catch {
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

    // mediasoup-client 로드 확인
    const mediasoupExists = await this.page!.evaluate(() => {
      const ms = (window as any).mediasoupClient;
      if (ms?.default?.Device) {
        (window as any).mediasoupClient = ms.default;
        return true;
      }
      return ms && ms.Device;
    });

    if (!mediasoupExists) {
      throw new Error('mediasoup-client.Device가 없습니다');
    }

    const roomId = this.roomInfo!.roomId;
    const participantId = this.participantInfo!.participantId;
    const participantName = this.participantInfo!.name;

    await this.page!.evaluate(
      async (args: {
        roomId: string;
        participantId: string;
        participantName: string;
        backendUrl: string;
      }) => {
        const { roomId, participantId, participantName, backendUrl } = args;
        return new Promise<void>((resolve, reject) => {
          const socket = (window as any).io(backendUrl, {
            path: '/session/socket.io',
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 3,
            timeout: 10000,
          });

          socket.on('connect', () => {
            console.log(`[${participantName}] Socket 연결 성공:`, socket.id);

            socket.emit('join_room', { roomId, participantId }, (response: any) => {
              if (response && response.success) {
                console.log(`[${participantName}] join_room 성공`);
                console.log(
                  `[${participantName}] response.mediasoup:`,
                  JSON.stringify(response.mediasoup, null, 2).slice(0, 1000),
                );
                (window as any).testSocket = socket;
                (window as any).rtpCapabilities = response.mediasoup.routerRtpCapabilities;
                (window as any).existingProducers = response.mediasoup.existingProducers || [];
                console.log(
                  `[${participantName}] 기존 Producer 수: ${(window as any).existingProducers.length}`,
                );
                resolve();
              } else {
                reject(new Error('join_room 실패: ' + JSON.stringify(response)));
              }
            });
          });

          socket.on('connect_error', (error: Error) => {
            reject(new Error('Socket 연결 실패: ' + error.message));
          });

          setTimeout(() => reject(new Error('Socket 연결 타임아웃')), 30000);
        });
      },
      { roomId, participantId, participantName, backendUrl: BACKEND_URL },
    );

    console.log(`✅ ${this.participantInfo!.name} Socket.IO 연결 및 join_room 완료`);
  }

  /**
   * Consumer 생성 (발표자의 미디어 수신)
   */
  async createConsumers(): Promise<void> {
    console.log(`📡 ${this.participantInfo!.name} Consumer 생성 중...`);

    const participantName = this.participantInfo!.name;

    const consumerCount = await this.page!.evaluate(
      async ({ participantName }) => {
        const socket = (window as any).testSocket;
        const mediasoupClient = (window as any).mediasoupClient;
        const rtpCapabilities = (window as any).rtpCapabilities;
        const existingProducers = (window as any).existingProducers;

        if (!socket || !socket.connected) {
          throw new Error('Socket이 연결되지 않았습니다');
        }
        if (!mediasoupClient || !mediasoupClient.Device) {
          throw new Error('mediasoup-client가 로드되지 않았습니다');
        }
        if (!existingProducers || existingProducers.length === 0) {
          console.log(`[${participantName}] 수신할 Producer가 없습니다`);
          return 0;
        }

        // Device 생성
        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        console.log(`[${participantName}] Device 로드 완료`);

        // Recv Transport 생성
        const transportInfo = await new Promise((resolve, reject) => {
          socket.emit('create_transport', { type: 'recv' }, (response: any) => {
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          });
        });

        const recvTransport = device.createRecvTransport(transportInfo);
        console.log(`[${participantName}] RecvTransport 생성 완료`);

        recvTransport.on(
          'connect',
          async ({ dtlsParameters }: any, callback: any, errback: any) => {
            try {
              socket.emit(
                'connect_transport',
                { transportId: recvTransport.id, dtlsParameters },
                (response: any) => {
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
          },
        );

        // 각 Producer에 대해 Consumer 생성
        const consumers: any[] = [];
        for (const producer of existingProducers) {
          try {
            const consumerData: any = await new Promise((resolve, reject) => {
              socket.emit(
                'consume',
                {
                  transportId: recvTransport.id,
                  producerId: producer.producerId,
                  rtpCapabilities: device.rtpCapabilities,
                },
                (response: any) => {
                  if (response.error) {
                    reject(new Error(response.error));
                  } else {
                    resolve(response);
                  }
                },
              );
            });

            const consumer = await recvTransport.consume({
              id: consumerData.consumerId, // id -> consumerId
              producerId: consumerData.producerId,
              kind: consumerData.kind,
              rtpParameters: consumerData.rtpParameters,
            });

            consumers.push(consumer);
            console.log(`[${participantName}] Consumer 생성: ${consumer.kind}`);

            // Consumer resume (서버 이벤트명: consume_resume)
            socket.emit('consume_resume', { consumerId: consumer.id });
          } catch (error: any) {
            console.error(`[${participantName}] Consumer 생성 실패:`, error.message);
          }
        }

        (window as any).device = device;
        (window as any).recvTransport = recvTransport;
        (window as any).consumers = consumers;

        return consumers.length;
      },
      { participantName },
    );

    console.log(`✅ ${this.participantInfo!.name} Consumer ${consumerCount}개 생성 완료`);
  }

  /**
   * 연결 유지
   */
  async maintain(durationMs: number): Promise<void> {
    await delay(durationMs);
  }

  /**
   * 리소스 정리
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}
