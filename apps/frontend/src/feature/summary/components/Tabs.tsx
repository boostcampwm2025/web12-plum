import { Button } from '@/shared/components/Button';

import { Tab, TABS } from '../constants';

interface TabsProps {
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
}

/**
 * 탭 컴포넌트
 * @param activeTab 현재 활성화된 탭 키
 * @param onChangeTab 탭 변경 시 호출되는 콜백 함수
 */
export function Tabs({ activeTab, onChangeTab }: TabsProps) {
  return (
    <div className="mt-12 grid grid-cols-4 gap-4">
      {TABS.map(({ key, label }) => (
        <Button
          key={key}
          className={`font-bold ${activeTab === key ? 'bg-primary' : 'bg-gray-300'}`}
          onClick={() => onChangeTab(key)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
