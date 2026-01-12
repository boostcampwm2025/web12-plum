interface PageSubHeaderProps {
  title: string;
  description?: string;
}

/**
 * 페이지의 서브 헤더 컴포넌트
 * @param title 제목
 * @param description 설명 (선택 사항)
 * @returns JSX.Element
 */
export function PageSubHeader({ title, description }: PageSubHeaderProps) {
  return (
    <header className="pb-4">
      <h2 className="text-text text-4xl font-extrabold">{title}</h2>
      {description && <p className="text-subtext-light mt-2 text-xl font-bold">{description}</p>}
    </header>
  );
}
