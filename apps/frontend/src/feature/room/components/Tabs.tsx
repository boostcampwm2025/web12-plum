import { createContext, ReactNode, useContext } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/shared/lib/utils';

export type TabValue = 'scheduled' | 'active' | 'completed';

const tabLabels: Record<TabValue, string> = {
  scheduled: '예정',
  active: '진행중',
  completed: '완료',
};

export interface TabItem {
  value: TabValue;
  count: number;
}

interface TabsContextValue {
  activeValue: TabValue;
  setActiveValue: (value: TabValue) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within Tabs.');
  }
  return context;
}

interface TabsProps {
  value: TabValue;
  onChange: (value: TabValue) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ activeValue: value, setActiveValue: onChange }}>
      <div className={cn('flex h-full flex-col gap-6 px-4', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  tabs: TabItem[];
  className?: string;
}

export function TabsList({ tabs, className }: TabsListProps) {
  const { activeValue, setActiveValue } = useTabsContext();

  return (
    <div
      role="tablist"
      aria-label="투표 상태 탭"
      className={cn('relative flex border-b-2 border-gray-200', className)}
    >
      {tabs.map((tab) => {
        const isActive = activeValue === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveValue(tab.value)}
            className={cn(
              'relative flex flex-1 cursor-pointer items-center justify-center gap-2 pt-2 pb-3 text-sm font-semibold transition-colors',
              isActive ? 'text-primary' : 'text-subtext hover:text-primary',
            )}
          >
            <span>{tabLabels[tab.value]}</span>
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold',
                isActive ? 'bg-primary/20 text-primary' : 'text-subtext bg-gray-400',
              )}
            >
              {tab.count}
            </span>
            {isActive && (
              <motion.div
                layoutId="tabs-underline"
                className="bg-primary absolute -bottom-0.5 left-0 h-0.5 w-full"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface TabContentProps {
  value: TabValue;
  children: ReactNode;
  className?: string;
}

export function TabContent({ value, children, className }: TabContentProps) {
  const { activeValue } = useTabsContext();

  if (activeValue !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      className={cn('flex min-h-0 flex-1', className)}
    >
      {children}
    </div>
  );
}
