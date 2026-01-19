import { AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router';
import { SidePanel } from './SidePanel';
import { ChatPanel } from './ChatPanel';
import { InfoPanel } from './InfoPanel';
import { MenuPanel } from './MenuPanel';
import { SidePanel as SidePanelType } from '../stores/useRoomUIStore';
import { cn } from '@/shared/lib/utils';
import { buildJoinLink } from '@/shared/lib/roomLinks';

interface RoomSideSectionProps {
  activeSidePanel: SidePanelType | null;
  onClosePanel: (panel: SidePanelType) => void;
}

// mock 데이터
const mockFileList = Array.from({ length: 5 }, (_, i) => ({ name: `파일_${i + 1}.pdf`, url: '#' }));

export function RoomSideSection({ activeSidePanel, onClosePanel }: RoomSideSectionProps) {
  const location = useLocation();
  const joinLink = buildJoinLink(location.pathname, window.location.origin);

  return (
    <div
      className={cn(
        'relative transition-[width] duration-300 ease-in-out',
        activeSidePanel ? 'w-94' : 'w-0',
      )}
    >
      <AnimatePresence>
        {activeSidePanel && (
          <SidePanel>
            {activeSidePanel === 'chat' && <ChatPanel onClose={() => onClosePanel('chat')} />}
            {activeSidePanel === 'info' && (
              <InfoPanel
                joinLink={joinLink}
                files={mockFileList}
                onClose={() => onClosePanel('info')}
              />
            )}
            {activeSidePanel === 'menu' && <MenuPanel onClose={() => onClosePanel('menu')} />}
          </SidePanel>
        )}
      </AnimatePresence>
    </div>
  );
}
