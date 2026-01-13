import { SidePanelHeader, SidePanelContent } from './SidePanel';

interface InfoPanelProps {
  onClose: () => void;
}

export function InfoPanel({ onClose }: InfoPanelProps) {
  return (
    <>
      <SidePanelHeader
        title="강의 정보"
        onClose={onClose}
      />
      <SidePanelContent>
        <div>정보 내용</div>
      </SidePanelContent>
    </>
  );
}
