import { useNavigate } from 'react-router';
import { Footer } from '@/shared/components/Footer';
import { Header } from '@/shared/components/Header';
import { PageSubHeader } from '@/shared/components/PageSubHeader';
import { ROUTES } from '@/app/routes/routes';

import { CreateLectureForm } from '@/feature/create-lecture/components/CreateLectureForm';

export const CreateLecture = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <main className="mx-auto my-12 w-full max-w-4xl flex-1 px-4">
        <PageSubHeader
          title="강의 생성"
          description="설정을 완료하고 새로운 강의실을 생성하세요."
        />
        <CreateLectureForm
          onCreateSuccess={({ roomId, host, mediasoup }) => {
            navigate(ROUTES.ROOM(roomId), {
              state: {
                participantId: host.id,
                name: host.name,
                role: host.role,
                mediasoup,
              },
            });
          }}
        />
      </main>
      <Footer />
    </>
  );
};
