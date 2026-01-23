import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { EnterLectureForm } from '@/feature/enter-lecture/components/EnterLectureForm';
import { Footer } from '@/shared/components/Footer';
import { Header } from '@/shared/components/Header';
import { PageSubHeader } from '@/shared/components/PageSubHeader';
import { ROUTES } from '@/app/routes/routes';
import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';
import { Loading } from '@/shared/components/Loading';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';
import { useToastStore } from '@/store/useToastStore';

/**
 * 강의실 입장 페이지 컴포넌트
 *
 * useSafeRoomId 훅을 사용하여 유효한 roomId를 가져옴
 * 하위 컴포넌트들에서는 roomId에 대한 처리를 신경쓰지 않아도 됨
 */
export function EnterLecture() {
  const navigate = useNavigate();
  const roomId = useSafeRoomId();

  const [lectureName, setLectureName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const { addToast } = useToastStore((state) => state.actions);

  useEffect(() => {
    if (!roomId) return;
    let isActive = true;

    // 강의실 이름 조회
    const fetchRoomName = async () => {
      setIsLoading(true);
      try {
        const response = await roomApi.validateRoom(roomId);

        if (!isActive) return;
        setLectureName(response.data.name);
        setIsLoading(false);
      } catch (error) {
        logger.api.error(`강의실 이름 조회 실패: ${error}`);

        if (!isActive) return;
        addToast({ type: 'error', title: '유효하지 않은 강의실입니다.' });
        navigate(ROUTES.HOME, { replace: true });
      }
    };

    fetchRoomName();

    return () => {
      isActive = false;
    };
  }, [roomId, navigate, addToast]);

  if (!roomId) return null;
  if (isLoading) return <Loading />;

  return (
    <>
      <Header />
      <main className="mx-auto my-12 w-full max-w-4xl flex-1 px-4">
        <PageSubHeader
          title="강의실 입장"
          description="강의실에 들어가기 위한 필수 정보를 입력해주세요."
        />
        <EnterLectureForm
          roomId={roomId}
          lectureName={lectureName}
        />
      </main>
      <Footer />
    </>
  );
}
