import { Routes, Route, Outlet } from 'react-router';
import { useEffect, useState } from 'react';
import { Home } from './pages/Home';
import { EnterLecture } from './pages/EnterLecture';
import { CreateLecture } from './pages/CreateLecture';
import { NotFound } from './pages/NotFound';
import Room from './pages/Room';
import { ROUTES } from './app/routes/routes';
import { ToastStack } from './shared/components/ToastStack';
import { Summary } from './pages/Summary';

/**
 * TODO: ToastStack를 전역으로 수정하기 전, 임시로 Layout 컴포넌트 생성
 */
function ToastLayout() {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ToastStack />
      </div>
      <Outlet />
    </>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateMatch = () => setIsMobile(mediaQuery.matches);

    updateMatch();
    mediaQuery.addEventListener('change', updateMatch);

    return () => {
      mediaQuery.removeEventListener('change', updateMatch);
    };
  }, []);

  return isMobile;
}

function MobileBlocked() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-gray-600 px-6 text-center">
      <h1 className="text-text text-2xl font-bold">모바일 환경은 지원하지 않습니다</h1>
      <p className="text-subtext max-w-md">
        데스크톱 환경에서 접속해주세요. 모바일에서는 강의실 기능이 제한됩니다.
      </p>
    </main>
  );
}

function MobileGate() {
  const isMobile = useIsMobile();

  if (isMobile) return <MobileBlocked />;
  return <Outlet />;
}

function App() {
  return (
    <div className="flex h-full flex-col">
      <Routes>
        <Route
          path={ROUTES.HOME}
          element={<Home />}
        />
        <Route element={<MobileGate />}>
          <Route element={<ToastLayout />}>
            <Route
              path={ROUTES.CREATE}
              element={<CreateLecture />}
            />
            <Route
              path={ROUTES.ENTER()}
              element={<EnterLecture />}
            />
            <Route
              path={ROUTES.ROOM_SUMMARY()}
              element={<Summary />}
            />
            <Route
              path={ROUTES.NOT_FOUND}
              element={<NotFound />}
            />
          </Route>

          <Route
            path={ROUTES.ROOM()}
            element={<Room />}
          />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
