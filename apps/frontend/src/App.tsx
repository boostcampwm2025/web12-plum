import { Routes, Route, Outlet } from 'react-router';
import { Home } from './pages/Home';
import { EnterLecture } from './pages/EnterLecture';
import { CreateLecture } from './pages/CreateLecture';
import { NotFound } from './pages/NotFound';
import Room from './pages/Room';
import { ROUTES } from './app/routes/routes';
import { ToastStack } from './shared/components/ToastStack';

/**
 * TODO: ToastStack를 전역으로 수정하기 전, 임시로 Layout 컴포넌트 생성
 */
function ToastLayout() {
  return (
    <>
      <ToastStack />
      <Outlet />
    </>
  );
}

function App() {
  return (
    <div className="flex h-full flex-col">
      <Routes>
        <Route element={<ToastLayout />}>
          <Route
            path={ROUTES.HOME}
            element={<Home />}
          />
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
            element={<div />}
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
      </Routes>
    </div>
  );
}

export default App;
