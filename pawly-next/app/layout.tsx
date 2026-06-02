import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pawly 宝莉 · AI 导购骨架',
  description: 'Next.js 全栈骨架 — 单主 Agent + 工具调用',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
