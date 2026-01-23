import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import type { IconName } from '@/shared/components/icon/iconMap';
import { SidePanelHeader, SidePanelContent } from './SidePanel';
import { PollManagementTabs } from './PollManagementTabs';
import { QnaManagementTabs } from './QnaManagementTabs';

type SubPage = 'breakroom' | 'vote' | 'qna' | 'material' | 'participant';

const menuItems: { id: SubPage; label: string; description: string; icon: IconName }[] = [
  {
    id: 'breakroom',
    label: '소강의실 관리',
    description: '소강의실 생성 및 관리',
    icon: 'breakdown-room',
  },
  { id: 'vote', label: '투표 관리', description: '투표 생성 및 관리', icon: 'vote' },
  { id: 'qna', label: 'Q&A 관리', description: 'Q&A 생성 및 관리', icon: 'qna' },
  {
    id: 'material',
    label: '발표 자료 관리',
    description: '발표 자료 업로드 및 삭제',
    icon: 'download',
  },
  {
    id: 'participant',
    label: '참가자 관리',
    description: '참가자 권한 관리 및 강퇴',
    icon: 'users',
  },
];

interface MenuPanelProps {
  onClose: () => void;
}

const subPageLabelById = Object.fromEntries(
  menuItems.map((item) => [item.id, item.label]),
) as Record<SubPage, string>;

export function MenuPanel({ onClose }: MenuPanelProps) {
  const [subPage, setSubPage] = useState<SubPage | null>(null);

  const handlePushSubPage = (page: SubPage) => {
    setSubPage(page);
  };

  const handlePopSubPage = () => {
    setSubPage(null);
  };

  return (
    <>
      <SidePanelHeader
        title={subPage ? subPageLabelById[subPage] : '메뉴'}
        onClose={onClose}
        onBack={subPage ? handlePopSubPage : undefined}
      />
      <SidePanelContent>
        <div className="relative h-full w-full overflow-hidden">
          {!subPage && (
            <div className="flex flex-col gap-3 px-4">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  className="flex items-center gap-4 rounded-2xl bg-gray-400"
                  onClick={() => handlePushSubPage(item.id)}
                >
                  <Icon
                    name={item.icon}
                    size={24}
                    decorative
                  />
                  <div className="flex flex-1 flex-col items-start gap-1 text-left">
                    <h3 className="text-text font-bold">{item.label}</h3>
                    <p className="text-subtext-light text-xs font-normal">{item.description}</p>
                  </div>
                  <Icon
                    name="chevron"
                    size={24}
                    className="-rotate-90 text-white"
                    decorative
                  />
                </Button>
              ))}
            </div>
          )}
          {subPage === 'breakroom' && <div>소강의실</div>}
          {subPage === 'vote' && <PollManagementTabs />}
          {subPage === 'qna' && <QnaManagementTabs />}
          {subPage === 'material' && <div>발표 자료 관리</div>}
          {subPage === 'participant' && <div>참가자 관리</div>}
        </div>
      </SidePanelContent>
    </>
  );
}
