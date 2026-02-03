import { useBackgroundEffectLegacy } from './useBackgroundEffectLegacy';
import { useBackgroundEffectPipeline } from './useBackgroundEffectPipeline';

export function useBackgroundEffect() {
  const pipeline = useBackgroundEffectPipeline();
  const legacy = useBackgroundEffectLegacy();

  if (pipeline.supported) {
    return { start: pipeline.start, stop: pipeline.stop };
  }

  return { start: legacy.start, stop: legacy.stop };
}
