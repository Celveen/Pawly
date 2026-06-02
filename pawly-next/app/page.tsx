'use client';
import { useState, useRef, useEffect } from 'react';

interface Proposal { title: string; badge: string; productIds: string[]; reason: string; }
interface Msg { role: 'user' | 'assistant'; content: string; proposals?: Proposal[]; }

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: '你好呀铲屎官~ 我是宝莉助手 🐾 告诉我需求（比如"给糯米补点狗粮"），我帮你挑好方案。' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await r.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.reply, proposals: data.proposals }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: '网络出错了，请稍后再试。' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: 20, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ fontSize: 20 }}>🐾 Pawly 宝莉 · AI 导购（Next.js 骨架）</h1>
      <p style={{ fontSize: 13, color: '#264653a8', marginTop: -8 }}>单主 Agent + 工具调用（get_pet_profile / search_products / create_order）</p>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
        {messages.map((m, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.5,
                background: m.role === 'user' ? '#264653' : '#fff', color: m.role === 'user' ? '#fff' : '#264653',
                whiteSpace: 'pre-wrap', border: m.role === 'user' ? 'none' : '1px solid #26465318',
              }}>{m.content}</div>
            </div>
            {m.proposals?.map((p, j) => <ProposalCard key={j} proposal={p} />)}
          </div>
        ))}
        {loading && <div style={{ fontSize: 13, color: '#264653a8' }}>宝莉助手思考中…（会先查档案、查商品）</div>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
          placeholder="问点什么吧… 试试『给糯米补点狗粮』"
          style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid #26465330', fontSize: 14 }}
        />
        <button onClick={() => send(input)} disabled={loading || !input.trim()}
          style={{ padding: '0 18px', borderRadius: 12, border: 'none', background: '#264653', color: '#fff', cursor: 'pointer' }}>
          发送
        </button>
      </div>
    </main>
  );
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  return (
    <div style={{ marginTop: 8, marginLeft: 8, background: '#fff', border: '1px solid #26465320', borderRadius: 14, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: 14 }}>{proposal.title}</strong>
        {proposal.badge && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#F4A261', color: '#2a1a0a' }}>{proposal.badge}</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#264653a8', marginBottom: 8 }}>商品：{proposal.productIds.join(', ')}</div>
      {proposal.reason && (
        <div style={{ fontSize: 12.5, lineHeight: 1.5, background: '#EFF4F2', borderRadius: 8, padding: '8px 10px' }}>💡 {proposal.reason}</div>
      )}
    </div>
  );
}
