import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Footer } from '@/shared/components/Footer';
import { Header } from '@/shared/components/Header';
import { Button } from '@/shared/components/Button';
import { ROUTES } from '@/app/routes/routes';
import { Icon } from '@/shared/components/icon/Icon';
import logoImg from '@/assets/logo/logo.svg';

const features = [
  {
    icon: 'clap',
    title: '반응을 더 빠르게',
    description: '채팅이 아닌 비언어적 소통으로 몰입도를 높입니다.',
  },
  {
    icon: 'question',
    title: '참여를 능동적으로',
    description: '모든 참여 활동을 점수화하여 참가자들이 적극적으로 참여하도록 합니다.',
  },
  {
    icon: 'graph',
    title: '더 완벽한 정리를',
    description: '모든 기록과 통계를 종합하여 완전한 회의록을 제공합니다.',
  },
] as const;

const steps = [
  {
    num: 1,
    title: '강의 생성',
    description: '강의실 이름과 기본 정보를 입력하여 나만의 강의실을 만드세요',
  },
  {
    num: 2,
    title: '참가자 초대',
    description: '생성된 강의실 링크를 공유하여 참가자들을 초대하세요',
  },
  {
    num: 3,
    title: '강의 시작',
    description: '제스처, 투표, 질문 등 다양한 기능으로 생동감 있는 강의를 진행하세요',
  },
];

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-gray-500">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="flex min-h-[calc(80vh-80px)] items-center px-6 py-16 md:px-12 md:py-24 lg:px-24 lg:py-32">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2">
            {/* 텍스트 영역 */}
            <div className="min-w-0 lg:min-w-120">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-text mb-6 text-4xl leading-tight font-bold whitespace-nowrap sm:text-4xl md:text-5xl lg:text-6xl"
              >
                강의는 놀이처럼,
                <br />
                성과는 전문가처럼!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
                className="text-subtext-light mb-10 text-base sm:text-lg md:text-xl"
              >
                실시간 참여도 점수와 제스처 반응, 투표 기능으로 팀원 모두의 몰입도를 100%로
                끌어올리세요.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
              >
                <Button
                  onClick={() => navigate(ROUTES.CREATE)}
                  className="rounded-full px-8 py-4 text-base font-semibold transition-all duration-300 hover:scale-105 sm:text-lg"
                >
                  강의하러 가기
                </Button>
              </motion.div>
            </div>

            {/* 목업 영역 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              className="relative hidden h-80 lg:block"
            >
              {/* 참여도 점수 목업 */}
              <div className="absolute top-2 left-8 w-64 -rotate-3 overflow-hidden rounded-2xl border border-gray-400 bg-gray-600 p-5 shadow-xl">
                <div className="mb-4 flex items-center gap-2">
                  <Icon
                    name="ranking"
                    size={20}
                    decorative
                    className="text-text"
                  />
                  <span className="text-text font-medium">참여도 점수</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-primary text-sm font-bold">1</span>
                    <div className="flex-1">
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-text">김민수</span>
                        <span className="text-primary font-medium">94점</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-500">
                        <div className="bg-primary h-full w-[94%]" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-subtext text-sm font-bold">2</span>
                    <div className="flex-1">
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-text">이서연</span>
                        <span className="text-subtext font-medium">87점</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-500">
                        <div className="bg-primary/70 h-full w-[87%]" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-subtext text-sm font-bold">3</span>
                    <div className="flex-1">
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-text">박지훈</span>
                        <span className="text-subtext font-medium">82점</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-500">
                        <div className="bg-primary/50 h-full w-[82%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 투표 목업 */}
              <div className="absolute right-8 bottom-2 z-10 w-56 rotate-2 overflow-hidden rounded-2xl border border-gray-400 bg-gray-600 p-5 shadow-2xl">
                <div className="mb-4 flex items-center gap-2">
                  <Icon
                    name="vote"
                    size={20}
                    decorative
                  />
                  <span className="text-text font-medium">실시간 투표</span>
                </div>
                <p className="text-text mb-4 text-sm">오늘 강의 이해됐나요?</p>
                <div className="space-y-2">
                  <div className="relative h-9 overflow-hidden rounded-lg bg-gray-500">
                    <div className="bg-primary absolute inset-y-0 left-0 w-[75%]" />
                    <span className="relative z-10 flex h-full items-center justify-between px-3 text-sm text-white">
                      <span>네!</span>
                      <span className="font-medium">75%</span>
                    </span>
                  </div>
                  <div className="relative h-9 overflow-hidden rounded-lg bg-gray-500">
                    <div className="bg-primary/50 absolute inset-y-0 left-0 w-[25%]" />
                    <span className="relative z-10 flex h-full items-center justify-between px-3 text-sm text-white">
                      <span>아니요</span>
                      <span className="font-medium">25%</span>
                    </span>
                  </div>
                </div>
                <p className="text-subtext mt-3 text-center text-xs">12명 참여</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 서비스 정보 */}
        <section className="bg-gray-600 px-6 py-20 md:px-12 md:py-28 lg:px-24">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-text mb-16 text-center text-3xl font-bold md:text-4xl">
              <img
                src={logoImg}
                alt="Plum"
                width={120}
                height={88}
                className="mr-2 inline-block h-7 w-auto align-middle sm:h-8 md:h-9"
              />
              은 당신의 회의를 이렇게 바꿉니다.
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  whileHover={{ y: -8, transition: { type: 'spring', stiffness: 300 } }}
                  className={`group flex flex-col items-center rounded-2xl bg-gray-500 p-8 text-center hover:bg-gray-500/80 lg:p-10 ${i === 2 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 3 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="mb-6 flex items-center justify-center"
                  >
                    <Icon
                      name={feature.icon}
                      size={64}
                      decorative
                    />
                  </motion.div>
                  <h3 className="text-text group-hover:text-primary mb-3 text-xl font-bold transition-colors duration-300 lg:text-2xl">
                    {feature.title}
                  </h3>
                  <p className="text-subtext-light text-sm lg:text-base">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 실행 단계 */}
        <section className="px-6 py-20 md:px-12 md:py-28 lg:px-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-text mb-4 text-center text-3xl font-bold md:text-4xl">
              간단한 3단계
            </h2>
            <p className="text-subtext-light mb-16 text-center text-base md:text-lg">
              누구나 간편하게 강의실을 만들고 강의를 바로 시작할 수 있습니다.
            </p>
            <div className="relative grid gap-8 md:grid-cols-3 md:gap-12">
              <div className="absolute top-8 right-[16.67%] left-[16.67%] hidden h-0.5 bg-gray-400 md:block" />

              {steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="group relative text-center"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="bg-primary text-text relative z-10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                  >
                    {step.num}
                  </motion.div>
                  <h3 className="text-text group-hover:text-primary mb-3 text-lg font-bold transition-colors duration-300 md:text-xl">
                    {step.title}
                  </h3>
                  <p className="text-subtext-light text-sm md:text-base">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gray-600 px-6 py-20 md:px-12 md:py-28 lg:px-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="text-text mb-6 text-3xl font-bold md:text-4xl">지금 바로 시작하세요</h2>
            <p className="text-subtext-light mb-10 text-base md:text-lg">
              무료로 강의실을 만들고 팀원들과 함께 새로운 회의 경험을 시작해보세요.
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="inline-block"
            >
              <Button
                onClick={() => navigate(ROUTES.CREATE)}
                className="bg-primary text-text hover:bg-primary/90 rounded-full px-10 py-4 sm:text-lg"
              >
                강의하러 가기
              </Button>
            </motion.div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
