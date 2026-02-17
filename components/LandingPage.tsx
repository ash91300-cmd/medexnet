export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">MedExNet</span>
          </div>
          <a
            href="/login"
            className="px-5 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            로그인
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            약국 전용 플랫폼
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            불용재고, 이제 <span className="text-blue-500">MedExNet</span>에서
            <br />
            안전하게 거래하세요
          </h1>
          <p className="text-lg text-gray-500 mb-4 leading-relaxed">
            검증된 약국 간 의약품 거래 플랫폼.
          </p>
          <p className="text-lg text-gray-500 mb-10 leading-relaxed">
            관리자 검수와 에스크로로 안전한 거래를 보장합니다.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors text-lg shadow-lg shadow-blue-500/25"
          >
            거래 시작하기
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
          왜 MedExNet인가요?
        </h2>
        <p className="text-gray-500 text-center mb-12">
          약국 운영에 필요한 모든 기능을 갖춘 전문 거래 플랫폼입니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            }
            iconColor="text-blue-500"
            iconBg="bg-blue-50"
            title="검증된 약국 전용"
            description="약사면허 인증을 통해 검증된 약사만 이용할 수 있습니다."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            }
            iconColor="text-emerald-500"
            iconBg="bg-emerald-50"
            title="안전한 품질 관리"
            description="모든 등록 약품은 관리자 검수를 거쳐 품질이 보장됩니다."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.136-.504 1.136-1.125v-2.344M7.5 10.875l.236-.344a3.86 3.86 0 015.528 0l.236.344m-6 0a3 3 0 00-.536 1.727v.104" />
              </svg>
            }
            iconColor="text-blue-500"
            iconBg="bg-blue-50"
            title="편리한 택배 대행"
            description="포장만 하면 운영팀이 픽업 접수부터 배송까지 대행합니다."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            }
            iconColor="text-blue-500"
            iconBg="bg-blue-50"
            title="합리적 가격의 의약품"
            description="숨겨진 기어 최근 구매 가격으로 빠르게 재고를 보충하세요."
          />
        </div>
      </section>

      {/* Process Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
            거래 프로세스
          </h2>
          <p className="text-gray-500 text-center mb-12">
            간단한 6단계로 안전하게 거래를 완료하세요.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <ProcessStep number={1} title="회원가입" description="약사면허 인증 후 승인" />
            <ProcessStep number={2} title="약 등록" description="불용재고 사진과 정보 입력" />
            <ProcessStep number={3} title="거래 체결" description="구매자가 수량 및 금액 확인" />
            <ProcessStep number={4} title="포장 완료" description="판매자는 포장만 하면 끝" />
            <ProcessStep number={5} title="배송 대행" description="운영팀이 택배 접수 대행" />
            <ProcessStep number={6} title="정산 완료" description="수령확인 후 자동 정산" />
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-3xl p-10 sm:p-16 flex flex-col sm:flex-row items-center gap-10">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 leading-snug">
              안전한 거래를 위한
            </h2>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 leading-snug">
              철저한 보안 시스템
            </h2>
            <ul className="space-y-3">
              <SecurityItem text="약사면허 인증으로 검증된 회원만 이용" />
              <SecurityItem text="모든 약품 등록 관리자 검수 필수" />
              <SecurityItem text="에스크로 결제로 대금 안전 보관" />
              <SecurityItem text="3일 내 수령확인 시스템" />
              <SecurityItem text="분쟁 발생 시 운영팀 중재" />
            </ul>
          </div>
          <div className="flex-shrink-0">
            <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-16 h-16 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-400 to-blue-500 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            지금 MedExNet을 시작하세요
          </h2>
          <p className="text-blue-100 text-lg mb-10">
            불용재고 문제, 더 이상 고민하지 마세요. 검증된 약국들과 안전하게 거래할 수 있습니다.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/20 text-white font-semibold rounded-xl border border-white/40 hover:bg-white/30 transition-colors text-lg"
          >
            거래 시작하기
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-gray-900">MedExNet</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                약국 전용 불용재고 거래 플랫폼. 안전하고 합법적인 의약품 거래를 지원합니다.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">서비스</h3>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900 transition-colors">거래 게시판</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">약 등록</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">퀵오더</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">정책</h3>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900 transition-colors">이용약관</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">개인정보처리방침</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">등록 기준</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 py-6">
          <p className="text-center text-sm text-gray-400">
            &copy; 2024 MedExNet. 약국 전용 서비스입니다.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  iconColor,
  iconBg,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-gray-200 transition-all">
      <div className={`w-12 h-12 ${iconBg} ${iconColor} rounded-xl flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function ProcessStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 text-center border border-gray-100">
      <div className="w-8 h-8 bg-blue-500 text-white text-sm font-bold rounded-full flex items-center justify-center mx-auto mb-3">
        {number}
      </div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

function SecurityItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-gray-700">
      <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      <span className="text-sm">{text}</span>
    </li>
  );
}
