import type { Metadata } from "next";
import { Suspense } from "react";
import { Providers } from "@/components/workspace";
import { LocaleProvider } from "@/lib/locale";
import "./globals.css";
import "./design-system.css";
import "./redesign.css";
import "../components/dossier-records.css";
import "./shell-redesign.css";

export const metadata: Metadata = {
  title: "SAQ QURYLYS · Мониторинг",
  description: "Рабочее место аналитика для проверки признаков риска",
  icons: { icon: "/saq-logo.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Suspense fallback={<main className="boot">Загрузка…</main>}>
          <LocaleProvider>
            <Providers>{children}</Providers>
          </LocaleProvider>
        </Suspense>
      </body>
    </html>
  );
}
