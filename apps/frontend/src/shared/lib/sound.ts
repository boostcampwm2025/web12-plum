import popMp3 from '@/assets/sounds/pop.mp3';

import { useSoundStore } from '@/shared/stores/useSoundStore';

const SOUND_SOURCES = {
  pop: popMp3,
} as const;

export type SoundId = keyof typeof SOUND_SOURCES;

const audioById: Partial<Record<SoundId, HTMLAudioElement>> = {};
const lastPlayedAt: Partial<Record<SoundId, number>> = {};

const DEFAULT_COOLDOWN_MS = 300;
const DEFAULT_VOLUME = 0.6;

export function playSound(
  id: SoundId,
  options?: {
    volume?: number;
    cooldownMs?: number;
  },
) {
  if (!useSoundStore.getState().isSoundEnabled) return;
  const now = Date.now();
  const cooldownMs = options?.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const lastPlayed = lastPlayedAt[id] ?? 0;
  if (now - lastPlayed < cooldownMs) return;
  lastPlayedAt[id] = now;

  let audio = audioById[id];
  if (!audio) {
    audio = new Audio(SOUND_SOURCES[id]);
    audioById[id] = audio;
  }

  audio.volume = options?.volume ?? DEFAULT_VOLUME;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
