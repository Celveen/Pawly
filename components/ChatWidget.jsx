// 浮窗 AI 客服「宝莉助手」—— 集成进完整网站，调用后端 /api/chat（单主 Agent + 工具）
import { useState, useRef, useEffect } from 'react';
import { fmt } from './util';
import { PRODUCTS } from './data';

const ASSISTANT_NAME = '宝莉助手';

const PawIcon = ({ size = 26, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <ellipse cx="9" cy="11.5" rx="2.8" ry="3.3" fill={color} />
    <ellipse cx="16" cy="8.5" rx="2.8" ry="3.3" fill={color} />
    <ellipse cx="23" cy="11.5" rx="2.8" ry="3.3" fill={color} />
    <ellipse cx="6" cy="18.5" rx="2.4" ry="2.8" fill={color} />
    <ellipse cx="26" cy="18.5" rx="2.4" ry="2.8" fill={color} />
    <path d="M9 22c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5c0 2.6-2.4 4.5-7 4.5S9 24.6 9 22Z" fill={color} />
  </svg>
);

const QUICK_PROMPTS = ['我家狗刚到家，怎么养', '帮我家猫挑款主食', '狗狗肠胃不好吃什么', '会员有什么权益？'];

async function callAI(messages) {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!r.ok) throw new Error('bad');
  return r.json(); // { reply, proposals }
}

function readPos() {
  try {
    const saved = JSON.parse(localStorage.getItem('pawly.chatPos') || 'null');
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') return saved;
  } catch (e) {}
  return { x: 24, y: 24 };
}

export default function ChatWidget({ onAdd, navigate, onCartOpen }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `你好呀铲屎官~ 我是${ASSISTANT_NAME} 🐾\n告诉我你家毛孩子的情况（比如"我家柴犬2个月"），我会记下来，照着 TA 帮你挑东西、给建议。` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [pos, setPos] = useState(readPos);
  const [dragging, setDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const dragStateRef = useRef({ moved: false });
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, loading]);
  useEffect(() => { if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 200); } }, [open]);

  // 首次进入：延迟弹出"试试我"冒泡提示；用户用过客服后不再打扰
  useEffect(() => {
    let engaged = false;
    try { engaged = localStorage.getItem('pawly.chatEngaged') === '1'; } catch (e) {}
    if (engaged) return;
    const showT = setTimeout(() => setShowHint(true), 1800);
    const hideT = setTimeout(() => setShowHint(false), 13000); // 约 11 秒后自动消失
    return () => { clearTimeout(showT); clearTimeout(hideT); };
  }, []);
  // 打开客服即视为已发现，关闭提示且不再弹出
  useEffect(() => {
    if (open) { setShowHint(false); try { localStorage.setItem('pawly.chatEngaged', '1'); } catch (e) {} }
  }, [open]);
  useEffect(() => { try { localStorage.setItem('pawly.chatPos', JSON.stringify(pos)); } catch (e) {} }, [pos]);
  useEffect(() => {
    const clamp = () => setPos((p) => ({ x: Math.max(8, Math.min(window.innerWidth - 76, p.x)), y: Math.max(8, Math.min(window.innerHeight - 76, p.y)) }));
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, []);

  const sendToAI = async (userText) => {
    const newMsgs = [...messages, { role: 'user', text: userText }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const claudeMessages = newMsgs.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }));
      const { reply, proposals } = await callAI(claudeMessages);
      setMessages((m) => [...m, { role: 'assistant', text: reply || '抱歉，我刚走神了，再说一次？', proposals: proposals && proposals.length ? proposals : undefined }]);
      if (!open) setUnread((u) => u + 1);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: '哎呀，我这边网络有点问题，稍后再问我？' }]);
    } finally {
      setLoading(false);
    }
  };

  const adoptProposal = (proposal) => {
    const picked = (proposal.productIds || []).map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
    if (!picked.length) return;
    picked.forEach((p) => onAdd && onAdd(p, 1));
    setMessages((m) => [...m, { role: 'assistant', text: `已把【${proposal.title}】的 ${picked.length} 件商品加入购物车，帮你跳到结算页啦 🐾` }]);
    setOpen(false);
    if (navigate) navigate({ page: 'checkout' });
    else if (onCartOpen) onCartOpen();
  };

  const handleSend = () => { const text = input.trim(); if (!text || loading) return; setInput(''); sendToAI(text); };
  const handleQuick = (text) => { if (!loading) sendToAI(text); };

  const onLauncherDown = (e) => {
    if (e.button !== 0) return;
    const startX = e.clientX, startY = e.clientY;
    const startPos = { ...pos };
    dragStateRef.current = { moved: false };
    const move = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!dragStateRef.current.moved && Math.abs(dx) + Math.abs(dy) > 4) { dragStateRef.current.moved = true; setDragging(true); }
      if (dragStateRef.current.moved) setPos({ x: Math.max(8, Math.min(window.innerWidth - 68, startPos.x + dx)), y: Math.max(8, Math.min(window.innerHeight - 68, startPos.y - dy)) });
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      if (!dragStateRef.current.moved) setOpen((o) => !o);
      setDragging(false);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };

  const onPanelDragDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startPos = { ...pos };
    const move = (ev) => setPos({ x: Math.max(8, Math.min(window.innerWidth - 68, startPos.x + (ev.clientX - startX))), y: Math.max(8, Math.min(window.innerHeight - 68, startPos.y - (ev.clientY - startY))) });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); setDragging(false); };
    setDragging(true);
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };

  const panelW = 380, panelH = 580;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const panelLeft = pos.x + panelW + 16 < vw ? pos.x : Math.max(8, vw - panelW - 8);
  const panelBottom = pos.y + 76 + panelH < vh ? pos.y + 76 : Math.max(8, pos.y);

  return (
    <>
      <div style={{
        position: 'fixed', left: panelLeft, bottom: panelBottom, zIndex: 79,
        width: `min(${panelW}px, calc(100vw - 32px))`, height: `min(${panelH}px, calc(100vh - 140px))`,
        background: 'var(--bg)', borderRadius: 24,
        boxShadow: '0 24px 64px -16px rgba(38,70,83,.30), 0 8px 16px rgba(0,0,0,.06)',
        border: '1px solid var(--line-2)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transformOrigin: 'bottom left',
        transform: open ? 'scale(1) translateY(0)' : 'scale(.92) translateY(12px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: dragging ? 'none' : 'transform .25s cubic-bezier(.22,.61,.36,1), opacity .2s, left .25s, bottom .25s',
      }}>
        <div onPointerDown={onPanelDragDown} style={{ padding: '18px 20px', borderBottom: '1px solid var(--line-2)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 14, cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 32, height: 4, borderRadius: 999, background: 'var(--line)', opacity: .5 }} />
          <div style={{ position: 'relative', width: 42, height: 42, borderRadius: 12, background: 'var(--primary)', display: 'grid', placeItems: 'center', boxShadow: 'inset 0 -2px 4px rgba(0,0,0,.08), 0 4px 10px -4px var(--primary)', color: 'white' }}>
            <PawIcon size={22} color="white" />
            <span style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 999, background: '#22C55E', border: '2px solid var(--surface)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{ASSISTANT_NAME}</div>
            <div className="caption" style={{ fontSize: 11.5, marginTop: 1 }}>在线 · 会记住你家毛孩子 · 拖动头部可移动</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} onPointerDown={(e) => e.stopPropagation()} aria-label="收起" style={{ width: 32, height: 32, border: 0, borderRadius: 999, background: 'transparent', color: 'var(--ink-2)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i}>
              <Bubble role={m.role} text={m.text} />
              {m.proposals && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 36, marginTop: 8 }}>
                  {m.proposals.map((pr, j) => <ProposalCard key={j} proposal={pr} onAdopt={() => adoptProposal(pr)} />)}
                </div>
              )}
            </div>
          ))}
          {loading && <TypingBubble />}
          {messages.length <= 1 && !loading && (
            <div style={{ marginTop: 12 }}>
              <div className="caption" style={{ marginBottom: 8, fontSize: 11 }}>试试这些：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_PROMPTS.map((q) => (
                  <button key={q} onClick={() => handleQuick(q)} style={{ height: 30, padding: '0 12px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{q}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 16px 16px', borderTop: '1px solid var(--line-2)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--bg)', borderRadius: 22, border: '1px solid var(--line)', padding: '6px 6px 6px 14px' }}>
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="问点什么吧... (Enter 发送)" rows={1}
              style={{ flex: 1, resize: 'none', border: 0, outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.4, color: 'var(--ink)', padding: '8px 0', maxHeight: 100 }} />
            <button onClick={handleSend} disabled={!input.trim() || loading} aria-label="发送"
              style={{ width: 36, height: 36, borderRadius: 999, border: 0, background: input.trim() && !loading ? 'var(--primary)' : 'var(--surface-2)', color: input.trim() && !loading ? 'white' : 'var(--ink-3)', display: 'grid', placeItems: 'center', cursor: input.trim() && !loading ? 'pointer' : 'default', transition: 'all .15s' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /></svg>
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--ink-3)' }}>
            <span>AI 回复仅供参考</span>
          </div>
        </div>
      </div>

      {/* 首次进入：脉冲光圈 + 可关闭的冒泡提示 */}
      {showHint && !open && (
        <>
          <div aria-hidden style={{
            position: 'fixed', left: pos.x, bottom: pos.y, width: 60, height: 60, borderRadius: 999,
            zIndex: 79, pointerEvents: 'none', animation: 'launcherPulse 1.8s ease-out infinite',
          }} />
          <div onClick={() => setOpen(true)} role="button" style={{
            position: 'fixed', left: pos.x, bottom: pos.y + 74, zIndex: 81, cursor: 'pointer',
            width: 'min(78vw, 230px)',
            background: 'var(--surface)', color: 'var(--ink)',
            border: '1px solid var(--line)', borderRadius: 16, padding: '12px 34px 12px 14px',
            boxShadow: '0 16px 36px -10px rgba(38,70,83,.35)',
            animation: 'hintPop .3s cubic-bezier(.22,.61,.36,1) both',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>🐾 我是宝莉助手</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              试试问我「帮我家狗挑款狗粮」，照着你家毛孩子一步帮你选好 →
            </div>
            <button onClick={(e) => { e.stopPropagation(); setShowHint(false); }} aria-label="关闭提示"
              style={{
                position: 'absolute', top: 6, right: 6, width: 22, height: 22, border: 0, borderRadius: 999,
                background: 'var(--surface-2)', color: 'var(--ink-3)', cursor: 'pointer',
                display: 'grid', placeItems: 'center', fontSize: 14, lineHeight: 1,
              }}>×</button>
            {/* 指向按钮的小尾巴 */}
            <div aria-hidden style={{
              position: 'absolute', left: 22, bottom: -7, width: 14, height: 14, background: 'var(--surface)',
              borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)', transform: 'rotate(45deg)',
            }} />
          </div>
        </>
      )}

      <button onPointerDown={onLauncherDown} aria-label="打开宝莉助手 (可拖动)" title="点击打开 · 长按拖动"
        style={{
          position: 'fixed', left: pos.x, bottom: pos.y, zIndex: 80, width: 60, height: 60, borderRadius: 999,
          background: 'linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 70%, var(--accent) 30%))',
          color: 'white', border: 0, cursor: dragging ? 'grabbing' : 'grab', display: 'grid', placeItems: 'center',
          boxShadow: '0 12px 32px -8px color-mix(in oklch, var(--primary) 60%, transparent), 0 4px 8px rgba(0,0,0,.10)',
          transition: dragging ? 'none' : 'transform .2s cubic-bezier(.22,.61,.36,1), left .2s, bottom .2s',
          transform: open ? 'scale(.92)' : 'scale(1)', touchAction: 'none',
        }}>
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6 18 18 M18 6 6 18" /></svg>
        ) : (<PawIcon size={26} color="white" />)}
        {!open && unread > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: 'var(--accent)', color: '#2a1a0a', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)' }}>{unread}</span>
        )}
      </button>
    </>
  );
}

// 把单行里的 **加粗** / *斜体* 转成 React 节点（大模型常用的轻量 Markdown）
function renderInline(line, keyBase) {
  const nodes = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) nodes.push(line.slice(last, m.index));
    if (m[1] != null) nodes.push(<strong key={`${keyBase}-${i++}`}>{m[1]}</strong>);
    else nodes.push(<em key={`${keyBase}-${i++}`}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < line.length) nodes.push(line.slice(last));
  return nodes;
}

// 渲染大模型返回的轻量 Markdown：加粗、斜体、无序列表、#### 小标题
function MarkdownText({ text }) {
  const lines = String(text).split('\n');
  return (
    <>
      {lines.map((raw, i) => {
        const line = raw.replace(/\t/g, '  ');
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        if (bullet) {
          return (
            <div key={i} style={{ display: 'flex', gap: 6, paddingLeft: 2 }}>
              <span style={{ flexShrink: 0, color: 'var(--primary)' }}>•</span>
              <span>{renderInline(bullet[1], i)}</span>
            </div>
          );
        }
        const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
        if (heading) return <div key={i} style={{ fontWeight: 700, margin: '2px 0' }}>{renderInline(heading[1], i)}</div>;
        if (line.trim() === '') return <div key={i} style={{ height: 6 }} />;
        return <div key={i}>{renderInline(line, i)}</div>;
      })}
    </>
  );
}

function Bubble({ role, text }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', animation: 'fadeUp .25s ease both' }}>
      {!isUser && <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'var(--primary)', display: 'grid', placeItems: 'center', marginRight: 8, marginTop: 'auto', color: 'white' }}><PawIcon size={16} color="white" /></div>}
      <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isUser ? 'var(--ink)' : 'var(--surface)', color: isUser ? 'var(--bg)' : 'var(--ink)', fontSize: 13.5, lineHeight: 1.55, whiteSpace: isUser ? 'pre-wrap' : 'normal', border: isUser ? 0 : '1px solid var(--line-2)', boxShadow: isUser ? 'none' : 'var(--shadow-sm)' }}>{isUser ? text : <MarkdownText text={text} />}</div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'var(--primary)', display: 'grid', placeItems: 'center', color: 'white' }}><PawIcon size={16} color="white" /></div>
      <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'var(--surface)', border: '1px solid var(--line-2)', display: 'flex', gap: 4, alignItems: 'center' }}>
        <Dot delay={0} /><Dot delay={150} /><Dot delay={300} />
      </div>
      <style>{`@keyframes bounceDot { 0%, 60%, 100%{transform: translateY(0); opacity:.4;} 30%{transform: translateY(-4px); opacity: 1;} }`}</style>
    </div>
  );
}
function Dot({ delay }) {
  return <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink-3)', display: 'inline-block', animation: `bounceDot 1.1s ${delay}ms infinite` }} />;
}

function ProposalCard({ proposal, onAdopt }) {
  const items = (proposal.productIds || []).map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  if (!items.length) return null;
  const total = items.reduce((s, p) => s + p.price, 0);
  const was = items.reduce((s, p) => s + (p.was || p.price), 0);
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 14, animation: 'fadeUp .25s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{proposal.title}</span>
        {proposal.badge && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--accent)', color: '#2a1a0a', whiteSpace: 'nowrap' }}>{proposal.badge}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {items.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: p.bg, display: 'grid', placeItems: 'center', fontSize: 18 }}>{p.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.sub}</div>
            </div>
            <div className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{fmt(p.price)}</div>
          </div>
        ))}
      </div>
      {proposal.reason && <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-2)', background: 'var(--bg)', borderRadius: 10, padding: '8px 10px', marginBottom: 10 }}>💡 {proposal.reason}</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{fmt(total)}</span>
          {was > total && <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textDecoration: 'line-through', marginLeft: 6 }}>{fmt(was)}</span>}
        </div>
        <button onClick={onAdopt} className="btn btn-primary btn-sm">采用此方案 →</button>
      </div>
    </div>
  );
}
