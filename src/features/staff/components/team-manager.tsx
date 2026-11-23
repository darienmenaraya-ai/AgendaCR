import { InviteStaffForm } from "@/features/staff/components/invite-staff-form";
import { RevokeInvitationButton } from "@/features/staff/components/revoke-invitation-button";
import {
  StaffServiceAssignment,
  type StaffServiceSummary,
} from "@/features/staff/components/staff-service-assignment";

export type TeamMemberSummary = {
  id: string;
  displayName: string;
  email: string;
  active: boolean;
  isOwner: boolean;
  services: StaffServiceSummary[];
};

export type StaffInvitationSummary = {
  id: string;
  email: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
};

export function TeamManager({
  businessId,
  team,
  invitations,
  now,
}: {
  businessId: string;
  team: TeamMemberSummary[];
  invitations: StaffInvitationSummary[];
  now: Date;
}) {
  const activeInvitations = invitations.filter(
    (invitation) =>
      !invitation.acceptedAt &&
      !invitation.revokedAt &&
      invitation.expiresAt > now,
  );

  return (
    <section className="mt-8 rounded-2xl border border-[#e2eae4] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#34735e]">
            EQUIPO
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Profesionales
          </h2>
        </div>
        <p className="text-sm text-[#52645d]">
          {team.filter((member) => member.active).length} en el equipo
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {team.map((member) => (
          <article
            className="rounded-xl border border-[#e6ede8] bg-[#fbfcfa] p-4"
            key={member.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">{member.displayName}</p>
              <p className="mt-1 text-xs text-[#52645d]">{member.email}</p>
            </div>
            <span className="rounded-full bg-[#edf7ef] px-2.5 py-1 text-[11px] font-semibold text-[#34735e]">
              {member.isOwner
                ? "Propietario"
                : member.active
                  ? "Profesional"
                  : "Inactivo"}
            </span>
            <StaffServiceAssignment
              businessId={businessId}
              professionalName={member.displayName}
              services={member.services}
              staffId={member.id}
            />
          </article>
        ))}
      </div>

      {activeInvitations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">Invitaciones pendientes</h3>
          <div className="mt-3 space-y-3">
            {activeInvitations.map((invitation) => (
              <article
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f0e4d1] bg-[#fffbf5] p-4"
                key={invitation.id}
              >
                <div>
                  <p className="text-sm font-semibold">{invitation.email}</p>
                  <p className="mt-1 text-xs text-[#755a37]">
                    Vence{" "}
                    {new Intl.DateTimeFormat("es-CR", {
                      dateStyle: "medium",
                    }).format(invitation.expiresAt)}
                  </p>
                </div>
                <RevokeInvitationButton
                  businessId={businessId}
                  invitationId={invitation.id}
                />
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-[#edf1ed] pt-6">
        <h3 className="font-semibold">Invitar a un profesional</h3>
        <p className="mt-1 text-sm leading-6 text-[#52645d]">
          Enviaremos un enlace de un solo uso al correo indicado. Vence en siete
          días; también puedes copiarlo para compartirlo directamente.
        </p>
        <InviteStaffForm businessId={businessId} />
      </div>
    </section>
  );
}
