import { AnimatePresence } from 'motion/react';
import { SidePanel } from './SidePanel';
import { ChatPanel } from './ChatPanel';
import { InfoPanel } from './InfoPanel';
import { MenuPanel } from './MenuPanel';
import { SidePanel as SidePanelType } from '../stores/useRoomUIStore';
import { cn } from '@/shared/lib/utils';

interface RoomSideSectionProps {
  activeSidePanel: SidePanelType | null;
  onClosePanel: (panel: SidePanelType) => void;
}

export function RoomSideSection({ activeSidePanel, onClosePanel }: RoomSideSectionProps) {
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
            {activeSidePanel === 'info' && <InfoPanel onClose={() => onClosePanel('info')} />}
            {activeSidePanel === 'menu' && <MenuPanel onClose={() => onClosePanel('menu')} />}
          </SidePanel>
        )}
      </AnimatePresence>
    </div>
  );
}
