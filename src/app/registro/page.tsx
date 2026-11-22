import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Crear cuenta | AgendaCR",
  description: "Crea tu cuenta y organiza mejor las citas de tu negocio.",
};

export default function SignUpPage() {
  return <AuthForm mode="sign-up" />;
}
