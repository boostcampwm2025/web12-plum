/**
 * 로딩 컴포넌트
 */
export function Loading() {
  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-gray-500 backdrop-blur-sm">
      <div className="border-t-primary border-subtext h-12 w-12 animate-spin rounded-full border-4" />
    </div>
  );
}
