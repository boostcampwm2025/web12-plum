import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { formatFileSize } from '@/shared/lib/presentations';

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

interface PresentationListProps {
  files: File[];
  onDelete: (index: number) => void;
}

/**
 * 강의 발표자료 파일 리스트 컴포넌트
 */
export function PresentationList({ files, onDelete }: PresentationListProps) {
  if (files.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {files.map((file, index) => (
        <PresentationItem
          key={file.name}
          file={file}
          onDelete={() => onDelete(index)}
        />
      ))}
    </ul>
  );
}
