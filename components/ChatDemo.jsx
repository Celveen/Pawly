// 首屏 AI 对话演示：自动打字循环播放一段真实风格的问答，
// 让新用户 5 秒内看懂「这是一个会养宠、答案有出处、需要才推荐」的 AI。
// 纯前端脚本演示，不消耗真实 AI 额度；点击任意处唤起真正的宝莉助手。
import { useState, useEffect, useRef } from 'react';
import { CatMascot } from './Mascot';
import { Emoji } from './Emoji';

// 演示脚本：一条新手高频问题 → 有出处的回答 → 顺手给出方案
const SCRIPT = [
  { role: 'user', text: '我家柴犬两个月大，第一次养，怎么喂？' },
  {
    role: 'ai',
    text: '两个月的幼犬刚离乳，肠胃还很娇嫩：\n· 幼犬粮温水泡软，每天 4 顿少量多餐\n· 别喂牛奶和人的饭菜\n· 换粮要用 7 天慢慢过渡',
    source: '依据 WSAVA 幼犬喂养指南',
  },
  {
    role: 'ai',
    proposal: { title: '新手柴犬开伙清单', items: [
      { e: '🍼', n: '幼犬奶糕成长粮' }, { e: '🥣', n: '慢食碗' }, { e: '💊', n: '幼犬益生菌' },
    ], price: '¥216' },
  },
  { role: 'user', text: '需要驱虫吗？' },
  {
    role: 'ai',
    text: '需要，而且从 2 周龄就该开始。幼犬常带蛔虫，之后每 2 周一次直到断奶后，再改为每月一次。具体用药请遵医嘱。',
    source: '依据 ESCCAP 驱虫指南',
  },
];

const TYPE_SPEED = 34;       // AI 打字速度 ms/字
const STEP_GAP = 900;        // 消息之间停顿
const LOOP_GAP = 5200;       // 一轮播完后的停顿
const USER_THINK = 700;      // 用户消息"输入中"时长

export function ChatDemo({ onOpenChat }) {
  // done: 已完整显示的消息数；typing: 当前正在打字的消息已显示字数（-1 表示"输入中"点点）
  const [done, setDone] = useState(0);
  const [typed, setTyped] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const scrollRef = useRef(null);
  const reduced = useRef(false);

  useEffect(() => {
    try { reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reduced.current) setDone(SCRIPT.length);
  }, []);

  useEffect(() => {
    if (reduced.current) return;
    if (done >= SCRIPT.length) {
      const t = setTimeout(() => { setDone(0); setTyped(0); }, LOOP_GAP);
      return () => clearTimeout(t);
    }
    const cur = SCRIPT[done];
    if (cur.proposal) { // 方案卡整体浮现
      const t = setTimeout(() => { setDone((d) => d + 1); setTyped(0); }, STEP_GAP);
      return () => clearTimeout(t);
    }
    if (cur.role === 'user') { // 用户消息：短暂"输入中"后整条出现
      setWaiting(true);
      const t = setTimeout(() => { setWaiting(false); setDone((d) => d + 1); setTyped(0); }, USER_THINK);
      return () => clearTimeout(t);
    }
    // AI 消息：逐字打出
    if (typed < cur.text.length) {
      const t = setTimeout(() => setTyped((n) => n + 1), TYPE_SPEED);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setDone((d) => d + 1); setTyped(0); }, STEP_GAP);
    return () => clearTimeout(t);
  }, [done, typed]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [done, typed, waiting]);

  const visible = SCRIPT.slice(0, done);
  const cur = done < SCRIPT.length ? SCRIPT[done] : null;
  const curTyping = cur && cur.role === 'ai' && !cur.proposal && typed > 0;

  return (
    <div className="chat-demo" role="img" aria-label="宝莉助手对话演示" onClick={onOpenChat}
      style={{ cursor: 'pointer', height: 470, width: '100%', maxWidth: 420 }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--line-2)', background: 'var(--surface)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', position: 'relative' }}>
          <CatMascot size={32} />
          <span style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: 999, background: '#5FA46B', border: '2px solid var(--surface)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>宝莉助手</div>
          <div className="caption" style={{ fontSize: 11 }}>在线 · 回答有出处</div>
        </div>
        <span className="badge">演示</span>
      </div>

      {/* 消息流 */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'hidden', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map((m, i) => <DemoMsg key={i} m={m} />)}
        {curTyping && <DemoMsg m={{ role: 'ai', text: cur.text.slice(0, typed), source: typed >= cur.text.length ? cur.source : null }} caret />}
        {waiting && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ padding: '10px 14px', borderRadius: '16px 16px 4px 16px', background: 'var(--surface-2)', display: 'flex', gap: 4 }}>
              {[0, 150, 300].map((d) => <span key={d} style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--ink-3)', animation: `typingDot 1.1s ${d}ms infinite` }} />)}
            </div>
          </div>
        )}
      </div>

      {/* 底部：引导真实对话 */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line-2)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 38, borderRadius: 9, border: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 13, color: 'var(--ink-3)' }}>
          点这里，问问你家毛孩子的事…
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /></svg>
        </div>
      </div>
    </div>
  );
}

function DemoMsg({ m, caret }) {
  if (m.proposal) {
    return (
      <div className="fade-up" style={{ marginLeft: 8, border: '1px solid var(--line)', borderRadius: 14, padding: 12, background: 'var(--surface)' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          {m.proposal.title}
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--accent)', color: '#FFF7EE' }}>AI 方案</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {m.proposal.items.map((it) => (
            <div key={it.n} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-2)' }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}><Emoji text={it.e} size={14} /></span>
              {it.n}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <span className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{m.proposal.price}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>一键加购 →</span>
        </div>
      </div>
    );
  }
  const isUser = m.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '84%', padding: '10px 14px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? 'var(--ink)' : 'var(--surface-2)',
        color: isUser ? 'var(--bg)' : 'var(--ink)',
      }}>
        {m.text}{caret && <span className="chat-demo-caret" />}
        {m.source && (
          <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1px dashed var(--line)', fontSize: 11, color: 'var(--sage)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            {m.source}
          </div>
        )}
      </div>
    </div>
  );
}
