import { Routes, Route } from 'react-router';
import { Home } from './pages/Home';
import { EnterLecture } from './pages/EnterLecture';
import { CreateLecture } from './pages/CreateLecture';
import { NotFound } from './pages/NotFound';
import Room from './pages/Room';
import { ROUTES } from './app/routes/routes';

function App() {
  return (
    <div className="flex h-full flex-col">
      <Routes>
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
          path={ROUTES.ROOM()}
          element={<Room />}
        />
        <Route
          path={ROUTES.ROOM_SUMMARY()}
          element={<div />}
        />
        <Route
          path={ROUTES.NOT_FOUND}
          element={<NotFound />}
        />
      </Routes>
    </div>
  );
}

export default App;
