// 消息中心（小红书式私信）：左侧会话列表 + 右侧对话窗。
// 打开会话即标记已读；对话窗每 5 秒轮询新消息，会话列表每 15 秒刷新。
// 数据接口：/api/dm /api/dm/thread /api/dm/unread
import { useState, useEffect, useCallback, useRef } from 'react';
import { Emoji } from './Emoji';
import { Avatar } from './ui';
import { timeAgo, compressImage } from './PagesCommunity';

// 聊天常用表情：从站内 Fluent 图集里挑一组养宠场景用得上的
const CHAT_EMOJIS = [
  '😺', '😸', '🐱', '🐶', '🐕', '🐾', '🦴', '🎾', '🧶', '🥣',
  '🍗', '🐟', '🩺', '💊', '💉', '🧴', '🛁', '🏠', '📦', '🌿',
  '✨', '⭐', '🎁', '🎉', '💚', '👍', '🙏', '😂', '🥹', '👀',
];

// 两条消息间隔超过 5 分钟就插一条时间分隔，避免每条都挂时间戳显得碎
const TIME_GAP_MS = 5 * 60 * 1000;
function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (sameDay) return hhmm;
  const yesterday = new Date(today.getTime() - 86400000);
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${hhmm}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hhmm}`;
}

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
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>
                    全部会话{conversations?.length ? ` · ${conversations.length}` : ''}
                  </span>
                </div>
                {/* 找人：宝狸号 / 手机号 / 邮箱 / 昵称 */}
                <UserSearch onPick={(u) => setPeerId(u.id)} />
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
                <ChatThread peerId={peerId} navigate={navigate} onSent={loadConversations} onRead={loadConversations}
                  onDeleted={() => { setPeerId(null); loadConversations(); }} />
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

// 单个对话：消息气泡（支持图片）+ 表情面板 + 已读回执，5 秒轮询增量
export function ChatThread({ peerId, navigate, onSent, onRead, onDeleted }) {
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [pending, setPending] = useState([]); // 待发送的图片（dataURL）
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const emojiRef = useRef(null);
  const inputRef = useRef(null);
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

  useEffect(() => { setData(null); setError(''); setPending([]); load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => load(true), 5000);
    return () => clearInterval(t);
  }, [load]);

  // 点面板外关闭表情盘
  useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setEmojiOpen(false); };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [emojiOpen]);

  // 只有原本就贴着底部时才自动滚到底，避免打断正在往上翻看历史的用户
  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [data?.messages?.length, pending.length]);

  async function pickImages(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    const room = 3 - pending.length;
    if (room <= 0) { setError('单条消息最多 3 张图片'); return; }
    setError('');
    try {
      const shots = await Promise.all(files.slice(0, room).map((f) => compressImage(f, { max: 1080, quality: 0.72 })));
      setPending((p) => [...p, ...shots]);
    } catch { setError('图片处理失败，换一张试试'); }
  }

  function insertEmoji(em) {
    setText((t) => (t + em).slice(0, 500));
    inputRef.current?.focus();
  }

  async function send() {
    const content = text.trim();
    if ((!content && pending.length === 0) || sending) return;
    setSending(true); setError('');
    try {
      const r = await fetch('/api/dm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId, content, images: pending }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || '发送失败');
      setText(''); setPending([]); setEmojiOpen(false);
      atBottomRef.current = true;
      setData((prev) => (prev ? { ...prev, messages: [...prev.messages, d] } : prev));
      onSent?.();
    } catch (e) { setError(e.message); } finally { setSending(false); }
  }

  async function removeConversation() {
    if (!window.confirm('删除后这段聊天记录双方都看不到了，确定删除吗？')) return;
    try {
      await fetch(`/api/dm?peerId=${encodeURIComponent(peerId)}`, { method: 'DELETE' });
      onDeleted?.();
    } catch {}
  }

  const messages = data?.messages || [];
  const peerReadAt = data?.peerReadAt ? new Date(data.peerReadAt).getTime() : 0;
  // 我发的最后一条：若对方已读到它之后，就在气泡下标"已读"
  const lastMineIdx = (() => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].mine) return i; return -1; })();

  return (
    <>
      {/* 对话头：点昵称进对方主页；右侧删除会话 */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {data?.peer ? (
          <button onClick={() => navigate?.({ page: 'profile', userId: data.peer.id })}
            style={{ display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'transparent', padding: 0, cursor: 'pointer' }}>
            <Avatar url={data.peer.avatarUrl} emoji={data.peer.avatarEmoji} size={34} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{data.peer.nickname}</span>
          </button>
        ) : <span className="caption">加载中…</span>}
        <span style={{ flex: 1 }} />
        {data?.peer && (
          <button onClick={removeConversation} className="btn btn-ghost btn-sm" title="删除会话"
            style={{ width: 32, padding: 0, justifyContent: 'center', color: 'var(--ink-3)' }} aria-label="删除会话">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        )}
      </div>

      {/* 消息列表 */}
      <div ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 320 }}>
        {data === null && !error && <p className="caption" style={{ textAlign: 'center', margin: 'auto' }}>加载中…</p>}
        {data && messages.length === 0 && (
          <p className="caption" style={{ textAlign: 'center', margin: 'auto' }}>还没有消息，打个招呼吧～</p>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showTime = !prev || new Date(m.createdAt) - new Date(prev.createdAt) > TIME_GAP_MS;
          const read = m.mine && i === lastMineIdx && peerReadAt >= new Date(m.createdAt).getTime();
          return (
            <div key={m.id}>
              {showTime && (
                <div className="caption" style={{ textAlign: 'center', fontSize: 11, margin: '10px 0 6px' }}>{dayLabel(m.createdAt)}</div>
              )}
              <div style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                <div style={{ maxWidth: '72%' }}>
                  {m.content && (
                    <div style={{
                      padding: '10px 14px', borderRadius: 16,
                      borderBottomRightRadius: m.mine ? 4 : 16, borderBottomLeftRadius: m.mine ? 16 : 4,
                      background: m.mine ? 'var(--ink)' : 'var(--surface-2)',
                      color: m.mine ? 'var(--bg)' : 'var(--ink)',
                      fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>{m.content}</div>
                  )}
                  {m.images?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: m.content ? 6 : 0, justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
                      {m.images.map((src, k) => (
                        <img key={k} src={src} alt="" onClick={() => setLightbox(src)}
                          style={{ width: m.images.length === 1 ? 160 : 96, height: m.images.length === 1 ? 160 : 96,
                            objectFit: 'cover', borderRadius: 12, cursor: 'zoom-in', border: '1px solid var(--line-2)' }} />
                      ))}
                    </div>
                  )}
                  {read && <div className="caption" style={{ fontSize: 10.5, marginTop: 3, textAlign: 'right' }}>已读</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 输入区：表情、图片、待发送预览 */}
      <div style={{ borderTop: '1px solid var(--line-2)', padding: 14, flexShrink: 0, position: 'relative' }}>
        {error && <div className="caption" style={{ color: 'var(--accent)', marginBottom: 8 }}>{error}</div>}

        {pending.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {pending.map((src, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={src} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line-2)' }} />
                <button onClick={() => setPending((p) => p.filter((_, k) => k !== i))} aria-label="移除图片"
                  style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 999, border: 0,
                    background: 'var(--ink)', color: 'var(--bg)', fontSize: 12, lineHeight: 1, cursor: 'pointer' }}>×</button>
              </div>
            ))}
          </div>
        )}

        {emojiOpen && (
          <div ref={emojiRef} style={{
            position: 'absolute', left: 14, bottom: 70, width: 300, padding: 10, zIndex: 5,
            background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 14,
            boxShadow: 'var(--shadow-lg)', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4,
          }}>
            {CHAT_EMOJIS.map((em) => (
              <button key={em} onClick={() => insertEmoji(em)} aria-label={em}
                style={{ border: 0, background: 'transparent', padding: 4, cursor: 'pointer', borderRadius: 6, lineHeight: 0 }}>
                <Emoji text={em} size={20} />
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button onClick={() => setEmojiOpen((v) => !v)} className="btn btn-ghost btn-sm" aria-label="表情"
            style={{ width: 38, padding: 0, justifyContent: 'center', flexShrink: 0 }}>
            <Emoji text="😺" size={18} />
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn btn-ghost btn-sm" aria-label="发送图片"
            style={{ width: 38, padding: 0, justifyContent: 'center', flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 4" />
            </svg>
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={pickImages} style={{ display: 'none' }} />
          <textarea ref={inputRef} className="input" rows={1} placeholder="说点什么…（Enter 发送）"
            maxLength={500} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            style={{ flex: 1, resize: 'none', height: 'auto', minHeight: 46, paddingTop: 12, lineHeight: 1.5, borderRadius: 12 }} />
          <button className="btn btn-primary" onClick={send} disabled={sending || (!text.trim() && pending.length === 0)}>
            {sending ? '发送中' : '发送'}
          </button>
        </div>
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(31,42,29,.86)', display: 'grid', placeItems: 'center', padding: 24, cursor: 'zoom-out' }}>
          <img src={lightbox} alt="" style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 12 }} />
        </div>
      )}
    </>
  );
}

// 找人：输入宝狸号 / 手机号 / 邮箱可精确找到，输昵称做模糊匹配
function UserSearch({ onPick }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const kw = q.trim();
    if (kw.length < 2) { setResults(null); return; }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(kw)}`);
        const d = r.ok ? await r.json() : { users: [] };
        setResults(d.users || []);
      } catch { setResults([]); } finally { setBusy(false); }
    }, 300);
    return () => { clearTimeout(t); setBusy(false); };
  }, [q]);

  return (
    <div style={{ position: 'relative' }}>
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="搜宝狸号 / 手机号 / 邮箱 / 昵称"
        style={{ height: 38, fontSize: 13, paddingLeft: 34 }} />
      <svg style={{ position: 'absolute', left: 12, top: 11 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
      </svg>

      {q.trim().length >= 2 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 44, zIndex: 10, maxHeight: 300, overflowY: 'auto',
          background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 12, boxShadow: 'var(--shadow-lg)',
        }}>
          {busy && results === null && <p className="caption" style={{ padding: 14, margin: 0 }}>搜索中…</p>}
          {results?.length === 0 && (
            <p className="caption" style={{ padding: 14, margin: 0 }}>没找到这个人，确认下宝狸号或账号是否正确</p>
          )}
          {results?.map((u) => (
            <button key={u.id} onClick={() => { onPick(u); setQ(''); setResults(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
              <Avatar url={u.avatarUrl} emoji={u.avatarEmoji} size={34} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nickname}</span>
                <span className="caption mono" style={{ fontSize: 11 }}>{u.pawlyId || ''}</span>
              </span>
              <span className="caption" style={{ fontSize: 11, flexShrink: 0 }}>发消息 →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
