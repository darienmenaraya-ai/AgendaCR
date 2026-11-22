"use client";

import { useActionState } from "react";

import {
  updateAppointmentStatusAction,
  type AppointmentStatusActionState,
} from "@/features/appointments/actions";

const initialState: AppointmentStatusActionState = {
  error: null,
  success: null,
};

export function AppointmentStatusButtons({
  appointmentId,
  status,
  canMarkOutcome,
}: {
  appointmentId: string;
  status: "pending" | "confirmed";
  canMarkOutcome: boolean;
}) {
  const [state, action, isPending] = useActionState(
    updateAppointmentStatusAction,
    initialState,
  );

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {status === "pending" && (
          <form action={action}>
            <input name="appointmentId" type="hidden" value={appointmentId} />
            <input name="status" type="hidden" value="confirmed" />
            <button
              className="h-9 rounded-lg bg-[#1e5949] px-3 text-xs font-semibold text-white transition hover:bg-[#17483b] disabled:opacity-50"
              disabled={isPending}
              type="submit"
            >
              Confirmar
            </button>
          </form>
        )}
        <form action={action}>
          <input name="appointmentId" type="hidden" value={appointmentId} />
          <input name="status" type="hidden" value="cancelled" />
          <button
            className="h-9 rounded-lg border border-[#e5d7d4] px-3 text-xs font-semibold text-[#9a5147] transition hover:bg-[#fff6f4] disabled:opacity-50"
            disabled={isPending}
            type="submit"
          >
            Cancelar
          </button>
        </form>
        {status === "confirmed" && canMarkOutcome && (
          <>
            <StatusButton
              action={action}
              appointmentId={appointmentId}
              disabled={isPending}
              status="completed"
              label="Completada"
            />
            <StatusButton
              action={action}
              appointmentId={appointmentId}
              disabled={isPending}
              status="no_show"
              label="No asistió"
            />
          </>
        )}
      </div>
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

function StatusButton({
  action,
  appointmentId,
  disabled,
  status,
  label,
}: {
  action: (formData: FormData) => void;
  appointmentId: string;
  disabled: boolean;
  status: "completed" | "no_show";
  label: string;
}) {
  return (
    <form action={action}>
      <input name="appointmentId" type="hidden" value={appointmentId} />
      <input name="status" type="hidden" value={status} />
      <button
        className="h-9 rounded-lg border border-[#dce5df] px-3 text-xs font-semibold text-[#35554c] transition hover:bg-[#f1f5f1] disabled:opacity-50"
        disabled={disabled}
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}
