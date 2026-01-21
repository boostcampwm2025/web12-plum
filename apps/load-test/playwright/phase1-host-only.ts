/**
 * Phase 1: 발표자 전용 테스트
 * - 발표자 1명만 Playwright로 실행
 * - 청중은 Artillery로 실행 (별도 명령어 필요)
 *
 * 실행 방법:
 * 1. 터미널 1: pnpm phase1:host  (이 파일 실행)
 * 2. 터미널 2: pnpm phase1:audience  (Artillery 청중 60명)
 */

import { HostBrowser } from './phase1-host';
import { createRoom, delay } from './utils';

const MAINTAIN_DURATION = 5 * 60 * 1000; // 5분 (청중 입장 1분 + 유지 2분 + 여유 2분)

async function main() {
  console.log('='.repeat(80));
  console.log('Phase 1: 발표자 전용 테스트');
  console.log('발표자 1명 (Producer 생성)');
  console.log('='.repeat(80));

  // 1. 강의실 생성
  console.log('\n[1/4] 강의실 생성 중...');
  const roomInfo = await createRoom();
  console.log(`✅ 강의실 생성 완료`);
  console.log(`   Room ID: ${roomInfo.roomId}`);
  console.log(`   Room Name: ${roomInfo.roomName}`);

  // 2. 발표자 브라우저 시작
  console.log('\n[2/4] 발표자 브라우저 시작 중...');
  const host = new HostBrowser();
  await host.launch(roomInfo);
  await host.createFakeStream();
  console.log('✅ 발표자 준비 완료 (Canvas 영상/음성 생성)');

  // 3. 발표자 Producer 생성
  console.log('\n[3/4] 발표자 Producer 생성 중...');
  await host.createProducers();
  console.log('✅ 발표자 Producer 생성 완료 (video, audio)');

  // Producer 생성 후 대기
  await delay(3000);

  console.log('\n' + '='.repeat(80));
  console.log('✅ 발표자 준비 완료!');
  console.log('='.repeat(80));
  console.log('');
  console.log('💡 다음 단계:');
  console.log('   새로운 터미널을 열고 아래 명령어를 실행하세요:');
  console.log('');
  console.log('   cd apps/load-test');
  console.log('   pnpm phase1:audience');
  console.log('');
  console.log('='.repeat(80));

  // 4. 연결 유지
  console.log(`\n[4/4] 연결 유지 중 (${MAINTAIN_DURATION / 60000}분)...`);
  console.log('📊 Grafana 확인: http://211.188.50.8:3000');
  console.log('   - mediasoup Worker CPU');
  console.log('   - Producer 개수: 2개');
  console.log('   - Consumer 개수: Artillery 실행 시 증가');

  await host.maintain(MAINTAIN_DURATION);

  console.log('✅ 연결 유지 완료');

  // 5. 리소스 정리
  console.log('\n리소스 정리 중...');
  await host.cleanup();
  console.log('✅ 발표자 브라우저 종료 완료');

  console.log('\n' + '='.repeat(80));
  console.log('Phase 1: 발표자 테스트 완료');
  console.log('='.repeat(80));
}

// 실행
main().catch((error) => {
  console.error('❌ 테스트 실패:', error);
  process.exit(1);
});
