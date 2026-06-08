import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Validade — Email API",
  description: "API de envio de e-mails para alerta de vencimento",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
