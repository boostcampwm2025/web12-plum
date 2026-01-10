import { Modal } from '@/shared/components/Modal';
import { PollOptionListSection } from './PollOptionListSection';
import { usePollOptions } from '../hooks/usePollOptions';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 투표 생성 모달 컴포넌트
 * @param isOpen 모달 열림 상태
 * @param onClose 모달 닫기 핸들러
 */
export const CreatePollModal = ({ isOpen, onClose }: CreatePollModalProps) => {
  const { options, addOption, deleteOption, updateOption, canAddMore, canDelete } =
    usePollOptions();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-181.5"
    >
      <PollOptionListSection
        options={options}
        onAddOption={addOption}
        onDeleteOption={deleteOption}
        onUpdateOption={updateOption}
        canAddMore={canAddMore}
        canDelete={canDelete}
      />
    </Modal>
  );
};
