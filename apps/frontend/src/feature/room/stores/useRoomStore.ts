import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MediaType, ParticipantRole, UserJoinedPayload } from '@plum/shared-interfaces';
import { RtpCapabilities } from 'mediasoup-client/types';

export interface MyInfo {
  id: string;
  name: string;
  role?: ParticipantRole;
}

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  joinedAt: Date;
  producers: Map<MediaType, string>; // type -> producerId
}

interface RoomActions {
  setMyInfo: (info: MyInfo) => void;
  setRouterRtpCapabilities: (capabilities: RtpCapabilities) => void;

  initParticipants: (participantMap: Map<string, Participant>) => void;
  addParticipant: (data: UserJoinedPayload) => void;
  removeParticipant: (id: string) => void;
  addProducer: (participantId: string, type: MediaType, producerId: string) => void;
  removeProducer: (participantId: string, type: MediaType) => void;
  getParticipantList: () => Participant[];
  getParticipant: (id: string) => Participant | undefined;

  reset: () => void;
}

interface RoomState {
  // 내 정보
  myInfo: MyInfo | null;
  routerRtpCapabilities: RtpCapabilities | null;
  actions: RoomActions;

  // 참가자 목록
  participants: Map<string, Participant>; // id -> Participant
}

const initialState: Omit<RoomState, 'actions'> = {
  myInfo: null,
  routerRtpCapabilities: null,
  participants: new Map(),
};

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      ...initialState,
      actions: {
        setMyInfo: (info) => set({ myInfo: info }),
        setRouterRtpCapabilities: (capabilities) => set({ routerRtpCapabilities: capabilities }),

        /** 참가자 목록 초기화 */
        initParticipants: (participantMap: Map<string, Participant>) => {
          set({ participants: participantMap });
        },

        /** 참가자 추가 */
        addParticipant: (data) => {
          set((state) => {
            if (state.participants.has(data.id)) return state;

            const newParticipants = new Map(state.participants);
            newParticipants.set(data.id, {
              id: data.id,
              name: data.name,
              role: data.role as ParticipantRole,
              joinedAt: new Date(data.joinedAt),
              producers: new Map(),
            });
            return { participants: newParticipants };
          });
        },

        /** 참가자 정보 삭제 */
        removeParticipant: (participantId: string) => {
          set((state) => {
            const newParticipants = new Map(state.participants);
            newParticipants.delete(participantId);
            return { participants: newParticipants };
          });
        },

        /** 참가자 프로듀서 추가 */
        addProducer: (participantId: string, type: MediaType, producerId: string) => {
          set((state) => {
            const participant = state.participants.get(participantId);
            if (!participant) return state;

            // 참가자의 기존 프로듀서 맵을 복사하고 새로운 프로듀서를 추가
            const updatedProducers = new Map(participant.producers);
            updatedProducers.set(type, producerId);

            // 참가자 정보를 업데이트
            const newParticipants = new Map(state.participants);
            newParticipants.set(participantId, {
              ...participant,
              producers: updatedProducers,
            });

            return { participants: newParticipants };
          });
        },

        /** 참가자 프로듀서 삭제 */
        removeProducer: (participantId: string, type: MediaType) => {
          set((state) => {
            const participant = state.participants.get(participantId);
            if (!participant) return state;

            // 참가자의 기존 프로듀서 맵을 복사하고 해당 타입의 프로듀서를 삭제
            const updatedProducers = new Map(participant.producers);
            updatedProducers.delete(type);

            // 참가자 정보를 업데이트
            const newParticipants = new Map(state.participants);
            newParticipants.set(participantId, {
              ...participant,
              producers: updatedProducers,
            });

            return { participants: newParticipants };
          });
        },

        /** 참가자 목록 반환 */
        getParticipantList: () => {
          const participants = get().participants;
          return Array.from(participants.values());
        },

        /** 참가자 정보 반환 */
        getParticipant: (id: string) => {
          const participants = get().participants;
          return participants.get(id);
        },

        /** 스토어 초기화 */
        reset: () => set({ ...initialState, participants: new Map() }),
      },
    }),
    {
      name: 'room-my-info',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        myInfo: { id: state.myInfo?.id, name: state.myInfo?.name },
      }),
    },
  ),
);
