import { useController, useFormContext } from 'react-hook-form';
import { EnterLectureRequestBody } from '@plum/shared-interfaces';

import { cn } from '@/shared/lib/utils';
import { FormField } from '@/shared/components/FormField';
import { Icon } from '@/shared/components/icon/Icon';
import {
  BackgroundEffectMode,
  useBackgroundEffectStore,
} from '@/feature/media/stores/useBackgroundEffectStore';

import { ENTER_LECTURE_KEYS } from '../schema';
import { useLocalMediaController } from '../hooks/useLocalMediaController';

/**
 * 로컬 미디어 스트림 프리뷰 컴포넌트
 *
 * - useLocalMediaController 훅에서 제공하는 비디오 스트림을 video 요소에 렌더링
 * - 비디오가 꺼져 있을 때는 카메라 비활성 아이콘만 표시
 */
function LocalMediaPreview() {
  const { localVideoRef, isVideoOn } = useLocalMediaController();

  return (
    <div className="relative grid aspect-video max-w-130 flex-1 place-items-center rounded-lg bg-gray-400">
      <video
        ref={localVideoRef}
        autoPlay // 자동 재생
        muted // 자기 목소리 피드백 방지
        playsInline // iOS 사파리에서 전체화면 방지
        className={cn(
          'aspect-video w-full rounded-lg object-cover',
          isVideoOn ? 'opacity-100' : 'absolute inset-0 opacity-0',
        )}
      />

      {!isVideoOn && (
        <div className="flex h-full w-full items-center justify-center">
          <Icon
            name="cam-disabled"
            size={48}
            strokeWidth={2}
            className="text-text"
          />
        </div>
      )}
    </div>
  );
}

/**
 * 카메라 및 마이크 토글 필드
 *
 * - 폼 상태와 연동하여 마이크/카메라 활성화 여부를 제어하는 토글 UI 제공
 */
function MediaToggleField() {
  const { control } = useFormContext<EnterLectureRequestBody>();

  const audioField = useController({ name: ENTER_LECTURE_KEYS.isAudioOn, control });
  const videoField = useController({ name: ENTER_LECTURE_KEYS.isVideoOn, control });

  return (
    <>
      <FormField className="flex-row items-center gap-3">
        <FormField.Label>마이크</FormField.Label>
        <FormField.ToggleInput
          ref={audioField.field.ref}
          name={audioField.field.name}
          checked={audioField.field.value}
          onChange={(e) => audioField.field.onChange(e.target.checked)}
        />
      </FormField>

      <FormField className="flex-row items-center gap-3">
        <FormField.Label>카메라</FormField.Label>
        <FormField.ToggleInput
          ref={videoField.field.ref}
          name={videoField.field.name}
          checked={videoField.field.value}
          onChange={(e) => videoField.field.onChange(e.target.checked)}
        />
      </FormField>
    </>
  );
}

/**
 * 배경 효과 선택 드롭다운 필드
 *
 * - 블러, 플럼 배경, 처리 안함 중 배경 효과 모드를 선택하는 UI 제공
 * - 선택된 값은 useBackgroundEffectStore를 통해 전역 배경 효과 상태와 동기화
 */
function SelectBackgroundField() {
  const backgroundMode = useBackgroundEffectStore((state) => state.mode);
  const { setMode: setBackgroundMode } = useBackgroundEffectStore((state) => state.actions);

  return (
    <FormField className="flex-col gap-2">
      <FormField.Label>배경 효과</FormField.Label>
      {/*TODO: 드롭다운 컴포넌트 구현 후 적용 */}
      <select
        value={backgroundMode}
        onChange={(event) => setBackgroundMode(event.target.value as BackgroundEffectMode)}
        className="text-text w-full rounded-lg bg-gray-300 py-2 text-sm"
        aria-label="배경 효과 선택"
      >
        <option value="blur">블러</option>
        <option value="image">플럼 배경</option>
        <option value="off">처리 안함</option>
      </select>
    </FormField>
  );
}

/**
 * 카메라 및 마이크 확인 섹션
 *
 * 로컬 미디어 프리뷰, 마이크/카메라 토글, 배경 효과 선택을 합성하는 레이아웃 컴포넌트
 */
export function DeviceCheckSection() {
  return (
    <FormField className="gap-3">
      <FormField.Legend className="mb-3 text-xl font-bold">카메라 및 마이크 확인</FormField.Legend>
      <div className="flex items-center gap-2 rounded-lg border-2 border-gray-300 p-4">
        <LocalMediaPreview />

        <div className="mx-auto flex h-full flex-col justify-center gap-5">
          <MediaToggleField />
          <SelectBackgroundField />
        </div>
      </div>
    </FormField>
  );
}
