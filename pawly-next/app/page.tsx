'use client';
import dynamic from 'next/dynamic';

// 整站是客户端 SPA（沿用原型的前端路由），关闭 SSR 以避免 window 相关问题
const App = dynamic(() => import('@/components/App'), { ssr: false });

export default function Page() {
  return <App />;
}
