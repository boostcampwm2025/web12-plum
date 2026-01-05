import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDir = resolve(__dirname, '../../src');

const ASSETS_DIR = join(srcDir, 'assets');
const OUTPUT_DIR = join(srcDir, 'shared/components/icon');
const OUTPUT_FILE = join(OUTPUT_DIR, 'iconMap.ts');

const SVG_EXTENSION = '.svg';

/**
 * 케밥 케이스 문자열을 카멜 케이스로 변환
 * @param str 케밥 케이스 문자열
 * @returns 카멜 케이스 문자열
 */
export const toCamelCase = (str: string) => {
  const camelCaseStr = str
    .replace(/-([a-z])/g, (_, char) => char.toUpperCase())
    .replace(new RegExp(`\\${SVG_EXTENSION}$`), '');
  return camelCaseStr;
};

/**
 * assets 디렉토리 내의 폴더 목록을 반환
 */
export const getAssetFolders = (): string[] => {
  const folders = readdirSync(ASSETS_DIR).filter((folder) => {
    const folderPath = join(ASSETS_DIR, folder);
    const isDirectory = statSync(folderPath).isDirectory();
    return isDirectory;
  });
  return folders;
};

/**
 * 특정 폴더 내의 SVG 파일 목록을 반환
 */
export const getSvgFiles = (folder: string): string[] => {
  const folderPath = join(ASSETS_DIR, folder);
  const files = readdirSync(folderPath).filter((file) => file.endsWith(SVG_EXTENSION));
  return files;
};

/**
 * SVG 파일 정보를 기반으로 import 구문과 맵 엔트리 생성
 */
export const createIconEntry = (folder: string, file: string) => {
  const importKey = file.replace(SVG_EXTENSION, '');
  const varName = toCamelCase(`${folder}-${file}`);
  const importPath = `@/assets/${folder}/${file}`;

  const importStatement = `import ${varName} from '${importPath}?react'`;
  const mapEntry = `  '${importKey}': ${varName},`;

  return { importStatement, mapEntry };
};

/**
 * 모든 아이콘 파일을 스캔하고 import/map 정보 수집
 */
export const collectIconData = () => {
  const folders = getAssetFolders();
  const imports: string[] = [];
  const mapEntries: string[] = [];

  for (const folder of folders) {
    const files = getSvgFiles(folder);
    for (const file of files) {
      const { importStatement, mapEntry } = createIconEntry(folder, file);
      imports.push(importStatement);
      mapEntries.push(mapEntry);
    }
  }

  return { imports, mapEntries };
};

/**
 * iconMap.ts 파일의 내용을 생성
 */
export const generateFileContent = (imports: string[], mapEntries: string[]): string => {
  const content = `${imports.join(';\n')}${imports.length > 0 ? ';' : ''}

import type { ComponentType, SVGProps } from 'react';

export const iconMap = {
${mapEntries.join('\n')}
};

export type IconName = keyof typeof iconMap;
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
`;
  return content;
};

/**
 * 아이콘 맵 파일을 자동으로 생성하는 스크립트
 *
 * src/assets/ 내의 각 폴더에서 `.svg` 파일을 탐색하고,
 * `iconMap` 객체로 매핑하여 src/shared/components/icon/iconMap.ts 에 저장
 */
const generateIconMap = () => {
  // 출력 디렉토리가 존재하지 않으면 생성
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const { imports, mapEntries } = collectIconData();
  const content = generateFileContent(imports, mapEntries);
  writeFileSync(OUTPUT_FILE, content);
};

generateIconMap();
