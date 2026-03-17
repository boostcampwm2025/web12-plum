import type {
  MediaType,
  ParticipantPayload,
  ParticipantRole,
  UserJoinedPayload,
} from '@plum/shared-interfaces';
import { RtpCapabilities } from 'mediasoup-client/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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

export interface RoomActions {
  setMyInfo: (info: MyInfo) => void;
  setRoomTitle: (title: string) => void;
  setRouterRtpCapabilities: (capabilities: RtpCapabilities) => void;
  setRoomEnded: (isEnded: boolean) => void;
  setParticipantAudioMuted: (participantId: string, isMuted: boolean) => void;
  initializeRoomData: (data: {
    myInfo: MyInfo;
    participants: ParticipantPayload[];
    existingProducers: { participantId: string; type: MediaType; producerId: string }[];
  }) => void;
  initParticipants: (participantMap: Map<string, Participant>) => void;
  addParticipant: (data: UserJoinedPayload) => void;
  removeParticipant: (id: string) => void;
  addProducer: (participantId: string, type: MediaType, producerId: string) => void;
  removeProducer: (participantId: string, type: MediaType) => void;
  getParticipantList: () => Participant[];
  getParticipant: (id: string) => Participant | undefined;
  findProducerInfo: (producerId: string) => {
    participantId: string | null;
    type: MediaType | null;
  };
  addSpeakerToOrder: (participantId: string) => void;
  setActiveSpeaker: (participantId: string, ttlMs: number) => void;

  reset: () => void;
}

interface RoomState {
  // 내 정보
  myInfo: MyInfo | null;
  roomTitle: string | null;
  routerRtpCapabilities: RtpCapabilities | null;
  isRoomEnded: boolean;
  actions: RoomActions;

  // 참가자 목록
  participants: Map<string, Participant>; // id -> Participant
  participantAudioMuted: Map<string, boolean>; // id -> muted

  // 발화자 정렬 순서 (participantId 배열, 먼저 말한 사람이 앞)
  speakerOrder: string[];
  activeSpeakerIds: Set<string>;
}

const initialState: Omit<RoomState, 'actions'> = {
  myInfo: null,
  roomTitle: null,
  routerRtpCapabilities: null,
  isRoomEnded: false,
  participants: new Map(),
  participantAudioMuted: new Map(),
  speakerOrder: [],
  activeSpeakerIds: new Set(),
};

const activeSpeakerTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const speakerOrderTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

// 발화 종료 후 speakerOrder에서 제거되기까지의 시간 (ms)
const SPEAKER_ORDER_TTL_MS = 20000;

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      ...initialState,
      actions: {
        setMyInfo: (info) => set({ myInfo: info }),
        setRoomTitle: (title) => set({ roomTitle: title }),
        setRouterRtpCapabilities: (capabilities) => set({ routerRtpCapabilities: capabilities }),
        setRoomEnded: (isEnded) => set({ isRoomEnded: isEnded }),
        setParticipantAudioMuted: (participantId, isMuted) => {
          set((state) => {
            const current = state.participantAudioMuted.get(participantId);
            if (current === isMuted) return state;
            const next = new Map(state.participantAudioMuted);
            next.set(participantId, isMuted);
            return { participantAudioMuted: next };
          });
        },

        /** 참가자 목록 초기화 */
        initParticipants: (participantMap: Map<string, Participant>) => {
          set({ participants: participantMap });
        },

        /**
         * 방 데이터 초기화
         * @param data.myInfo 내 참가자 정보
         * @param data.participants 전체 참가자 목록
         * @param data.existingProducers 기존 프로듀서(미디어) 정보
         */
        initializeRoomData: ({ myInfo, participants, existingProducers }) => {
          const participantMap = new Map<string, Participant>();
          const audioMutedMap = new Map<string, boolean>();

          // 전체 참가자 기본 정보 로드
          participants.forEach((participant) => {
            // 내 정보는 제외
            if (participant.id === myInfo.id) return;

            participantMap.set(participant.id, {
              ...participant,
              role: participant.role as ParticipantRole,
              joinedAt: new Date(participant.joinedAt),
              producers: new Map(),
            });
          });

          // 기존 프로듀서(미디어) 정보 연결
          existingProducers.forEach((existingProducer) => {
            const participant = participantMap.get(existingProducer.participantId);
            if (participant) {
              participant.producers.set(existingProducer.type, existingProducer.producerId);
              if (existingProducer.type === 'audio') {
                audioMutedMap.set(existingProducer.participantId, false);
              }
            }
          });

          set({ myInfo, participants: participantMap, participantAudioMuted: audioMutedMap });
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

            // 새 참가자는 기본적으로 음소거 상태 (audio producer 추가 시 해제됨)
            const nextAudioMuted = new Map(state.participantAudioMuted);
            nextAudioMuted.set(data.id, true);

            return { participants: newParticipants, participantAudioMuted: nextAudioMuted };
          });
        },

        /** 참가자 정보 삭제 */
        removeParticipant: (participantId: string) => {
          set((state) => {
            const newParticipants = new Map(state.participants);
            newParticipants.delete(participantId);
            const nextAudioMuted = new Map(state.participantAudioMuted);
            nextAudioMuted.delete(participantId);
            const newSpeakerOrder = state.speakerOrder.filter((id) => id !== participantId);
            const nextActiveSpeakerIds = new Set(state.activeSpeakerIds);
            nextActiveSpeakerIds.delete(participantId);

            const existingActiveSpeakerTimeout = activeSpeakerTimeouts.get(participantId);
            if (existingActiveSpeakerTimeout) {
              clearTimeout(existingActiveSpeakerTimeout);
              activeSpeakerTimeouts.delete(participantId);
            }

            const existingSpeakerOrderTimeout = speakerOrderTimeouts.get(participantId);
            if (existingSpeakerOrderTimeout) {
              clearTimeout(existingSpeakerOrderTimeout);
              speakerOrderTimeouts.delete(participantId);
            }

            return {
              participants: newParticipants,
              participantAudioMuted: nextAudioMuted,
              speakerOrder: newSpeakerOrder,
              activeSpeakerIds: nextActiveSpeakerIds,
            };
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

            const nextAudioMuted = new Map(state.participantAudioMuted);
            if (type === 'audio') {
              nextAudioMuted.set(participantId, false);
            }

            return { participants: newParticipants, participantAudioMuted: nextAudioMuted };
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

            const nextAudioMuted = new Map(state.participantAudioMuted);
            if (type === 'audio') {
              nextAudioMuted.set(participantId, true);
            }

            return { participants: newParticipants, participantAudioMuted: nextAudioMuted };
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

        /** Producer ID로 정보 찾기 */
        findProducerInfo: (producerId: string) => {
          const participants = get().participants;
          for (const [participantId, participant] of participants) {
            for (const [type, pId] of participant.producers) {
              if (pId === producerId) {
                return { participantId, type };
              }
            }
          }
          return { participantId: null, type: null };
        },

        /** 발화자를 정렬 순서에 추가 (이미 있으면 제거 타이머만 취소) */
        addSpeakerToOrder: (participantId: string) => {
          // 제거 타이머가 있으면 취소 (발화 재개)
          const existingOrderTimeout = speakerOrderTimeouts.get(participantId);
          if (existingOrderTimeout) {
            clearTimeout(existingOrderTimeout);
            speakerOrderTimeouts.delete(participantId);
          }

          set((state) => {
            if (state.speakerOrder.includes(participantId)) {
              // 이미 있으면 위치 유지
              return state;
            }
            // 새로운 발화자는 맨 앞에 추가
            return { speakerOrder: [participantId, ...state.speakerOrder] };
          });
        },

        /** 현재 발화자 표시 (TTL 후 자동 해제 + speakerOrder 제거 타이머 시작) */
        setActiveSpeaker: (participantId: string, ttlMs: number) => {
          const existingTimeout = activeSpeakerTimeouts.get(participantId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          set((state) => {
            const nextActiveSpeakerIds = new Set(state.activeSpeakerIds);
            nextActiveSpeakerIds.add(participantId);
            return { activeSpeakerIds: nextActiveSpeakerIds };
          });

          const timeout = setTimeout(() => {
            activeSpeakerTimeouts.delete(participantId);
            set((state) => {
              const nextActiveSpeakerIds = new Set(state.activeSpeakerIds);
              nextActiveSpeakerIds.delete(participantId);
              return { activeSpeakerIds: nextActiveSpeakerIds };
            });

            // 발화 종료 후 speakerOrder 제거 타이머 시작
            const orderTimeout = setTimeout(() => {
              speakerOrderTimeouts.delete(participantId);
              set((state) => {
                const newSpeakerOrder = state.speakerOrder.filter((id) => id !== participantId);
                return { speakerOrder: newSpeakerOrder };
              });
            }, SPEAKER_ORDER_TTL_MS);

            speakerOrderTimeouts.set(participantId, orderTimeout);
          }, ttlMs);

          activeSpeakerTimeouts.set(participantId, timeout);
        },

        /** 스토어 초기화 */
        reset: () =>
          set(() => {
            for (const timeout of activeSpeakerTimeouts.values()) {
              clearTimeout(timeout);
            }
            activeSpeakerTimeouts.clear();

            for (const timeout of speakerOrderTimeouts.values()) {
              clearTimeout(timeout);
            }
            speakerOrderTimeouts.clear();

            return {
              ...initialState,
              participants: new Map(),
              participantAudioMuted: new Map(),
              speakerOrder: [],
              activeSpeakerIds: new Set(),
            };
          }),
      },
    }),
    {
      name: 'room-my-info',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        myInfo: { id: state.myInfo?.id, name: state.myInfo?.name },
        roomTitle: state.roomTitle,
      }),
    },
  ),
);
