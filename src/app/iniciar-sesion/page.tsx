import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | AgendaCR",
  description: "Accede a tu cuenta de AgendaCR para gestionar tus citas.",
};

export default function SignInPage() {
  return <AuthForm mode="sign-in" />;
}
