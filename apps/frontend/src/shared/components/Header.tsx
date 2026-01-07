import { Link } from 'react-router';

import { ROUTES } from '@/app/routes/routes';

import logoImg from '@/assets/logo/logo.svg';

/**
 * 헤더 컴포넌트
 * @returns 헤더 JSX 요소
 */
export const Header = () => {
  return (
    <header className="mx-auto w-full max-w-7xl px-4 pt-5">
      <Link
        to={ROUTES.HOME}
        className="grid h-25.25 w-fit place-items-center"
        aria-label="홈으로 이동"
      >
        <img
          src={logoImg}
          alt="Plum Logo"
          width={137}
          height={101}
        />
        <h1 className="sr-only">Plum</h1>
      </Link>
    </header>
  );
};
