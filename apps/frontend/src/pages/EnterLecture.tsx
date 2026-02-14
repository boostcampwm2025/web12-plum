import { EnterLectureForm } from '@/feature/enter-lecture/components/EnterLectureForm';
import { useLectureRoomInfo } from '@/feature/enter-lecture/hooks/useLectureRoomInfo';
import { Footer } from '@/shared/components/Footer';
import { Header } from '@/shared/components/Header';
import { PageSubHeader } from '@/shared/components/PageSubHeader';
import { Loading } from '@/shared/components/Loading';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';
import { useNavigate } from 'react-router';
import { useToastStore } from '@/store/useToastStore';
import { useEffect } from 'react';
import { ROUTES } from '@/app/routes/routes';

/**
 * 강의실 입장 페이지 컴포넌트
 *
 * - useSafeRoomId 훅을 사용하여 유효한 roomId를 가져오고,
 * - useLectureRoomInfo 훅으로 강의실 존재 여부를 검증
 * - 하위 컴포넌트들에서는 roomId에 대한 처리를 신경쓰지 않아도 됨
 * - 에러 발생 시 이 컴포넌트에서 토스트 노출 및 메인 페이지로 리다이렉트 처리
 */
export function EnterLecture() {
  const roomId = useSafeRoomId();
  const navigate = useNavigate();

  const { addToast } = useToastStore((state) => state.actions);
  const { lectureName, isLoading, error } = useLectureRoomInfo(roomId);

  useEffect(() => {
    if (!error || !roomId) return;

    addToast({ type: 'error', title: error });
    navigate(ROUTES.HOME, { replace: true });
  }, [error, roomId, addToast, navigate]);

  if (!roomId) return null;
  if (isLoading) return <Loading />;

  return (
    <div className="flex min-h-screen flex-col bg-gray-500">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 md:px-12 lg:px-24">
        <PageSubHeader
          title="강의실 입장"
          description="강의실에 들어가기 위한 필수 정보를 입력해주세요."
        />
        <EnterLectureForm lectureName={lectureName} />
      </main>
      <Footer />
    </div>
  );
}
