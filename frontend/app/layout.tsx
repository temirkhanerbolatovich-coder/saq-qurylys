import type { Metadata } from "next";
import { Suspense } from "react";
import { Providers } from "@/components/workspace";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAQ QURYLYS · Мониторинг",
  description: "Рабочее место аналитика для проверки признаков риска",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Suspense fallback={<main className="boot">Загрузка…</main>}>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
