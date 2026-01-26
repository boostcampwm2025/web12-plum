import { Link } from 'react-router';

import { ROUTES } from '@/app/routes/routes';

import logoImg from '@/assets/logo/logo.svg';

/**
 * 헤더 컴포넌트
 * @returns 헤더 JSX 요소
 */
export function Header() {
  return (
    <header className="w-full px-6 pt-5 md:px-12 lg:px-24">
      <div className="mx-auto w-full max-w-7xl">
        <Link
          to={ROUTES.HOME}
          className="grid h-20 w-fit place-items-center md:h-24"
          aria-label="홈으로 이동"
        >
          <img
            src={logoImg}
            alt="Plum Logo"
            width={137}
            height={101}
            className="h-14 w-auto md:h-16"
          />
          <h1 className="sr-only">Plum</h1>
        </Link>
      </div>
    </header>
  );
}
