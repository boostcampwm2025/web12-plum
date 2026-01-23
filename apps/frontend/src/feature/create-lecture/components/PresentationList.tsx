import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { usePresentation } from '@/shared/hooks/usePresentation';
import { CreateRoomRequest } from '@plum/shared-interfaces';
import { LECTURE_FORM_KEYS } from '../schema';

/**
 * 파일 크기를 읽기 쉬운 형태로 변환
 * @param bytes 파일 크기 (바이트)
 * @returns 포맷된 파일 크기 문자열 (예: "1.5 MB")
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formattedSize = `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;

  return formattedSize;
}

interface PresentationItemProps {
  file: File;
  onDelete: () => void;
}

/**
 * 업로드된 파일 리스트 아이템 컴포넌트
 * @param file 파일 객체
 * @param onDelete 삭제 핸들러
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

/**
 * 강의 발표자료 파일 리스트 컴포넌트
 */
export function PresentationList() {
  const filedName = LECTURE_FORM_KEYS.presentationFiles;
  const { presentationFiles, removeFile } = usePresentation<CreateRoomRequest>({ filedName });

  if (presentationFiles.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {presentationFiles.map((field, index) => (
        <PresentationItem
          key={field.id}
          file={field}
          onDelete={() => removeFile(index)}
        />
      ))}
    </ul>
  );
}
