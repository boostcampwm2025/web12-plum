import { AnimatePresence } from 'motion/react';
import { SidePanel } from './SidePanel';
import { ChatPanel } from './ChatPanel';
import { InfoPanel } from './InfoPanel';
import { MenuPanel } from './MenuPanel';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { cn } from '@/shared/lib/utils';

export function RoomSideSection() {
  const activeSidePanel = useRoomUIStore((state) => state.activeSidePanel);
  const setActiveSidePanel = useRoomUIStore((state) => state.setActiveSidePanel);

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
            {activeSidePanel === 'chat' && <ChatPanel onClose={() => setActiveSidePanel('chat')} />}
            {activeSidePanel === 'info' && <InfoPanel onClose={() => setActiveSidePanel('info')} />}
            {activeSidePanel === 'menu' && <MenuPanel onClose={() => setActiveSidePanel('menu')} />}
          </SidePanel>
        )}
      </AnimatePresence>
    </div>
  );
}
