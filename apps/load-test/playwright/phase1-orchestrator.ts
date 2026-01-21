/**
 * Phase 1: WebRTC 전체 플로우 부하테스트 오케스트레이터
 * - 발표자 1명 + 청중 60명 제어
 * - 프론트엔드 없이 Playwright + mediasoup-client CDN 사용
 */

import { HostBrowser } from './phase1-host';
import { ParticipantBrowser } from './phase1-participant';
import { createRoom, joinAsParticipant, delay } from './utils';

const PARTICIPANT_COUNT = 60;
const MAINTAIN_DURATION = 2 * 60 * 1000; // 2분

async function main() {
  console.log('='.repeat(80));
  console.log('Phase 1: WebRTC 전체 플로우 부하테스트 시작');
  console.log(`발표자 1명 + 청중 ${PARTICIPANT_COUNT}명`);
  console.log('='.repeat(80));

  // 1. 강의실 생성
  console.log('\n[1/7] 강의실 생성 중...');
  const roomInfo = await createRoom();
  console.log(`✅ 강의실 생성 완료: ${roomInfo.roomId}`);

  // 2. 발표자 브라우저 시작
  console.log('\n[2/7] 발표자 브라우저 시작 중...');
  const host = new HostBrowser();
  await host.launch(roomInfo);
  await host.createFakeStream();
  console.log('✅ 발표자 준비 완료');

  // 3. 발표자 Producer 생성
  console.log('\n[3/7] 발표자 Producer 생성 중...');
  await host.createProducers();
  console.log('✅ 발표자 Producer 생성 완료');

  // Producer 생성 후 대기 (서버 안정화)
  await delay(2000);

  // 4. 청중 등록 및 브라우저 시작
  console.log(`\n[4/7] 청중 ${PARTICIPANT_COUNT}명 등록 및 브라우저 시작 중...`);
  const participants: ParticipantBrowser[] = [];
  const participantInfos: any[] = [];

  for (let i = 0; i < PARTICIPANT_COUNT; i++) {
    const nickname = `User-${i + 1}`;
    const participantInfo = await joinAsParticipant(roomInfo.roomId, roomInfo.roomName, nickname);
    participantInfos.push(participantInfo);

    const participant = new ParticipantBrowser();
    participants.push(participant);

    await participant.launch(roomInfo, participantInfo);

    // 서버 부하 분산: 1초마다 1명씩 입장
    if (i < PARTICIPANT_COUNT - 1) {
      await delay(1000);
    }

    if ((i + 1) % 10 === 0) {
      console.log(`  진행: ${i + 1}/${PARTICIPANT_COUNT}명 준비 완료`);
    }
  }
  console.log(`✅ 청중 ${PARTICIPANT_COUNT}명 준비 완료`);

  // 5. 청중 Consumer 생성
  console.log(`\n[5/7] 청중 Consumer ${PARTICIPANT_COUNT}개 생성 중...`);
  for (let i = 0; i < PARTICIPANT_COUNT; i++) {
    await participants[i].createConsumers();

    // 서버 부하 분산: 100ms마다 1명씩
    if (i < PARTICIPANT_COUNT - 1) {
      await delay(100);
    }

    if ((i + 1) % 10 === 0) {
      console.log(`  진행: ${i + 1}/${PARTICIPANT_COUNT}개 Consumer 생성 완료`);
    }
  }
  console.log('✅ 청중 Consumer 생성 완료');

  // 6. 연결 유지 (10분)
  console.log(`\n[6/7] 연결 유지 중 (${MAINTAIN_DURATION / 60000}분)...`);
  console.log('📊 Grafana에서 서버 메트릭 확인: http://211.188.50.8:3000');
  console.log('   - CPU 사용률');
  console.log('   - 메모리 사용률');
  console.log('   - mediasoup Worker 부하');
  console.log('   - RTP 패킷 처리량');
  console.log('   - Socket.IO 연결 수');

  await Promise.all([
    host.maintain(MAINTAIN_DURATION),
    ...participants.map((p) => p.maintain(MAINTAIN_DURATION)),
  ]);

  console.log('✅ 연결 유지 완료');

  // 7. 리소스 정리
  console.log('\n[7/7] 리소스 정리 중...');

  await host.cleanup();

  for (let i = 0; i < PARTICIPANT_COUNT; i++) {
    await participants[i].cleanup();

    if ((i + 1) % 10 === 0) {
      console.log(`  진행: ${i + 1}/${PARTICIPANT_COUNT}개 브라우저 종료 완료`);
    }
  }

  console.log('✅ 리소스 정리 완료');

  console.log('\n' + '='.repeat(80));
  console.log('Phase 1: WebRTC 전체 플로우 부하테스트 완료');
  console.log('='.repeat(80));
}

// 실행
main().catch((error) => {
  console.error('❌ 테스트 실패:', error);
  process.exit(1);
});
