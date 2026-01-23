import { SidePanelHeader, SidePanelContent } from './SidePanel';

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  return (
    <>
      <SidePanelHeader
        title="채팅"
        onClose={onClose}
      />
      <SidePanelContent>
        <div>채팅 내용</div>
      </SidePanelContent>
    </>
  );
}
