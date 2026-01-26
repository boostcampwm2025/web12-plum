import { Footer } from '@/shared/components/Footer';
import { Header } from '@/shared/components/Header';
import { PageSubHeader } from '@/shared/components/PageSubHeader';

import { CreateLectureForm } from '@/feature/create-lecture/components/CreateLectureForm';

export const CreateLecture = () => {
  return (
    <div className="flex min-h-screen flex-col bg-gray-500">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 md:px-12 lg:px-24">
        <PageSubHeader
          title="강의 생성"
          description="설정을 완료하고 새로운 강의실을 생성하세요."
        />
        <CreateLectureForm />
      </main>
      <Footer />
    </div>
  );
};
