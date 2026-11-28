import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  variant?: "light" | "dark";
};

export function BrandLogo({
  className = "h-8 w-auto",
  variant = "light",
}: BrandLogoProps) {
  return (
    <Image
      alt="AgendaCR"
      className={className}
      height={400}
      src={
        variant === "dark"
          ? "/brand/agendacr-horizontal-dark.svg"
          : "/brand/agendacr-horizontal.svg"
      }
      unoptimized
      width={1600}
    />
  );
}
