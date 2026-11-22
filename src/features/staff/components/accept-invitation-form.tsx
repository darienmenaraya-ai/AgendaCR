"use client";

import { useActionState } from "react";

import {
  acceptStaffInvitationAction,
  type StaffActionState,
} from "@/features/staff/actions";

const initialState: StaffActionState = { error: null, success: null };

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, action, isPending] = useActionState(
    acceptStaffInvitationAction,
    initialState,
  );

  return (
    <form action={action} className="mt-7 space-y-4">
      <input name="token" type="hidden" value={token} />
      {state.error && (
        <p
          aria-live="polite"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      )}
      <button
        className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1e5949] px-5 text-sm font-semibold text-white transition hover:bg-[#17483b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e5949] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Aceptando…" : "Aceptar invitación"}
      </button>
    </form>
  );
}
