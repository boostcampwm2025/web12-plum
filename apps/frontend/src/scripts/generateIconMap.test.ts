import { describe, it, expect } from 'vitest';
import { toCamelCase, createIconEntry, generateFileContent } from './generateIconMap';

describe('generateIconMap 유틸리티 함수들', () => {
  describe('toCamelCase', () => {
    it('케밥 케이스를 카멜 케이스로 변환해야 함', () => {
      const kebab1 = 'arrow-left';
      const kebab2 = 'chevron-down-icon';
      const kebab3 = 'home';

      const result1 = toCamelCase(kebab1);
      const result2 = toCamelCase(kebab2);
      const result3 = toCamelCase(kebab3);

      expect(result1).toBe('arrowLeft');
      expect(result2).toBe('chevronDownIcon');
      expect(result3).toBe('home');
    });

    it('.svg 확장자를 제거해야 함', () => {
      const file1 = 'arrow-left.svg';
      const file2 = 'home.svg';

      const result1 = toCamelCase(file1);
      const result2 = toCamelCase(file2);

      expect(result1).toBe('arrowLeft');
      expect(result2).toBe('home');
    });

    it('케밥 케이스 변환과 확장자 제거를 동시에 처리해야 함', () => {
      const file1 = 'arrow-left.svg';
      const file2 = 'user-profile-icon.svg';

      const result1 = toCamelCase(file1);
      const result2 = toCamelCase(file2);

      expect(result1).toBe('arrowLeft');
      expect(result2).toBe('userProfileIcon');
    });
  });

  describe('createIconEntry', () => {
    it('올바른 import 구문을 생성해야 함', () => {
      const folder = 'icons';
      const filename = 'arrow-left.svg';

      const result = createIconEntry(folder, filename);

      expect(result.importStatement).toBe(
        "import iconsArrowLeft from '@/assets/icons/arrow-left.svg?react'",
      );
      expect(result.mapEntry).toBe("  'arrow-left': iconsArrowLeft,");
    });

    it('하이픈이 없는 파일명도 처리해야 함', () => {
      const folder = 'icons';
      const filename = 'home.svg';

      const result = createIconEntry(folder, filename);

      expect(result.importStatement).toBe("import iconsHome from '@/assets/icons/home.svg?react'");
      expect(result.mapEntry).toBe("  'home': iconsHome,");
    });

    it('여러 하이픈이 있는 파일명을 처리해야 함', () => {
      const folder = 'buttons';
      const filename = 'chevron-down-icon.svg';

      const result = createIconEntry(folder, filename);

      expect(result.importStatement).toBe(
        "import buttonsChevronDownIcon from '@/assets/buttons/chevron-down-icon.svg?react'",
      );
      expect(result.mapEntry).toBe("  'chevron-down-icon': buttonsChevronDownIcon,");
    });
  });

  describe('generateFileContent', () => {
    it('올바른 파일 구조를 생성해야 함', () => {
      const imports = [
        "import iconsHome from '@/assets/icons/home.svg?react'",
        "import iconsArrowLeft from '@/assets/icons/arrow-left.svg?react'",
      ];
      const mapEntries = ["  'home': iconsHome,", "  'arrow-left': iconsArrowLeft,"];

      const expectedContent = `import iconsHome from '@/assets/icons/home.svg?react'
import iconsArrowLeft from '@/assets/icons/arrow-left.svg?react'

import type { ComponentType, SVGProps } from 'react'

export const iconMap = {
  'home': iconsHome,
  'arrow-left': iconsArrowLeft,
}

export type IconName = keyof typeof iconMap
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>
`;

      const result = generateFileContent(imports, mapEntries);

      expect(result).toBe(expectedContent);
    });

    it('빈 imports와 entries도 처리해야 함', () => {
      const imports: string[] = [];
      const mapEntries: string[] = [];

      const expectedContent = `

import type { ComponentType, SVGProps } from 'react'

export const iconMap = {

}

export type IconName = keyof typeof iconMap
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>
`;

      const result = generateFileContent(imports, mapEntries);

      expect(result).toBe(expectedContent);
    });

    it('단일 아이콘만 있어도 올바르게 생성해야 함', () => {
      const imports = ["import iconsHome from '@/assets/icons/home.svg?react'"];
      const mapEntries = ["  'home': iconsHome,"];

      const result = generateFileContent(imports, mapEntries);

      expect(result).toContain("import iconsHome from '@/assets/icons/home.svg?react'");
      expect(result).toContain('export const iconMap = {');
      expect(result).toContain("  'home': iconsHome,");
      expect(result).toContain('}');
      expect(result).toContain('export type IconName = keyof typeof iconMap');
    });
  });
});
