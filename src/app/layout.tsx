import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ImobIA — Automação Imobiliária Inteligente",
  description:
    "Plataforma de automação para imobiliárias. Qualifique leads automaticamente, atribua corretores e receba briefings completos via WhatsApp.",
  keywords: ["imobiliária", "automação", "leads", "corretores", "imóveis"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
