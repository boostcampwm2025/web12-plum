import { Font } from '@react-pdf/renderer';

export function registerFonts() {
  Font.register({
    family: 'NanumSquareRound',
    fonts: [
      { src: '/fonts/NanumSquareRoundL.ttf', fontWeight: 300 },
      { src: '/fonts/NanumSquareRoundR.ttf', fontWeight: 400 },
      { src: '/fonts/NanumSquareRoundB.ttf', fontWeight: 700 },
      { src: '/fonts/NanumSquareRoundEB.ttf', fontWeight: 800 },
    ],
  });
}
