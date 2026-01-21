import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { EnterLectureForm } from '@/feature/enter-lecture/components/EnterLectureForm';
import { Footer } from '@/shared/components/Footer';
import { Header } from '@/shared/components/Header';
import { PageSubHeader } from '@/shared/components/PageSubHeader';
import { ROUTES } from '@/app/routes/routes';
import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';

export function EnterLecture() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  const [lectureName, setLectureName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const fetchRoomName = async () => {
      if (!roomId) {
        navigate(ROUTES.NOT_FOUND, { replace: true });
        return;
      }

      setIsLoading(true);
      try {
        const response = await roomApi.validateRoom(roomId);
        if (!isActive) return;
        setLectureName(response.data.name);
      } catch (error) {
        logger.api.error(`강의실 이름 조회 실패: ${error}`);
        if (isActive) {
          navigate(ROUTES.NOT_FOUND, { replace: true });
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    fetchRoomName();

    return () => {
      isActive = false;
    };
  }, [navigate, roomId]);

  if (isLoading || !roomId) {
    return null;
  }

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
