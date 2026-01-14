import { useNavigate } from 'react-router';
import { Footer } from '@/shared/components/Footer';
import { Header } from '@/shared/components/Header';
import { Button } from '@/shared/components/Button';
import { ROUTES } from '@/app/routes/routes';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <main className="mx-auto my-12 flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-8 px-4">
        <div className="text-center">
          <h1 className="text-text mb-4 text-6xl font-bold">404</h1>
          <h2 className="text-text mb-4 text-2xl font-bold">페이지를 찾을 수 없습니다</h2>
          <p className="text-subtext-light text-lg">
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>
        </div>

        <Button onClick={() => navigate(ROUTES.HOME)}>홈으로 돌아가기</Button>
      </main>
      <Footer />
    </>
  );
}
