import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Nexio | Gestión de Capital Humano",
  description: "Plataforma de gestión de capital humano para empresas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: el script anti-flash modifica <html data-theme>
    // antes de que React hidrate. React espera que el DOM coincida con el SSR,
    // pero este desfase es intencional (evita FOUC). Suprimirlo es la práctica
    // recomendada de Next.js para theming con scripts pre-hidratación.
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply stored theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nexio-theme');var d=document.documentElement;if(t==='light'){d.setAttribute('data-theme','light');}else{d.setAttribute('data-theme','dark');}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${dmSans.variable} font-sans antialiased bg-base text-foreground`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
