import { Link } from 'react-router';

import logoImg from '@/assets/logo/logo.svg';
import { ROUTES } from '@/app/routes/routes';

/**
 * 현재 연도 가져오기
 */
const currentYear = new Date().getFullYear();

/**
 * 사이트맵 링크 배열
 */
const SITEMAP_LINKS = [{ label: '강의 생성하기', to: ROUTES.CREATE }];

/**
 * 푸터 링크 배열
 */
const FOOTER_LINKS = [
  { label: '이용약관', link: [{ label: '개인정보 처리 방침', to: '#' }] },
  {
    label: 'Plum 소개',
    link: [
      { label: 'GitHub', to: 'https://github.com/boostcampwm2025/web12-plum' },
      { label: '기술 문서', to: 'https://github.com/boostcampwm2025/web12-plum/wiki' },
    ],
  },
];

type FooterLink = {
  label: string;
  to: string;
};

type FooterSection = {
  label: string;
  link: FooterLink[];
};

interface InternalLinkSectionProps {
  title: string;
  links: FooterLink[];
}

/**
 * 내부 링크 섹션 컴포넌트
 * @param title 섹션 제목
 * @param links 내부 링크 배열
 * @returns 내부 링크 섹션 JSX 요소
 */
function InternalLinkSection({ title, links }: InternalLinkSectionProps) {
  return (
    <div>
      <h4 className="text-primary text-center text-sm font-bold md:text-left">{title}</h4>
      <ul className="flex flex-col gap-1 md:items-start">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              to={link.to}
              className="text-subtext-light hover:text-subtext block text-center text-sm transition-all duration-200 md:text-left"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ExternalLinkSectionProps {
  section: FooterSection;
}

/**
 * 외부 링크 섹션 컴포넌트
 * @param section 푸터 섹션 데이터
 * @returns 외부 링크 섹션 JSX 요소
 */
function ExternalLinkSection({ section }: ExternalLinkSectionProps) {
  return (
    <div className="mb-3">
      <h4 className="text-primary text-center text-sm font-bold md:text-left">{section.label}</h4>
      <ul className="flex flex-col gap-1 md:items-start">
        {section.link.map((item) => (
          <li key={item.label}>
            <a
              href={item.to}
              target="_blank"
              rel="noopener noreferrer"
              className="text-subtext-light hover:text-subtext block text-center text-sm transition-all duration-200 md:text-left"
            >
              {item.label}
              <span className="sr-only"> (새 창에서 열림)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 푸터 컴포넌트
 * @returns 푸터 JSX 요소
 */
export function Footer() {
  return (
    <footer className="bg-gray-400 px-6 py-16 md:px-12 md:py-20 lg:px-24">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-10 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 text-center md:text-left">
          <img
            src={logoImg}
            alt="Plum Logo"
            width={86}
            height={60}
            className="mx-auto h-12 w-auto md:mx-0 md:h-15"
          />
          <p className="text-text mt-1 text-xl font-bold">강의는 놀이처럼, 성과는 전문가처럼!</p>
          <p className="text-subtext-light mt-3 text-sm">
            Copyright ⓒ {currentYear} Plum All rights reserved.
          </p>
          <p className="text-subtext-light mt-2 text-xs">
            Designed by{' '}
            <a
              href="https://www.freepik.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Freepik
              <span className="sr-only"> (새 창에서 열림)</span>
            </a>
          </p>
        </div>

        <nav
          className="grid w-full gap-6 text-center sm:grid-cols-2 md:w-auto md:grid-cols-3 md:text-left"
          aria-label="푸터 네비게이션"
        >
          <InternalLinkSection
            title="사이트맵"
            links={SITEMAP_LINKS}
          />
          {FOOTER_LINKS.map((section) => (
            <ExternalLinkSection
              key={section.label}
              section={section}
            />
          ))}
        </nav>
      </div>
    </footer>
  );
}
