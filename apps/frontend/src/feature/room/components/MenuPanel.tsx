import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { SidePanelHeader, SidePanelContent } from './SidePanel';

type SubPage = 'breakroom' | 'vote' | 'qna' | 'material' | 'participant';

const menuItems: { id: SubPage; label: string; description: string }[] = [
  { id: 'breakroom', label: '소강의실 관리', description: '소강의실 생성 및 관리' },
  { id: 'vote', label: '투표 관리', description: '투표 생성 및 관리' },
  { id: 'qna', label: 'Q&A 관리', description: 'Q&A 생성 및 관리' },
  { id: 'material', label: '발표 자료 관리', description: '발표 자료 업로드 및 삭제' },
  { id: 'participant', label: '참가자 관리', description: '참가자 권한 관리 및 강퇴' },
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
            <div>
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  onClick={() => handlePushSubPage(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          )}
          {subPage === 'breakroom' && <div>소강의실</div>}
          {subPage === 'vote' && <div>투표 관리</div>}
          {subPage === 'qna' && <div>Q&A 관리</div>}
          {subPage === 'material' && <div>발표 자료 관리</div>}
          {subPage === 'participant' && <div>참가자 관리</div>}
        </div>
      </SidePanelContent>
    </>
  );
}
