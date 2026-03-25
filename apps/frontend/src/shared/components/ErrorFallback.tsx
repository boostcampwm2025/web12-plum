import { useNavigate } from 'react-router';

import { ROUTES } from '@/app/routes/routes';

import { Button } from './Button';

interface ErrorFallbackProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorFallback({
  title = '문제가 발생했어요',
  description = '잠시 후 다시 시도해주세요.',
  onRetry,
}: ErrorFallbackProps) {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-xs rounded-2xl bg-gray-400 p-8 text-center shadow-lg">
        <div className="mb-4 text-3xl">⚠️</div>
        <h2 className="text-text mb-2 text-xl font-bold">{title}</h2>
        <p className="text-subtext-light mb-6 text-sm">{description}</p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate(ROUTES.HOME)}
            className="border border-gray-300 px-4 py-2 text-sm"
          >
            메인으로
          </Button>
          {onRetry && (
            <Button
              onClick={onRetry}
              className="px-4 py-2 text-sm"
            >
              다시 시도
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
