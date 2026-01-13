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
      <h4 className="text-primary text-center text-sm font-bold">{title}</h4>
      <ul className="flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              to={link.to}
              className="text-subtext-light hover:text-subtext block text-center text-sm transition-all duration-200"
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
      <h4 className="text-primary text-center text-sm font-bold">{section.label}</h4>
      <ul className="flex flex-col gap-1">
        {section.link.map((item) => (
          <li key={item.label}>
            <a
              href={item.to}
              target="_blank"
              rel="noopener noreferrer"
              className="text-subtext-light hover:text-subtext block text-center text-sm transition-all duration-200"
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
    <footer className="flex items-center justify-between gap-8 bg-gray-400 px-18.5 py-20">
      <div className="flex-1">
        <img
          src={logoImg}
          alt="Plum Logo"
          width={86}
          height={60}
          className="h-15"
        />
        <p className="text-text mt-1 text-xl font-bold">강의는 놀이처럼, 성과는 전문가처럼!</p>
        <p className="text-subtext-light mt-3 text-sm">
          Copyright ⓒ {currentYear} Plum All rights reserved.
        </p>
      </div>

      <nav
        className="flex gap-6"
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
    </footer>
  );
}
