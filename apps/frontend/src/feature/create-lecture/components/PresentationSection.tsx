import { usePresentation } from '@/shared/hooks/usePresentation';
import { useToastStore } from '@/shared/stores/useToastStore';
import { CreateRoomRequest } from '@plum/shared-interfaces';
import { LECTURE_FORM_KEYS } from '../schema';
import { FormField } from '@/shared/components/FormField';

import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { formatFileSize } from '@/shared/lib/presentations';
import { PresentationUploader } from './PresentationUploader';

interface PresentationItemProps {
  file: File;
  onDelete: () => void;
}

/**
 * 업로드된 파일 리스트 아이템 컴포넌트
 *
 * 개별 파일의 이름과 용량을 표시하며, 해당 파일을 목록에서 제거할 수 있는 삭제 액션 제공
 *
 * 1. 부모(`PresentationList`)로부터 파일 객체와 삭제 핸들러를 전달받음.
 * 2. 파일 시스템의 `File` 객체에서 이름과 사이즈를 추출하여 렌더링.
 * 3. 사용자가 삭제 버튼 클릭 시 `onDelete` 콜백을 호출하여 부모의 상태 업데이트 유도.
 */
function PresentationItem({ file, onDelete }: PresentationItemProps) {
  return (
    <li className="flex items-center gap-4 rounded-xl bg-gray-400 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p className="text-text truncate text-base font-extrabold">{file.name}</p>
        <p className="text-subtext-light text-xs font-normal">{formatFileSize(file.size)}</p>
      </div>

      <Button
        variant="icon"
        onClick={onDelete}
        aria-label="파일 삭제"
      >
        <Icon
          name="trash"
          size={20}
          strokeWidth={2}
          className="text-subtext-light"
          decorative
        />
      </Button>
    </li>
  );
}

interface PresentationListProps {
  files: File[];
  onDelete: (index: number) => void;
}

/**
 * 강의 발표자료 파일 리스트 컴포넌트
 *
 * 업로드된 파일들의 목록을 관리하고 화면에 리스트 형태로 출력
 * 파일이 존재하지 않을 경우 불필요한 영역을 차지하지 않도록 null을 반환
 *
 * 1. `files` 배열을 순회하며 각 파일 데이터에 맞는 `PresentationItem`을 생성.
 * 2. 각 아이템에 고유한 `key`와 해당 인덱스 기반의 `onDelete` 함수를 주입.
 */
export function PresentationList({ files, onDelete }: PresentationListProps) {
  if (files.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {files.map((file, index) => (
        <PresentationItem
          key={`${file.name}-${file.size}`}
          file={file}
          onDelete={() => onDelete(index)}
        />
      ))}
    </ul>
  );
}

/**
 * 발표 자료 업로더 섹션 컴포넌트
 *
 * 강의 생성 시 필요한 발표 자료 파일을 업로드하고 관리하는 인터페이스를 제공
 * 커스텀 훅(`usePresentation`)을 통해 파일 상태를 React Hook Form과 동기화하며, 사용자에게 처리 결과를 토스트로 알림
 *
 * 1. 사용자가 `PresentationUploader`를 통해 파일을 선택하거나 드롭함.
 * 2. `addFile`이 호출되어 `presentationFiles` 상태에 새 파일 객체가 추가되고 폼 필드 값이 업데이트됨.
 * 3. 업데이트된 파일 목록이 `PresentationList`를 통해 실시간으로 화면에 렌더링됨.
 * 4. 사용자가 삭제 버튼을 누르면 `handleDelete`가 실행되어 상태에서 제거되고 성공 토스트가 표시됨.
 */
export function PresentationSection() {
  const { addToast } = useToastStore((state) => state.actions);
  const { presentationFiles, addFile, removeFile } = usePresentation<CreateRoomRequest>({
    fieldName: LECTURE_FORM_KEYS.presentationFiles,
  });

  /**
   * 파일 삭제 핸들러
   * 인덱스를 기반으로 파일을 제거하고 사용자에게 토스트 알림을 표시
   */
  const handleDelete = (index: number) => {
    removeFile(index);
    addToast({ type: 'success', title: '파일이 성공적으로 삭제되었습니다.' });
  };

  return (
    <FormField className="gap-3">
      <FormField.Legend className="mb-3 text-xl font-bold">발표 자료</FormField.Legend>
      <PresentationUploader addFile={addFile} />
      <PresentationList
        files={presentationFiles}
        onDelete={handleDelete}
      />
    </FormField>
  );
}
