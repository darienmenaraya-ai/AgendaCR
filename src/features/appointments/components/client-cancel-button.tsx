"use client";

import { useActionState } from "react";

import {
  cancelMyAppointmentAction,
  type AppointmentStatusActionState,
} from "@/features/appointments/actions";

const initialState: AppointmentStatusActionState = {
  error: null,
  success: null,
};

export function ClientCancelButton({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const [state, action, isPending] = useActionState(
    cancelMyAppointmentAction,
    initialState,
  );

  return (
    <div className="mt-4">
      <form action={action}>
        <input name="appointmentId" type="hidden" value={appointmentId} />
        <button
          className="h-9 rounded-lg border border-[#e5d7d4] px-3 text-xs font-semibold text-[#9a5147] transition hover:bg-[#fff6f4] disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Cancelando…" : "Cancelar cita"}
        </button>
      </form>
      {state.error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="mt-2 text-xs text-[#34735e]" role="status">
          {state.success}
        </p>
      )}
    </div>
  );
}
