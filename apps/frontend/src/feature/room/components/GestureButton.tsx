import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RoomButton } from './RoomButton';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import type { GestureType } from '@plum/shared-interfaces';
import { useBroadcastGestureHandler } from '../hooks/useBroadcastGesture';
import { GESTURE_ICON_MAP } from '@/shared/constants/gesture';

const GESTURE_OPTIONS: { type: GestureType; label: string }[] = [
  { type: 'thumbs_up', label: '좋아요' },
  { type: 'thumbs_down', label: '싫어요' },
  { type: 'hand_raise', label: '손들기' },
  { type: 'ok_sign', label: 'OK' },
  { type: 'o_sign', label: 'O' },
  { type: 'x_sign', label: 'X' },
];

export function GestureButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { handle } = useBroadcastGestureHandler();

  const handleGestureClick = (gestureType: GestureType) => {
    handle(gestureType);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <RoomButton
        icon="hand-raise"
        tooltip="제스처"
        isActive={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      />
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-100"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-1/2 z-110 mb-4 -translate-x-1/2"
            >
              <div className="flex items-center gap-1 rounded-lg bg-gray-300 p-1.5 shadow-lg">
                {GESTURE_OPTIONS.map((gesture) => (
                  <Button
                    key={gesture.type}
                    variant="icon"
                    tooltip={gesture.label}
                    onClick={() => handleGestureClick(gesture.type)}
                  >
                    <Icon
                      name={GESTURE_ICON_MAP[gesture.type]}
                      size={20}
                    />
                  </Button>
                ))}
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-300" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
