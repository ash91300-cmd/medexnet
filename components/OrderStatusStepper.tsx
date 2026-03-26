"use client";

import { getCarrierName } from "@/lib/carriers";

export const ORDER_STEPS = [
  { key: "confirmed", label: "결제완료" },
  { key: "shipping", label: "배송중" },
  { key: "delivered", label: "배송완료" },
  { key: "completed", label: "거래완료" },
] as const;

export interface OrderStatusInfo {
  status: string;
  tracking_number?: string | null;
  courier?: string | null;
  carrier_code?: string | null;
}

export default function OrderStatusStepper({
  order,
}: {
  order: OrderStatusInfo;
}) {
  if (order.status === "cancelled") {
    return (
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-100">
          <svg
            className="w-5 h-5 text-red-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span className="text-sm font-semibold text-red-600">
            주문이 취소되었습니다
          </span>
        </div>
      </div>
    );
  }

  if (order.status === "pending") {
    return (
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 rounded-xl border border-amber-100">
          <svg
            className="w-5 h-5 text-amber-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm font-semibold text-amber-700">
            주문 접수 대기중
          </span>
        </div>
      </div>
    );
  }

  const currentIdx = ORDER_STEPS.findIndex((s) => s.key === order.status);
  const effectiveIdx = currentIdx === -1 ? 0 : currentIdx;
  const isShippingOrBeyond = effectiveIdx >= 1;

  const courierDisplay = order.carrier_code
    ? getCarrierName(order.carrier_code)
    : order.courier;

  return (
    <div className="px-5 py-4">
      {/* Step Bar */}
      <div className="flex items-center">
        {ORDER_STEPS.map((step, idx) => {
          const isCompleted = idx < effectiveIdx;
          const isCurrent = idx === effectiveIdx;

          return (
            <div
              key={step.key}
              className="flex items-center flex-1 last:flex-none"
            >
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                        ? "bg-blue-500 text-white ring-4 ring-blue-100"
                        : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isCompleted
                      ? "text-emerald-600"
                      : isCurrent
                        ? "text-blue-600"
                        : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < ORDER_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-5 ${
                    idx < effectiveIdx ? "bg-emerald-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Tracking Info */}
      {isShippingOrBeyond && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
          <svg
            className="w-4 h-4 text-indigo-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
            />
          </svg>
          {order.tracking_number && courierDisplay ? (
            <span className="text-xs text-indigo-700">
              <span className="font-semibold">{courierDisplay}</span>
              <span className="mx-1.5 text-indigo-300">|</span>
              <span className="font-mono">{order.tracking_number}</span>
            </span>
          ) : (
            <span className="text-xs text-indigo-500">배송 정보 준비중</span>
          )}
        </div>
      )}
    </div>
  );
}
