// 社区：铲屎官分享（小红书式瀑布流卡片 + 发帖 + 点赞）
// 帖子数据走 /api/posts，点赞走 /api/posts/like，身份沿用匿名 cookie 会话。
import { useState, useEffect, useCallback, useRef } from 'react';
import { Illo, ILLO_IDS } from './illos';

const TOPICS = [
  { id: 'all', name: '全部' },
  { id: '晒宠', name: '🐾 晒宠' },
  { id: '好物', name: '🧶 好物' },
  { id: '求助', name: '🩺 求助' },
  { id: '日常', name: '☀️ 日常' },
];

// 发帖封面底色（与全站商品卡的柔和色板一致）；封面图案用插画库 ILLO_IDS
const COVER_BGS = ['#F4D7B0', '#D3DEE2', '#E8D8C3', '#DCE5D4', '#EAD9DE', '#D9E2EA'];

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return '刚刚';
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

export function CommunityPage() {
  const [topic, setTopic] = useState('all');
  const [posts, setPosts] = useState(null); // null=加载中
  const [loadError, setLoadError] = useState('');
  const [composing, setComposing] = useState(false);
  const [expanded, setExpanded] = useState(null); // 展开阅读的帖子 id

  const load = useCallback(async (t = topic) => {
    setLoadError('');
    try {
      const r = await fetch(`/api/posts${t !== 'all' ? `?topic=${encodeURIComponent(t)}` : ''}`);
      if (!r.ok) throw new Error(`接口返回 ${r.status}`);
      setPosts(await r.json());
    } catch (e) {
      // 数据表未初始化 / 网络异常时不再永远"加载中"，给出可重试的提示
      setPosts([]);
      setLoadError(e.message || '加载失败');
    }
  }, [topic]);

  useEffect(() => { setPosts(null); load(topic); }, [topic, load]);

  async function toggleLike(p) {
    // 乐观更新，失败再回滚（重新拉取）
    setPosts((prev) => prev.map((x) => x.id === p.id
      ? { ...x, likedByMe: !x.likedByMe, likeCount: x.likeCount + (x.likedByMe ? -1 : 1) }
      : x));
    try {
      const r = await fetch('/api/posts/like', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: p.id }),
      });
      if (!r.ok) throw new Error();
    } catch { load(); }
  }

  async function removePost(p) {
    if (!window.confirm(`确定删除「${p.title}」吗？`)) return;
    await fetch(`/api/posts?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
    load();
  }

  return (
    <>
      <section style={{ paddingTop: 64, paddingBottom: 32 }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>Pawly Community · 铲屎官社区</div>
              <h1 className="h-1" style={{ margin: 0, maxWidth: 720 }}>晒宠、种草、抱团取暖。</h1>
              <p className="body-lg" style={{ marginTop: 20, maxWidth: 620 }}>发一篇你和毛孩子的日常，或者把踩过的坑分享给下一位铲屎官。</p>
            </div>
            <button className="btn btn-primary btn-lg" onClick={() => setComposing(true)}>✏️ 发布分享</button>
          </div>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--line-2)', borderBottom: '1px solid var(--line-2)' }}>
        <div className="container">
          <div className="h-scroll" style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
            {TOPICS.map((t) => (
              <button key={t.id} onClick={() => setTopic(t.id)}
                style={{ height: 40, padding: '0 16px', borderRadius: 999, border: 0, background: topic === t.id ? 'var(--ink)' : 'transparent', color: topic === t.id ? 'var(--bg)' : 'var(--ink)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section style={{ paddingTop: 48, paddingBottom: 96 }}>
        <div className="container">
          {posts === null && <p className="caption" style={{ textAlign: 'center', padding: '64px 0' }}>加载中…</p>}
          {posts && loadError && (
            <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: 8 }}><Illo id="vet" size={72} /></div>
              <h3 className="h-3" style={{ margin: '0 0 8px' }}>社区暂时打不开</h3>
              <p className="caption" style={{ margin: '0 0 8px' }}>{loadError}</p>
              <p className="caption" style={{ margin: '0 0 20px' }}>如果是刚部署的新版本，请确认已执行 <code className="mono">npx prisma db push</code> 同步社区数据表。</p>
              <button className="btn btn-primary" onClick={() => { setPosts(null); load(); }}>重试</button>
            </div>
          )}
          {posts && !loadError && posts.length === 0 && (
            <div style={{ padding: '96px 0', textAlign: 'center' }}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: 16 }}><Illo id="paw" size={88} /></div>
              <p className="body">这个话题还没有帖子，来发第一篇吧！</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setComposing(true)}>✏️ 发布分享</button>
            </div>
          )}
          {posts && posts.length > 0 && (
            /* 瀑布流：CSS columns 实现，卡片高度随内容自适应 */
            <div style={{ columns: '4 240px', columnGap: 20 }}>
              {posts.map((p) => (
                <PostCard key={p.id} p={p} expanded={expanded === p.id}
                  onExpand={() => setExpanded(expanded === p.id ? null : p.id)}
                  onLike={() => toggleLike(p)} onDelete={() => removePost(p)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {composing && <Composer onClose={() => setComposing(false)} onPosted={() => { setComposing(false); setTopic('all'); load('all'); }} />}
    </>
  );
}

function PostCard({ p, expanded, onExpand, onLike, onDelete }) {
  return (
    <article className="card fade-up" onClick={onExpand}
      style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', breakInside: 'avoid', marginBottom: 20, display: 'block' }}>
      <div style={{ background: p.bg, aspectRatio: expanded ? 'auto' : '4/3', minHeight: expanded ? 120 : undefined, display: 'grid', placeItems: 'center', position: 'relative' }}>
        <span className="pet-pill" style={{ position: 'absolute', top: 10, left: 10 }}>{p.topic}</span>
        <Illo id={p.emoji} size={88} />
      </div>
      <div style={{ padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, margin: 0 }}>{p.title}</h3>
        <p className="body" style={{ fontSize: 13, margin: '8px 0 0', ...(expanded ? { whiteSpace: 'pre-wrap' } : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>
          {p.content}
        </p>
        {p.petName && <div className="caption" style={{ marginTop: 8 }}>🐾 关联毛孩子：{p.petName}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line-2)' }}>
          <div style={{ width: 24, height: 24, borderRadius: 999, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', fontSize: 12, flexShrink: 0 }}>👤</div>
          <span className="caption" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.author} · {timeAgo(p.createdAt)}</span>
          {p.mine && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{ border: 0, background: 'transparent', color: 'var(--ink-3)', fontSize: 12, padding: 0 }}>删除</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onLike(); }} aria-label="点赞"
            style={{ border: 0, background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0, color: p.likedByMe ? '#D9826B' : 'var(--ink-3)', fontSize: 13, fontWeight: 600 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill={p.likedByMe ? '#D9826B' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.5-1.5 2-3.2 2-5a5 5 0 0 0-9-3 5 5 0 0 0-9 3c0 1.8.5 3.5 2 5l7 7 7-7Z" />
            </svg>
            {p.likeCount > 0 && <span className="mono">{p.likeCount}</span>}
          </button>
        </div>
      </div>
    </article>
  );
}

function Composer({ onClose, onPosted }) {
  const [form, setForm] = useState({ title: '', content: '', topic: '晒宠', emoji: 'dog', bg: COVER_BGS[0], petName: '', nickname: '' });
  const [pets, setPets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    fetch('/api/pets').then((r) => (r.ok ? r.json() : [])).then(setPets).catch(() => {});
  }, []);

  async function submit() {
    if (!form.title.trim() || !form.content.trim()) { setError('标题和内容都要填哦'); return; }
    setSaving(true); setError('');
    try {
      const r = await fetch('/api/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(), content: form.content.trim(), topic: form.topic,
          emoji: form.emoji, bg: form.bg,
          petName: form.petName || undefined, nickname: form.nickname.trim() || undefined,
        }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `发布失败（${r.status}）`); }
      onPosted();
    } catch (e) {
      setError(e.message || '发布失败，请重试');
      setSaving(false);
    }
  }

  return (
    /* 用 flex 容器居中弹层：不给对话框本身设 transform 定位，避免与打开动效的 transform 冲突 */
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(38,70,83,.35)', animation: 'fadeBg .2s ease' }} />
      <div role="dialog" aria-label="发布分享" style={{
        position: 'relative', width: 'min(640px, 100%)', maxHeight: 'calc(100vh - 64px)', overflowY: 'auto',
        background: 'var(--bg)', borderRadius: 24, padding: 32, boxShadow: '0 24px 64px -16px rgba(38,70,83,.35)',
        animation: 'dialogIn .28s cubic-bezier(.22,.61,.36,1) both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="eyebrow">New Post</div>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: '4px 0 0' }}>发布分享</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ width: 36, padding: 0, justifyContent: 'center' }} aria-label="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6 18 18 M18 6 6 18" /></svg>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {TOPICS.filter((t) => t.id !== 'all').map((t) => (
            <button key={t.id} onClick={() => setForm({ ...form, topic: t.id })}
              style={{ height: 34, padding: '0 14px', borderRadius: 999, border: form.topic === t.id ? '2px solid var(--ink)' : '1px solid var(--line)', background: form.topic === t.id ? 'var(--surface-2)' : 'transparent', color: 'var(--ink)', fontSize: 13, fontWeight: 500 }}>
              {t.name}
            </button>
          ))}
        </div>

        <input ref={titleRef} className="input" placeholder="标题（最多 40 字）" maxLength={40}
          value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="input" placeholder="分享你的养宠日常、好物心得或求助问题…（最多 1000 字）" maxLength={1000} rows={5}
          value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
          style={{ marginTop: 12, resize: 'vertical', minHeight: 120, height: 'auto', lineHeight: 1.6, paddingTop: 12, borderRadius: 16 }} />

        {/* 封面：插画 + 底色（图片上传接入对象存储后开放） */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, marginTop: 16, alignItems: 'start' }}>
          <div style={{ width: 104, height: 104, borderRadius: 16, background: form.bg, display: 'grid', placeItems: 'center' }}>
            <Illo id={form.emoji} size={72} />
          </div>
          <div>
            <div className="caption" style={{ marginBottom: 6 }}>封面插画</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {ILLO_IDS.map((id) => (
                <button key={id} onClick={() => setForm({ ...form, emoji: id })} aria-label={`封面 ${id}`}
                  style={{ width: 40, height: 40, borderRadius: 10, border: form.emoji === id ? '2px solid var(--ink)' : '1px solid var(--line-2)', background: 'transparent', padding: 0, display: 'grid', placeItems: 'center' }}>
                  <Illo id={id} size={30} />
                </button>
              ))}
            </div>
            <div className="caption" style={{ margin: '10px 0 6px' }}>封面底色</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {COVER_BGS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, bg: c })} aria-label={`底色 ${c}`}
                  style={{ width: 26, height: 26, borderRadius: 999, border: form.bg === c ? '2px solid var(--ink)' : '1px solid var(--line-2)', background: c, padding: 0 }} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <select className="input" value={form.petName} onChange={(e) => setForm({ ...form, petName: e.target.value })}>
            <option value="">关联毛孩子（可选）</option>
            {pets.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <input className="input" placeholder="昵称（可选，默认匿名）" maxLength={20}
            value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
        </div>

        {error && <div style={{ color: '#D9826B', fontSize: 13, marginTop: 12 }}>⚠️ {error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary btn-lg" style={{ flex: 1, justifyContent: 'center' }} onClick={submit} disabled={saving || !form.title.trim() || !form.content.trim()}>
            {saving ? '发布中…' : '发布 🐾'}
          </button>
          <button className="btn btn-line btn-lg" onClick={onClose}>取消</button>
        </div>
        <p className="caption" style={{ margin: '12px 0 0', textAlign: 'center' }}>请友善分享 · 健康问题请以兽医意见为准</p>
      </div>
    </div>
  );
}
