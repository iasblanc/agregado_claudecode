import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agregado.Pro — Sistema Operacional do Caminhoneiro Agregado",
  description: "Gestão financeira, custo por km, marketplace de contratos e infraestrutura financeira para caminhoneiros agregados e transportadoras.",
  keywords: "caminhoneiro agregado, gestão de frota, custo km, marketplace transporte, DRE caminhoneiro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
