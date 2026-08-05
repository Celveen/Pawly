// 消息中心（小红书式私信）：左侧会话列表 + 右侧对话窗。
// 打开会话即标记已读；对话窗每 5 秒轮询新消息，会话列表每 15 秒刷新。
// 数据接口：/api/dm /api/dm/thread /api/dm/unread
import { useState, useEffect, useCallback, useRef } from 'react';
import { Emoji } from './Emoji';
import { Avatar } from './ui';
import { timeAgo } from './PagesCommunity';

export function MessagesPage({ navigate, initialPeerId }) {
  const [conversations, setConversations] = useState(null);
  const [peerId, setPeerId] = useState(initialPeerId || null);
  const [needLogin, setNeedLogin] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const r = await fetch('/api/dm');
      if (r.status === 401) { setNeedLogin(true); setConversations([]); return; }
      if (!r.ok) throw new Error();
      const d = await r.json();
      setConversations(d.conversations || []);
    } catch { setConversations([]); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  // 列表低频轮询：有人发来新消息时会话顺序与未读数会更新
  useEffect(() => {
    const t = setInterval(loadConversations, 15000);
    return () => clearInterval(t);
  }, [loadConversations]);

  if (needLogin) {
    return (
      <section><div className="container" style={{ textAlign: 'center', padding: '96px 0' }}>
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: 16 }}><Emoji text="💌" size={64} /></div>
        <h2 className="h-2" style={{ margin: '0 0 8px' }}>登录后才能收发私信</h2>
        <p className="body" style={{ margin: '0 0 20px' }}>私信仅对注册用户开放，避免匿名骚扰。</p>
        <button className="btn btn-primary" onClick={() => navigate({ page: 'member' })}>去登录 / 注册</button>
      </div></section>
    );
  }

  return (
    <>
      <section style={{ paddingTop: 56, paddingBottom: 24 }}>
        <div className="container">
          <div className="eyebrow eyebrow-rule" style={{ marginBottom: 16 }}>Pawly Messages · 私信</div>
          <h1 className="h-1" style={{ margin: 0 }}>和铲屎官们<span style={{ color: 'var(--green-soft)' }}>聊聊</span></h1>
        </div>
      </section>

      <section className="tint-band" style={{ padding: '28px 0 96px', borderRadius: '36px 36px 0 0' }}>
        <div className="container">
          <div className="m-1col dm-layout" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, minHeight: 520 }}>
            {/* 会话列表 */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-2)', fontSize: 14, fontWeight: 600 }}>
                全部会话{conversations?.length ? ` · ${conversations.length}` : ''}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: 560 }}>
                {conversations === null && <p className="caption" style={{ padding: '32px 20px', textAlign: 'center' }}>加载中…</p>}
                {conversations?.length === 0 && (
                  <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'grid', placeItems: 'center', marginBottom: 10 }}><Emoji text="🐾" size={44} /></div>
                    <p className="caption" style={{ margin: 0 }}>还没有会话<br />去社区里找人聊聊吧</p>
                  </div>
                )}
                {conversations?.map((c) => (
                  <button key={c.id} onClick={() => setPeerId(c.peerId)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', border: 0,
                      background: peerId === c.peerId ? 'var(--surface-2)' : 'transparent', textAlign: 'left', cursor: 'pointer',
                    }}>
                    <Avatar url={c.peerAvatarUrl} emoji={c.peerAvatar} size={42} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.peerName}</span>
                        <span className="caption" style={{ marginLeft: 'auto', fontSize: 11, whiteSpace: 'nowrap' }}>{timeAgo(c.lastMessageAt)}</span>
                      </span>
                      <span className="caption" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.lastMessage || '（还没有消息）'}
                      </span>
                    </span>
                    {c.unread > 0 && (
                      <span style={{
                        minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--accent)', color: '#FFF9F2',
                        fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{c.unread > 99 ? '99+' : c.unread}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 对话窗 */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 520 }}>
              {peerId ? (
                <ChatThread peerId={peerId} navigate={navigate} onSent={loadConversations} onRead={loadConversations} />
              ) : (
                <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 40, textAlign: 'center' }}>
                  <div>
                    <div style={{ display: 'grid', placeItems: 'center', marginBottom: 12 }}><Emoji text="💌" size={56} /></div>
                    <p className="caption" style={{ margin: 0 }}>选择左侧的会话开始聊天</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// 单个对话：消息气泡 + 输入框，5 秒轮询增量
export function ChatThread({ peerId, navigate, onSent, onRead, compact }) {
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const atBottomRef = useRef(true);

  const load = useCallback(async (silent = false) => {
    try {
      const r = await fetch(`/api/dm/thread?peerId=${encodeURIComponent(peerId)}`);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '加载失败');
      const d = await r.json();
      setData(d);
      if (!silent) onRead?.();
    } catch (e) { if (!silent) setError(e.message); }
  }, [peerId, onRead]);

  useEffect(() => { setData(null); setError(''); load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => load(true), 5000);
    return () => clearInterval(t);
  }, [load]);

  // 只有原本就贴着底部时才自动滚到底，避免打断正在往上翻看历史的用户
  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [data?.messages?.length]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true); setError('');
    try {
      const r = await fetch('/api/dm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId, content }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || '发送失败');
      setText('');
      atBottomRef.current = true;
      setData((prev) => (prev ? { ...prev, messages: [...prev.messages, d] } : prev));
      onSent?.();
    } catch (e) { setError(e.message); } finally { setSending(false); }
  }

  return (
    <>
      {/* 对话头：点昵称进对方主页 */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {data?.peer ? (
          <button onClick={() => navigate?.({ page: 'profile', userId: data.peer.id })}
            style={{ display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'transparent', padding: 0, cursor: 'pointer' }}>
            <Avatar url={data.peer.avatarUrl} emoji={data.peer.avatarEmoji} size={34} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{data.peer.nickname}</span>
          </button>
        ) : <span className="caption">加载中…</span>}
      </div>

      {/* 消息列表 */}
      <div ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: compact ? 260 : 320 }}>
        {data === null && !error && <p className="caption" style={{ textAlign: 'center', margin: 'auto' }}>加载中…</p>}
        {data?.messages?.length === 0 && (
          <p className="caption" style={{ textAlign: 'center', margin: 'auto' }}>还没有消息，打个招呼吧～</p>
        )}
        {data?.messages?.map((m) => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '72%' }}>
              <div style={{
                padding: '10px 14px', borderRadius: 16,
                borderBottomRightRadius: m.mine ? 4 : 16, borderBottomLeftRadius: m.mine ? 16 : 4,
                background: m.mine ? 'var(--ink)' : 'var(--surface-2)',
                color: m.mine ? 'var(--bg)' : 'var(--ink)',
                fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{m.content}</div>
              <div className="caption" style={{ fontSize: 11, marginTop: 4, textAlign: m.mine ? 'right' : 'left' }}>{timeAgo(m.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 输入区：Enter 发送，Shift+Enter 换行 */}
      <div style={{ borderTop: '1px solid var(--line-2)', padding: 14, flexShrink: 0 }}>
        {error && <div className="caption" style={{ color: 'var(--accent)', marginBottom: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea className="input" rows={1} placeholder="说点什么…（Enter 发送）"
            maxLength={500} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            style={{ flex: 1, resize: 'none', height: 'auto', minHeight: 46, paddingTop: 12, lineHeight: 1.5, borderRadius: 12 }} />
          <button className="btn btn-primary" onClick={send} disabled={sending || !text.trim()}>
            {sending ? '发送中' : '发送'}
          </button>
        </div>
      </div>
    </>
  );
}
