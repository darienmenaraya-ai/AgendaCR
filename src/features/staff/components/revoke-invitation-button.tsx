"use client";

import { useActionState } from "react";

import {
  revokeStaffInvitationAction,
  type StaffActionState,
} from "@/features/staff/actions";

const initialState: StaffActionState = { error: null, success: null };

export function RevokeInvitationButton({
  businessId,
  invitationId,
}: {
  businessId: string;
  invitationId: string;
}) {
  const [state, action, isPending] = useActionState(
    revokeStaffInvitationAction,
    initialState,
  );

  return (
    <div>
      <form action={action}>
        <input name="businessId" type="hidden" value={businessId} />
        <input name="invitationId" type="hidden" value={invitationId} />
        <button
          className="text-xs font-semibold text-[#9a5147] hover:underline disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Revocando…" : "Revocar"}
        </button>
      </form>
      {state.error && (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="mt-1 text-xs text-[#34735e]" role="status">
          {state.success}
        </p>
      )}
    </div>
  );
}
