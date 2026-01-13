import { useNavigate } from 'react-router';
import { Footer } from '@/shared/components/Footer';
import { Header } from '@/shared/components/Header';
import { Button } from '@/shared/components/Button';
import { ROUTES } from '@/app/routes/routes';

export function Home() {
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <main className="mx-auto my-12 flex h-max w-full max-w-4xl flex-1 flex-col items-center justify-center gap-8 px-4">
        <div className="text-center">
          <h1 className="text-text mb-4 text-4xl font-bold">PLUM에 오신 것을 환영합니다</h1>
          <p className="text-subtext-light text-lg">강의를 생성하거나 기존 강의실에 입장하세요.</p>
        </div>

        <div className="flex gap-4">
          <Button onClick={() => navigate(ROUTES.CREATE)}>강의 생성하기</Button>
          <Button onClick={() => navigate(ROUTES.ENTER('0'))}>강의실 입장하기</Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
