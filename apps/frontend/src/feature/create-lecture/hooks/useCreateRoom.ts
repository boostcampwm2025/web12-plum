import { useState } from 'react';
import type { CreateRoomRequest, CreateRoomResponse } from '@plum/shared-interfaces';
import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';
import { useRoomStore } from '@/feature/room/stores/useRoomStore';
import { useMediaStore } from '@/feature/room/stores/useMediaStore';

interface UseCreateRoomReturn {
  createRoom: (data: CreateRoomRequest) => Promise<CreateRoomResponse>;
  isSubmitting: boolean;
}

/**
 * 강의실 생성 비즈니스 로직 관리 훅
 *
 * 새로운 강의실을 생성하기 위한 API 통신을 수행하고,
 * 생성 성공 후 진입할 강의실 환경의 초기 상태를 설정
 * API 응답 대기 상태를 관리하여 UI에서 중복 제출을 방지할 수 있도록 지원
 *
 * 1. UI 컴포넌트에서 `createRoom` 호출 시 `isSubmitting` 상태를 true로 변경하여 프로세스 시작 알림.
 * 2. `roomApi.createRoom`을 통해 서버에 강의실 생성 요청 전송.
 * 3. 요청 성공 시:
 *   - 서버에서 받은 호스트 정보를 `useRoomStore`에 저장.
 *   - 강의실 제목 및 미디어(카메라, 마이크) 초기 상태 설정.
 * 4. 요청 실패 시: 에러 로그를 기록하고 상위 호출부로 에러를 전파(throw)하여 예외 처리 위임.
 * 5. 최종 성공/실패 여부와 관계없이 `isSubmitting`을 false로 리셋하여 작업 종료.
 */
export function useCreateRoom(): UseCreateRoomReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setMyInfo, setRoomTitle } = useRoomStore((state) => state.actions);
  const { initialize: initializeMedia } = useMediaStore((state) => state.actions);

  /**
   * 실제 강의실 생성 프로세스 처리 함수
   * @param data - API 전송을 위한 강의실 생성 요청 데이터
   * @returns 생성된 강의실 정보를 담은 응답 객체
   */
  const createRoom = async (data: CreateRoomRequest) => {
    setIsSubmitting(true);

    try {
      const response = await roomApi.createRoom(data);
      const roomData = response.data;
      logger.api.info('강의실 생성 성공:', roomData);

      setMyInfo(roomData.host);
      setRoomTitle(data.name);
      initializeMedia(false, false);
      return roomData;
    } catch (error) {
      logger.api.error(`강의실 생성 실패: ${error}`);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    createRoom,
    isSubmitting,
  };
}
