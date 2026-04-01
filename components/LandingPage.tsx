"use client";

import Image from "next/image";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useCountUp } from "@/hooks/useCountUp";

// ─── DATA ────────────────────────────────────────────────
const discountData = [
  { label: "1년 이상", unopened: 5, opened: 8 },
  { label: "6개월~1년", unopened: 8, opened: 11 },
  { label: "3~6개월", unopened: 12, opened: 15 },
  { label: "1~3개월", unopened: 17, opened: 20 },
];

const flowSteps = [
  "약품 등록",
  "관리자 검수",
  "결제 보관",
  "구매 확인",
  "정산 완료",
];

const testimonials = [
  {
    quote: "폐기 직전 재고 80만 원어치를 일주일 만에 전부 판매했습니다",
    detail:
      "유통기한 4개월 남은 감기약 재고가 쌓여서 폐기를 고민하고 있었는데, MedExNet에 올리니까 이틀 만에 주문이 들어왔습니다. 검수도 빨랐고, 에스크로 덕분에 정산도 깔끔했어요. 수수료 3%를 빼도 폐기하는 것보다 훨씬 낫죠. 지금은 유통기한 6개월 남을 때부터 미리 등록하고 있습니다.",
    author: "김○○ 약사 · 서울 ○○약국",
    role: "판매자로 이용 중",
  },
  {
    quote: "도매상에서 100정 단위로만 팔던 약을 딱 필요한 만큼 샀습니다",
    detail:
      "환자분이 특정 제네릭을 요청하셨는데 도매상 최소 주문이 100정이라 고민이었어요. MedExNet에서 30정 단위로 올라온 걸 발견하고 바로 주문했습니다. 미개봉 상태에 유통기한도 8개월 넘게 남아 있어서 약가 대비 8% 할인된 가격에 구매했고, 약사면허 인증된 약국에서 오는 거라 안심이 됐습니다.",
    author: "박○○ 약사 · 경기 ○○○약국",
    role: "구매자로 이용 중",
  },
];

// ─── SUB-COMPONENTS ──────────────────────────────────────

function ProblemCard({
  icon,
  title,
  description,
  highlight,
  index,
  isVisible,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight: string;
  index: number;
  isVisible: boolean;
}) {
  return (
    <div
      className="bg-white border border-sky-100 rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 hover:border-sky-200 transition-all duration-300 cursor-default"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(40px)",
        transition: `all 0.6s ease-out ${index * 150}ms`,
      }}
    >
      <div className="w-12 h-12 bg-rose-50 text-rose-400 rounded-xl flex items-center justify-center mb-5">
        {icon}
      </div>
      <div className="text-2xl font-extrabold text-rose-400 mb-2">
        {highlight}
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-3">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function DiscountBar({
  label,
  unopened,
  opened,
  isVisible,
  index,
}: {
  label: string;
  unopened: number;
  opened: number;
  isVisible: boolean;
  index: number;
}) {
  const maxRate = 20;
  const unopenedWidth = (unopened / maxRate) * 100;
  const openedWidth = (opened / maxRate) * 100;
  const delay = index * 200;

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-10 flex-shrink-0">
            미개봉
          </span>
          <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full flex items-center justify-end pr-2.5 transition-all ease-out"
              style={{
                width: isVisible ? `${unopenedWidth}%` : "0%",
                transitionDuration: "1s",
                transitionDelay: `${delay}ms`,
              }}
            >
              {isVisible && (
                <span className="text-xs text-white font-bold">
                  {unopened}%
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-10 flex-shrink-0">개봉</span>
          <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
            <div
              className="h-full bg-teal-400 rounded-full flex items-center justify-end pr-2.5 transition-all ease-out"
              style={{
                width: isVisible ? `${openedWidth}%` : "0%",
                transitionDuration: "1s",
                transitionDelay: `${delay + 150}ms`,
              }}
            >
              {isVisible && (
                <span className="text-xs text-white font-bold">{opened}%</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowStep({
  step,
  index,
  total,
  isVisible,
}: {
  step: string;
  index: number;
  total: number;
  isVisible: boolean;
}) {
  const delay = index * 300;

  return (
    <div className="flex items-center flex-1 last:flex-none">
      <div
        className="flex flex-col items-center gap-2"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(20px)",
          transition: `all 0.5s ease-out ${delay}ms`,
        }}
      >
        <div className="w-10 h-10 bg-sky-400 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-md">
          {index + 1}
        </div>
        <span className="text-xs font-medium text-gray-700 text-center whitespace-nowrap">
          {step}
        </span>
      </div>
      {index < total - 1 && (
        <div className="flex-1 h-0.5 mx-1.5 bg-gray-200 overflow-hidden rounded-full hidden sm:block">
          <div
            className="h-full bg-sky-300 rounded-full transition-all ease-out"
            style={{
              width: isVisible ? "100%" : "0%",
              transitionDuration: "700ms",
              transitionDelay: `${delay + 200}ms`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function TestimonialCard({
  quote,
  detail,
  author,
  role,
  index,
  isVisible,
}: {
  quote: string;
  detail: string;
  author: string;
  role: string;
  index: number;
  isVisible: boolean;
}) {
  return (
    <div
      className="bg-white border border-sky-100 rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 hover:border-sky-200 transition-all duration-300 cursor-default"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(40px)",
        transition: `all 0.6s ease-out ${index * 200}ms`,
      }}
    >
      <svg
        className="w-8 h-8 text-sky-300 mb-4"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
      </svg>
      <p className="text-lg font-bold text-gray-900 mb-4 leading-relaxed">
        &ldquo;{quote}&rdquo;
      </p>
      <p className="text-sm text-gray-500 leading-relaxed mb-6">{detail}</p>
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
          <span className="text-sky-600 font-bold text-sm">
            {author.charAt(0)}
          </span>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{author}</p>
          <p className="text-xs text-gray-500">{role}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  value,
  unit,
  label,
  isVisible,
  index,
}: {
  value: number;
  unit: string;
  label: string;
  isVisible: boolean;
  index: number;
}) {
  const count = useCountUp(value, isVisible, 1500);
  const formatted = value >= 1000 ? count.toLocaleString() : count;

  return (
    <div
      className="bg-white border border-sky-100 rounded-2xl p-6 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "scale(1)" : "scale(0.9)",
        transition: `all 0.5s ease-out ${index * 150}ms`,
      }}
    >
      <div className="text-3xl font-extrabold text-sky-500 mb-1">
        {formatted}
        <span className="text-lg font-bold ml-0.5">{unit}</span>
      </div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────

export default function LandingPage() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll animation refs
  const problemAnim = useScrollAnimation();
  const servicesAnim = useScrollAnimation();
  const service1Anim = useScrollAnimation();
  const service2Anim = useScrollAnimation();
  const service3Anim = useScrollAnimation();
  const service4Anim = useScrollAnimation();
  const testimonialAnim = useScrollAnimation();

  // Count-up for service 4 stats
  const shippingCount = useCountUp(4000, service4Anim.isVisible, 1500);
  const commissionCount = useCountUp(3, service4Anim.isVisible, 1000);

  return (
    <div className="min-h-screen bg-white break-keep">
      {/* ─── HEADER ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-sky-100/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Image
              src="/logo.png"
              alt="MedExNet"
              width={160}
              height={36}
              className="h-12 w-auto"
              priority
            />
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => scrollTo("services")}
              className="hidden sm:block text-sm text-gray-500 hover:text-sky-600 transition-colors"
            >
              서비스소개
            </button>
            <button
              onClick={() => scrollTo("testimonials")}
              className="hidden sm:block text-sm text-gray-500 hover:text-sky-600 transition-colors"
            >
              후기
            </button>
            <a
              href="/auth"
              className="hidden sm:block px-4 py-1.5 text-sm text-sky-600 font-medium border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors"
            >
              로그인
            </a>
            <a
              href="/auth"
              className="px-5 py-1.5 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors"
            >
              회원가입
            </a>
          </nav>
        </div>
      </header>

      {/* ─── HERO ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/70 to-white">
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-sky-100/80 text-sky-700 text-sm font-medium rounded-full mb-6 animate-scale-in">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            인증된 약국 전용 거래 플랫폼
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800 leading-tight mb-6 text-balance animate-slide-up">
            약국 불용재고, 버리지 마세요.
            <br />
            <span className="text-sky-500">다른 약국</span>이 필요로 합니다.
          </h1>
          <p className="text-lg text-gray-500 mb-10 leading-relaxed max-w-2xl mx-auto text-balance animate-slide-up stagger-2">
            약사면허 인증을 완료한 약국끼리만 거래합니다.
            <br className="hidden sm:block" />
            <span className="whitespace-nowrap">관리자 검수,</span>{" "}
            <span className="whitespace-nowrap">에스크로 결제,</span>{" "}
            <span className="whitespace-nowrap">택배 대행까지</span> —{" "}
            <span className="whitespace-nowrap">등록부터 정산까지</span>{" "}
            <strong className="text-gray-700">3일</strong>이면 충분합니다.
          </p>
          <a
            href="/auth"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 transition-colors text-lg shadow-lg shadow-sky-500/25 animate-slide-up stagger-3"
          >
            약국 인증하고 거래 시작하기
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </a>
        </div>
      </section>

      {/* ─── PROBLEM ────────────────────────────────────── */}
      <section className="py-20 bg-sky-50/30" ref={problemAnim.ref}>
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-3xl font-bold text-gray-900 text-center mb-3 text-balance"
            style={{
              opacity: problemAnim.isVisible ? 1 : 0,
              transform: problemAnim.isVisible
                ? "translateY(0)"
                : "translateY(30px)",
              transition: "all 0.6s ease-out",
            }}
          >
            약국 운영, 이런 문제 겪고 계시죠?
          </h2>
          <p
            className="text-gray-500 text-center mb-12 text-balance"
            style={{
              opacity: problemAnim.isVisible ? 1 : 0,
              transform: problemAnim.isVisible
                ? "translateY(0)"
                : "translateY(30px)",
              transition: "all 0.6s ease-out 100ms",
            }}
          >
            대부분의 약국이 겪고 있지만, 마땅한 해결책이 없었던 문제들입니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ProblemCard
              index={0}
              isVisible={problemAnim.isVisible}
              highlight="200만~500만 원"
              title="매년 폐기되는 불용재고"
              description="유통기한이 임박한 의약품을 처분할 방법이 없어 그대로 폐기하고 계신다면, 매년 반복되는 순손실입니다."
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                  />
                </svg>
              }
            />
            <ProblemCard
              index={1}
              isVisible={problemAnim.isVisible}
              highlight="최소 100정"
              title="도매상의 높은 최소 주문량"
              description="환자 한 명에게 10정만 필요한데 100정을 주문해야 하는 상황. 나머지 90정은 결국 재고로 쌓입니다."
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
              }
            />
            <ProblemCard
              index={2}
              isVisible={problemAnim.isVisible}
              highlight="검증 불가"
              title="개인 간 거래의 불안함"
              description="카페나 커뮤니티에서 거래하면 상대방이 실제 약사인지, 약품 상태가 괜찮은지 확인할 길이 없습니다."
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* ─── SERVICES ───────────────────────────────────── */}
      <section id="services" className="py-20" ref={servicesAnim.ref}>
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-3xl font-bold text-gray-900 text-center mb-3 text-balance"
            style={{
              opacity: servicesAnim.isVisible ? 1 : 0,
              transform: servicesAnim.isVisible
                ? "translateY(0)"
                : "translateY(30px)",
              transition: "all 0.6s ease-out",
            }}
          >
            MedExNet이 해결합니다
          </h2>
          <p
            className="text-gray-500 text-center mb-16 text-balance"
            style={{
              opacity: servicesAnim.isVisible ? 1 : 0,
              transform: servicesAnim.isVisible
                ? "translateY(0)"
                : "translateY(30px)",
              transition: "all 0.6s ease-out 100ms",
            }}
          >
            검증된 약국 간 거래를 위한 4가지 핵심 기능
          </p>

          {/* ── 서비스 1: 검증된 약국 전용 마켓 ── */}
          <div
            ref={service1Anim.ref}
            className="mb-16 bg-sky-50/60 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center gap-8"
            style={{
              opacity: service1Anim.isVisible ? 1 : 0,
              transform: service1Anim.isVisible
                ? "translateX(0)"
                : "translateX(-30px)",
              transition: "all 0.6s ease-out",
            }}
          >
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 text-sky-700 text-xs font-medium rounded-full mb-4">
                서비스 01
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                검증된 약국 전용 마켓
              </h3>
              <p className="text-gray-500 leading-relaxed mb-6">
                <span className="whitespace-nowrap">약사면허증 + 사업자등록증</span> 이중 인증을 통과한 약국만 입점할 수 있습니다.
                <br />
                인증 완료까지 평균 <strong className="text-sky-600">1영업일</strong>이면 충분합니다.
              </p>
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-3xl font-extrabold text-sky-500">
                    이중 인증
                  </div>
                  <div className="text-sm text-gray-500">
                    약사면허 + 사업자등록
                  </div>
                </div>
                <div className="w-px h-12 bg-gray-200" />
                <div>
                  <div className="text-3xl font-extrabold text-sky-500">
                    0<span className="text-lg">건</span>
                  </div>
                  <div className="text-sm text-gray-500">미인증 거래</div>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-32 h-32 bg-sky-100/80 rounded-full flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-sky-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z"
                    />
                  </svg>
                </div>
                <div
                  className="absolute -top-2 -right-2 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    opacity: service1Anim.isVisible ? 1 : 0,
                    transform: service1Anim.isVisible
                      ? "scale(1)"
                      : "scale(0)",
                    transition: "all 0.4s ease-out 400ms",
                  }}
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* ── 서비스 2: 관리자 검수 + 에스크로 ── */}
          <div
            ref={service2Anim.ref}
            className="mb-16 bg-teal-50/50 rounded-3xl p-8 sm:p-12"
            style={{
              opacity: service2Anim.isVisible ? 1 : 0,
              transform: service2Anim.isVisible
                ? "translateX(0)"
                : "translateX(30px)",
              transition: "all 0.6s ease-out",
            }}
          >
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-full mb-4">
                  서비스 02
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  관리자 검수 + 에스크로 결제
                </h3>
                <p className="text-gray-500 leading-relaxed mb-6">
                  등록된 모든 약품은 관리자가 <span className="whitespace-nowrap">사진·유통기한·수량을</span> 직접 검수합니다.
                  <br />
                  결제 금액은 구매 확인 전까지 에스크로로 안전하게 보관됩니다.
                </p>
                <div className="flex items-center gap-4">
                  <div className="bg-white rounded-xl px-5 py-3 border border-teal-100">
                    <div className="text-2xl font-extrabold text-teal-500">
                      3<span className="text-sm font-bold ml-0.5">일</span>
                    </div>
                    <div className="text-xs text-gray-500">구매 확인 기한</div>
                  </div>
                  <div className="bg-white rounded-xl px-5 py-3 border border-teal-100">
                    <div className="text-2xl font-extrabold text-teal-500">
                      100<span className="text-sm font-bold ml-0.5">%</span>
                    </div>
                    <div className="text-xs text-gray-500">관리자 직접 검수</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Flow visualization */}
            <div className="mt-10 bg-white rounded-2xl p-6 border border-teal-100">
              <div className="text-sm font-medium text-gray-700 mb-4">
                거래 프로세스
              </div>
              <div className="flex items-center justify-between">
                {flowSteps.map((step, i) => (
                  <FlowStep
                    key={step}
                    step={step}
                    index={i}
                    total={flowSteps.length}
                    isVisible={service2Anim.isVisible}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── 서비스 3: 유통기한 기반 자동 할인 ── */}
          <div
            ref={service3Anim.ref}
            className="mb-16 bg-sky-50/40 rounded-3xl p-8 sm:p-12"
            style={{
              opacity: service3Anim.isVisible ? 1 : 0,
              transform: service3Anim.isVisible
                ? "translateX(0)"
                : "translateX(-30px)",
              transition: "all 0.6s ease-out",
            }}
          >
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 text-sky-700 text-xs font-medium rounded-full mb-4">
                  서비스 03
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  유통기한 기반 자동 할인
                </h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  유통기한과 개봉 여부에 따라
                  <br />
                  약가상한가 대비 <strong className="text-sky-600">5~20%</strong> 할인이 자동 적용됩니다.
                  <br />
                  계산할 필요 없이, 등록만 하면 됩니다.
                </p>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-sky-400 rounded-full" />
                    <span className="text-xs text-gray-500">미개봉</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-teal-400 rounded-full" />
                    <span className="text-xs text-gray-500">개봉</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-white rounded-2xl p-6 border border-sky-100 space-y-4">
                {discountData.map((d, i) => (
                  <DiscountBar
                    key={d.label}
                    label={d.label}
                    unopened={d.unopened}
                    opened={d.opened}
                    isVisible={service3Anim.isVisible}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── 서비스 4: 택배 대행 ── */}
          <div
            ref={service4Anim.ref}
            className="bg-slate-50/60 rounded-3xl p-8 sm:p-12"
            style={{
              opacity: service4Anim.isVisible ? 1 : 0,
              transform: service4Anim.isVisible
                ? "translateX(0)"
                : "translateX(30px)",
              transition: "all 0.6s ease-out",
            }}
          >
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-200/70 text-slate-600 text-xs font-medium rounded-full mb-4">
                  서비스 04
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  택배 대행 — 포장만 하세요
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  판매자는 포장만 완료하면 플랫폼이 <span className="whitespace-nowrap">수거·배송을 대행합니다.</span>
                  <br />
                  <span className="whitespace-nowrap">배송비 4,000원은</span> <span className="whitespace-nowrap">구매자·판매자가 반반 부담합니다.</span>
                </p>
              </div>
              <div className="flex-shrink-0 grid grid-cols-3 gap-4">
                <div
                  className="bg-white border border-sky-100 rounded-2xl p-5 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                  style={{
                    opacity: service4Anim.isVisible ? 1 : 0,
                    transform: service4Anim.isVisible
                      ? "scale(1)"
                      : "scale(0.9)",
                    transition: "all 0.5s ease-out 0ms",
                  }}
                >
                  <div className="text-2xl font-extrabold text-sky-500">
                    {shippingCount.toLocaleString()}
                    <span className="text-sm font-bold">원</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">배송비</div>
                </div>
                <div
                  className="bg-white border border-sky-100 rounded-2xl p-5 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                  style={{
                    opacity: service4Anim.isVisible ? 1 : 0,
                    transform: service4Anim.isVisible
                      ? "scale(1)"
                      : "scale(0.9)",
                    transition: "all 0.5s ease-out 150ms",
                  }}
                >
                  <div className="text-2xl font-extrabold text-sky-500">
                    50:50
                  </div>
                  <div className="text-xs text-gray-500 mt-1">비용 분담</div>
                </div>
                <div
                  className="bg-white border border-sky-100 rounded-2xl p-5 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                  style={{
                    opacity: service4Anim.isVisible ? 1 : 0,
                    transform: service4Anim.isVisible
                      ? "scale(1)"
                      : "scale(0.9)",
                    transition: "all 0.5s ease-out 300ms",
                  }}
                >
                  <div className="text-2xl font-extrabold text-sky-500">
                    {commissionCount}
                    <span className="text-sm font-bold">%</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">수수료</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────── */}
      <section
        id="testimonials"
        className="py-20 bg-sky-50/30"
        ref={testimonialAnim.ref}
      >
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-3xl font-bold text-gray-900 text-center mb-3 text-balance"
            style={{
              opacity: testimonialAnim.isVisible ? 1 : 0,
              transform: testimonialAnim.isVisible
                ? "translateY(0)"
                : "translateY(30px)",
              transition: "all 0.6s ease-out",
            }}
          >
            이미 사용 중인 약국들의 이야기
          </h2>
          <p
            className="text-gray-500 text-center mb-12 text-balance"
            style={{
              opacity: testimonialAnim.isVisible ? 1 : 0,
              transform: testimonialAnim.isVisible
                ? "translateY(0)"
                : "translateY(30px)",
              transition: "all 0.6s ease-out 100ms",
            }}
          >
            실제 약국에서 경험한 MedExNet 이용 후기
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <TestimonialCard
                key={i}
                quote={t.quote}
                detail={t.detail}
                author={t.author}
                role={t.role}
                index={i}
                isVisible={testimonialAnim.isVisible}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────── */}
      <footer className="bg-white border-t border-sky-100/60">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center mb-4">
                <Image
                  src="/logo.png"
                  alt="MedExNet"
                  width={140}
                  height={32}
                  className="h-10 w-auto"
                />
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                약국 전용 불용재고 거래 플랫폼.
                <br />
                안전하고 합법적인 의약품 거래를 지원합니다.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">서비스</h3>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors"
                  >
                    거래 게시판
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors"
                  >
                    약 등록
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors"
                  >
                    퀵오더
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">정책</h3>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors"
                  >
                    이용약관
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors"
                  >
                    개인정보처리방침
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors"
                  >
                    등록 기준
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 py-6">
          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} MedExNet. 약국 전용 서비스입니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
