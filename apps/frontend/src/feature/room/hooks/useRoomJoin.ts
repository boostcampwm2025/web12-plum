import { useCallback } from 'react';
import { RtpCapabilities } from 'mediasoup-client/types';

import { logger } from '@/shared/lib/logger';

import { RoomService } from '../services/room';
import { useRoomStore } from '../stores/useRoomStore';

/**
 * 방 입장 로직을 담당하는 훅
 *
 * 서버에 입장 요청을 보내고 초기 데이터를 Zustand 스토어에 저장
 *
 * ## 주요 역할
 * - 서버에 join-room 요청 전송
 * - 응답으로 받은 참가자 정보, 기존 Producer 목록 등을 스토어에 저장
 * - mediasoup Device 초기화에 필요한 RTP Capabilities 반환
 *
 * ## 사용 시점
 * - 방 입장 시에 가장 먼저 호출
 * - 성공 시 반환된 RtpCapabilities로 Device 초기화 진행
 */
export function useRoomJoin() {
  const roomActions = useRoomStore((state) => state.actions);

  /**
   * 방 입장 및 초기 데이터 설정
   *
   * 1. 서버에 join-room 요청 전송
   * 2. 응답 데이터를 Zustand 스토어에 저장:
   *    - myInfo: 내 참가자 정보 (id, name, role)
   *    - participants: 기존 참가자 목록
   *    - existingProducers: 기존 참가자들의 Producer 정보 (나중에 consume 시 사용)
   * 3. RTP Capabilities 반환 (Device 초기화에 필요)
   *
   * @param roomId 입장할 방 ID
   * @param myId 내 참가자 ID (인증 토큰에서 추출)
   * @returns mediasoup Router의 RTP Capabilities
   * @throws 방 입장 실패 시 에러 발생
   */
  const joinRoom = useCallback(
    async (roomId: string, myId: string): Promise<RtpCapabilities> => {
      try {
        // 방 입장 요청
        const response = await RoomService.joinRoom({ roomId, participantId: myId });
        const { mediasoup, participants, participantId, participantName, role } = response;

        // Zustand 스토어에 초기 데이터 설정
        roomActions.initializeRoomData({
          myInfo: { id: participantId ?? myId, name: participantName, role: role },
          participants,
          existingProducers: mediasoup.existingProducers,
        });

        return mediasoup.routerRtpCapabilities as RtpCapabilities;
      } catch (error) {
        logger.custom.error('[useRoomJoin] 방 입장 요청 실패', error);
        throw error;
      }
    },
    [roomActions],
  );

  return { joinRoom };
}
