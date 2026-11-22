"use client";

import { useActionState } from "react";

import {
  reviewPaymentAction,
  type PaymentActionState,
} from "@/features/payments/actions";

const initialState: PaymentActionState = { error: null, success: null };

export function PaymentReviewActions({ paymentId }: { paymentId: string }) {
  const [state, action, isPending] = useActionState(
    reviewPaymentAction,
    initialState,
  );

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <form action={action}>
          <input name="paymentId" type="hidden" value={paymentId} />
          <input name="status" type="hidden" value="verified" />
          <button
            className="h-9 rounded-lg bg-[#1e5949] px-3 text-xs font-semibold text-white transition hover:bg-[#17483b] disabled:opacity-50"
            disabled={isPending}
            type="submit"
          >
            Verificar pago
          </button>
        </form>
      </div>
      <form action={action} className="flex flex-wrap gap-2 sm:items-end">
        <input name="paymentId" type="hidden" value={paymentId} />
        <input name="status" type="hidden" value="rejected" />
        <label className="min-w-48 flex-1 space-y-1.5 text-xs font-medium text-[#52645d]">
          <span>Motivo si lo rechazas</span>
          <input
            autoComplete="off"
            className="auth-input h-9"
            maxLength={300}
            minLength={3}
            name="reviewNote"
            placeholder="La referencia no coincide…"
            required
            type="text"
          />
        </label>
        <button
          className="h-9 rounded-lg border border-[#e5d7d4] px-3 text-xs font-semibold text-[#9a5147] transition hover:bg-[#fff6f4] disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          Rechazar reporte
        </button>
      </form>
      {state.error && (
        <p className="text-xs text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-xs text-[#34735e]" role="status">
          {state.success}
        </p>
      )}
    </div>
  );
}
