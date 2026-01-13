import { EnterLectureForm } from '@/feature/enter-lecture/components/EnterLectureForm';
import { Footer } from '@/shared/components/Footer';
import { Header } from '@/shared/components/Header';
import { PageSubHeader } from '@/shared/components/PageSubHeader';

export function EnterLecture() {
  return (
    <>
      <Header />
      <main className="mx-auto my-12 w-full max-w-4xl flex-1 px-4">
        <PageSubHeader
          title="강의실 입장"
          description="강의실에 들어가기 위한 필수 정보를 입력해주세요."
        />
        <EnterLectureForm />
      </main>
      <Footer />
    </>
  );
}
