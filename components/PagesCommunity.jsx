// 社区：小红书式图文笔记 —— 瀑布流卡片 + 图片上传（客户端压缩）+ 话题标签
// + 评论（一层回复）+ 关注入口 + 大图浏览 + 分享海报。
// 数据接口：/api/posts /api/posts/like /api/comments /api/follow，身份沿用匿名 cookie 会话。
import { useState, useEffect, useCallback, useRef } from 'react';
import { Emoji } from './Emoji';

const TOPICS = [
  { id: 'all', name: '全部', emoji: null },
  { id: '晒宠', name: '晒宠', emoji: '🐾' },
  { id: '好物', name: '好物', emoji: '🧶' },
  { id: '求助', name: '求助', emoji: '🩺' },
  { id: '日常', name: '日常', emoji: '☀️' },
];

const COVER_EMOJIS = ['🐶', '🐱', '🐾', '🧶', '🛁', '🦴', '🥣', '🎾', '🩺', '📷', '🏠', '🎁'];
const COVER_BGS = ['#F4D7B0', '#D3DEE2', '#E8D8C3', '#DCE5D4', '#EAD9DE', '#D9E2EA'];
const SUGGESTED_TAGS = ['新手养猫', '新手养狗', '好物推荐', '避坑指南', '日常碎片', '健康求助', '晒单'];

export function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return '刚刚';
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

// 客户端压缩图片：最长边 1080、JPEG 质量 0.78，控制单张体积（后端兜底 600KB）
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1080;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CommunityPage({ navigate, initialPostId }) {
  const [topic, setTopic] = useState('all');
  const [tag, setTag] = useState(null); // 话题标签过滤（前端过滤，点击帖内标签设置）
  const [posts, setPosts] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [composing, setComposing] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const detailPost = detailId && posts ? posts.find((p) => p.id === detailId) : null;

  const load = useCallback(async (t = topic) => {
    setLoadError('');
    try {
      const r = await fetch(`/api/posts${t !== 'all' ? `?topic=${encodeURIComponent(t)}` : ''}`);
      if (!r.ok) throw new Error(`接口返回 ${r.status}`);
      setPosts(await r.json());
    } catch (e) {
      setPosts([]);
      setLoadError(e.message || '加载失败');
    }
  }, [topic]);

  useEffect(() => { setPosts(null); load(topic); }, [topic, load]);

  // 深链：从全站搜索点进来时直接打开对应帖子详情
  useEffect(() => { if (initialPostId) setDetailId(initialPostId); }, [initialPostId]);

  async function toggleLike(p) {
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
    setDetailId(null);
    load();
  }

  const shown = posts && tag ? posts.filter((p) => (p.topics || []).includes(tag)) : posts;

  return (
    <>
      <section style={{ paddingTop: 64, paddingBottom: 40 }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div className="eyebrow eyebrow-rule" style={{ marginBottom: 16 }}>Pawly Community · 铲屎官社区</div>
              <h1 className="h-1" style={{ margin: 0, maxWidth: 720 }}>晒宠 种草 抱团取暖</h1>
              <p className="body-lg" style={{ marginTop: 20, maxWidth: 620 }}>发一篇你和毛孩子的日常，或者把踩过的坑分享给下一位铲屎官。</p>
            </div>
            {/* 右侧贴纸簇：填补标题与按钮之间的大片空白 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div aria-hidden style={{ position: 'relative', width: 150, height: 96, flexShrink: 0 }} className="m-none">
                <span style={{ position: 'absolute', left: 0, bottom: 0, width: 96, height: 96, borderRadius: 999, background: 'rgba(222,116,41,.12)' }} />
                <span style={{ position: 'absolute', left: 14, bottom: 12, transform: 'rotate(-8deg)' }}><Emoji text="🐱" size={64} /></span>
                <span style={{ position: 'absolute', right: 22, top: 0, transform: 'rotate(10deg)' }}><Emoji text="🧶" size={40} /></span>
                <span style={{ position: 'absolute', right: 0, bottom: 6, transform: 'rotate(-14deg)' }}><Emoji text="🦴" size={34} /></span>
              </div>
              <button className="btn btn-primary btn-lg" onClick={() => setComposing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Emoji text="✏️" size={16} /> 发布分享
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="tint-band" style={{ padding: '32px 0 96px', borderRadius: '36px 36px 0 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div className="h-scroll" style={{ display: 'flex', gap: 6, flex: 1 }}>
            {TOPICS.map((t) => (
              <button key={t.id} onClick={() => { setTopic(t.id); setTag(null); }}
                style={{ height: 38, padding: '0 16px', borderRadius: 999, border: topic === t.id && !tag ? '1px solid var(--ink)' : '1px solid rgba(31,42,29,.14)', background: topic === t.id && !tag ? 'var(--ink)' : 'rgba(255,253,246,.7)', color: topic === t.id && !tag ? 'var(--bg)' : 'var(--ink)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {t.emoji && <Emoji text={t.emoji} size={14} />}{t.name}
              </button>
            ))}
          </div>
          {posts && posts.length > 0 && <span className="caption" style={{ whiteSpace: 'nowrap' }}>{shown?.length ?? 0} 篇分享</span>}
          {tag && (
            <button onClick={() => setTag(null)} className="badge" style={{ cursor: 'pointer', height: 30, gap: 6, background: 'var(--ink)', color: 'var(--bg)', border: 0 }}>
              #{tag} ×
            </button>
          )}
        </div>
        <div className="container">
          {posts === null && <p className="caption" style={{ textAlign: 'center', padding: '64px 0' }}>加载中…</p>}
          {posts && loadError && (
            <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: 8 }}><Emoji text="🩺" size={72} /></div>
              <h3 className="h-3" style={{ margin: '0 0 8px' }}>社区暂时打不开</h3>
              <p className="caption" style={{ margin: '0 0 8px' }}>{loadError}</p>
              <p className="caption" style={{ margin: '0 0 20px' }}>如果是刚部署的新版本，请确认已执行 <code className="mono">npx prisma db push</code> 同步社区数据表。</p>
              <button className="btn btn-primary" onClick={() => { setPosts(null); load(); }}>重试</button>
            </div>
          )}
          {shown && !loadError && shown.length === 0 && (
            <div style={{ padding: '96px 0', textAlign: 'center' }}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: 16 }}><Emoji text="🐾" size={88} /></div>
              <p className="body">{tag ? `还没有 #${tag} 的帖子` : '这个话题还没有帖子，来发第一篇吧！'}</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setComposing(true)}>发布分享</button>
            </div>
          )}
          {shown && shown.length > 0 && (
            /* 瀑布流：CSS columns，卡片高度随图片/内容自适应；移动端固定两列 */
            <div className="masonry">
              {shown.map((p) => (
                <PostCard key={p.id} p={p}
                  onOpen={() => setDetailId(p.id)}
                  onLike={() => toggleLike(p)}
                  onAuthor={() => navigate && navigate({ page: 'profile', userId: p.authorId })} />
              ))}
            </div>
          )}
        </div>
      </section>

      {detailPost && (
        <PostDetail p={detailPost} onClose={() => setDetailId(null)} navigate={navigate}
          onLike={() => toggleLike(detailPost)} onDelete={() => removePost(detailPost)}
          onTag={(t) => { setDetailId(null); setTopic('all'); setTag(t); }} />
      )}
      {composing && <Composer onClose={() => setComposing(false)} onPosted={() => { setComposing(false); setTopic('all'); setTag(null); load('all'); }} />}
    </>
  );
}

// —— 瀑布流卡片：有图用首图做封面（小红书式），无图回退 emoji 色块 ——
export function PostCard({ p, onOpen, onLike, onAuthor }) {
  const cover = p.images?.[0];
  return (
    <article className="card card-hot fade-up" onClick={onOpen}
      style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', breakInside: 'avoid', marginBottom: 16, display: 'block' }}>
      {cover ? (
        /* 图片封面统一 4:3 裁切，保证瀑布流内容尺寸一致（小红书式规整感） */
        <div style={{ position: 'relative' }}>
          <img src={cover} alt={p.title} style={{ width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover' }} />
          <span className="pet-pill" style={{ position: 'absolute', top: 10, left: 10 }}>{p.topic}</span>
          {(p.imagesCount || p.images.length) > 1 && (
            <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(31,42,29,.55)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>
              {p.imagesCount || p.images.length} 图
            </span>
          )}
        </div>
      ) : (
        <div style={{ background: `radial-gradient(closest-side at 50% 45%, rgba(255,255,255,.4), transparent), ${p.bg}`, aspectRatio: '16/10', display: 'grid', placeItems: 'center', position: 'relative' }}>
          <span className="pet-pill" style={{ position: 'absolute', top: 10, left: 10 }}>{p.topic}</span>
          <Emoji text={p.emoji} size={64} style={{ filter: 'drop-shadow(0 6px 12px rgba(31,42,29,.15))' }} />
        </div>
      )}
      <div style={{ padding: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</h3>
        {!cover && (
          <p className="body" style={{ fontSize: 12.5, margin: '6px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {p.content}
          </p>
        )}
        {p.topics?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {p.topics.slice(0, 2).map((t) => <span key={t} style={{ fontSize: 11.5, color: 'var(--sage)', fontWeight: 600 }}>#{t}</span>)}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-2)' }}>
          <button onClick={(e) => { e.stopPropagation(); onAuthor(); }} aria-label={`查看 ${p.author} 的主页`}
            style={{ border: 0, background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1, minWidth: 0 }}>
            <span style={{ width: 24, height: 24, borderRadius: 999, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Emoji text={p.authorAvatar || '🐾'} size={13} /></span>
            <span className="caption" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.author}</span>
          </button>
          <span className="caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            {p.commentCount || 0}
          </span>
          <button onClick={(e) => { e.stopPropagation(); onLike(); }} aria-label="点赞"
            style={{ border: 0, background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0, color: p.likedByMe ? 'var(--accent)' : 'var(--ink-3)', fontSize: 13, fontWeight: 600 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill={p.likedByMe ? 'var(--accent)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.5-1.5 2-3.2 2-5a5 5 0 0 0-9-3 5 5 0 0 0-9 3c0 1.8.5 3.5 2 5l7 7 7-7Z" />
            </svg>
            {p.likeCount > 0 && <span className="mono">{p.likeCount}</span>}
          </button>
        </div>
      </div>
    </article>
  );
}

// —— 帖子详情：图片轮播/大图 + 关注作者 + 评论区 + 分享海报 ——
export function PostDetail({ p: pIn, onClose, onLike, onDelete, onTag, navigate }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [following, setFollowing] = useState(null); // null=未知（游客也可点，后端建档）
  const [fullImages, setFullImages] = useState(null);
  // 列表接口为省流量只带封面图；多图帖打开详情时补拉全部图片
  useEffect(() => {
    if ((pIn.imagesCount || 0) > (pIn.images?.length || 0)) {
      fetch(`/api/posts?id=${encodeURIComponent(pIn.id)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.images) setFullImages(d.images); })
        .catch(() => {});
    }
  }, [pIn.id, pIn.imagesCount, pIn.images]);
  const p = fullImages ? { ...pIn, images: fullImages } : pIn;
  const hasImages = p.images?.length > 0;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') (lightbox ? setLightbox(false) : onClose()); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, lightbox]);

  async function toggleFollow() {
    try {
      const r = await fetch('/api/follow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: p.authorId }),
      });
      if (r.ok) { const d = await r.json(); setFollowing(d.following); }
    } catch {}
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,42,29,.4)', animation: 'fadeBg .2s ease' }} />
      <div role="dialog" aria-label={p.title} style={{
        position: 'relative', width: 'min(560px, 100%)', maxHeight: 'calc(100vh - 64px)',
        background: 'var(--bg)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px -16px rgba(31,42,29,.35)',
        animation: 'dialogIn .28s cubic-bezier(.22,.61,.36,1) both',
      }}>
        {/* 封面：图片轮播（点击看大图）或 emoji 色块 */}
        {hasImages ? (
          <div style={{ position: 'relative', flexShrink: 0, background: 'var(--surface-2)', cursor: 'zoom-in', overflow: 'hidden' }} onClick={() => setLightbox(true)}>
            {/* 同图放大模糊做垫底，避免 contain 留出的两侧空档露出遮罩 */}
            <img src={p.images[imgIdx]} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(28px) brightness(1.05)', transform: 'scale(1.15)' }} />
            <img src={p.images[imgIdx]} alt={`${p.title} 图 ${imgIdx + 1}`} style={{ position: 'relative', width: '100%', maxHeight: 300, objectFit: 'contain', display: 'block' }} />
            <span className="pet-pill" style={{ position: 'absolute', top: 14, left: 14 }}>{p.topic}</span>
            {p.images.length > 1 && (
              <>
                <CarouselBtn dir="prev" onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + p.images.length) % p.images.length); }} />
                <CarouselBtn dir="next" onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % p.images.length); }} />
                <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
                  {p.images.map((_, i) => (
                    <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: i === imgIdx ? '#fff' : 'rgba(255,255,255,.45)' }} />
                  ))}
                </div>
              </>
            )}
            <CloseBtn onClick={(e) => { e.stopPropagation(); onClose(); }} />
          </div>
        ) : (
          <div style={{ background: p.bg, minHeight: 160, display: 'grid', placeItems: 'center', position: 'relative', flexShrink: 0 }}>
            <span className="pet-pill" style={{ position: 'absolute', top: 14, left: 14 }}>{p.topic}</span>
            <CloseBtn onClick={onClose} />
            <Emoji text={p.emoji} size={100} />
          </div>
        )}

        <div style={{ padding: '20px 26px', overflowY: 'auto' }}>
          <h2 className="serif" style={{ fontSize: 23, fontWeight: 500, margin: 0, lineHeight: 1.3 }}>{p.title}</h2>
          {/* 作者行：头像/昵称可点进主页；非本人显示关注按钮 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 14px' }}>
            <button onClick={() => navigate && navigate({ page: 'profile', userId: p.authorId })}
              style={{ border: 0, background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <span style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}><Emoji text={p.authorAvatar || '🐾'} size={15} /></span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{p.author}</span>
            </button>
            <span className="caption">· {timeAgo(p.createdAt)}</span>
            {p.petName && <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Emoji text="🐾" size={11} /> {p.petName}</span>}
            <span style={{ flex: 1 }} />
            {!p.mine && (
              <button onClick={toggleFollow} className="btn btn-sm" style={{
                background: following ? 'var(--surface-2)' : 'var(--ink)', color: following ? 'var(--ink-2)' : 'var(--bg)', borderRadius: 999, height: 30, padding: '0 14px', fontSize: 12,
              }}>
                {following ? '已关注' : '+ 关注'}
              </button>
            )}
          </div>
          {p.topics?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {p.topics.map((t) => (
                <button key={t} onClick={() => onTag(t)} style={{ border: 0, background: 'var(--surface-2)', color: 'var(--sage)', fontSize: 12.5, fontWeight: 600, padding: '4px 10px', borderRadius: 999, cursor: 'pointer' }}>
                  #{t}
                </button>
              ))}
            </div>
          )}
          <p className="body" style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>{p.content}</p>

          <Comments postId={p.id} />
        </div>

        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--line-2)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={onLike} className="btn btn-line btn-sm"
            style={{ gap: 6, background: p.likedByMe ? 'rgba(222,116,41,.08)' : 'transparent', color: p.likedByMe ? 'var(--accent)' : 'var(--ink-2)', fontWeight: 600 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill={p.likedByMe ? 'var(--accent)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.5-1.5 2-3.2 2-5a5 5 0 0 0-9-3 5 5 0 0 0-9 3c0 1.8.5 3.5 2 5l7 7 7-7Z" />
            </svg>
            {p.likedByMe ? '已赞' : '点赞'}{p.likeCount > 0 && <span className="mono">{p.likeCount}</span>}
          </button>
          <button onClick={() => sharePoster(p)} className="btn btn-line btn-sm" style={{ gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
            分享海报
          </button>
          <span style={{ flex: 1 }} />
          {p.mine && (
            <button onClick={onDelete} className="btn btn-line btn-sm" style={{ gap: 6, color: 'var(--ink-2)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6" /></svg>
              删除
            </button>
          )}
        </div>
      </div>

      {lightbox && hasImages && (
        <Lightbox images={p.images} index={imgIdx} setIndex={setImgIdx} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} aria-label="关闭" style={{
      position: 'absolute', top: 10, right: 10, width: 32, height: 32, border: 0, borderRadius: 999,
      background: 'rgba(255,255,255,.9)', color: 'var(--ink)', display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: 2,
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6 18 18 M18 6 6 18" /></svg>
    </button>
  );
}

function CarouselBtn({ dir, onClick }) {
  return (
    <button onClick={onClick} aria-label={dir === 'prev' ? '上一张' : '下一张'} style={{
      position: 'absolute', top: '50%', transform: 'translateY(-50%)', [dir === 'prev' ? 'left' : 'right']: 10,
      width: 32, height: 32, border: 0, borderRadius: 999, background: 'rgba(255,255,255,.85)', color: 'var(--ink)',
      display: 'grid', placeItems: 'center', cursor: 'pointer',
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'prev' ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
      </svg>
    </button>
  );
}

// 全屏大图浏览
function Lightbox({ images, index, setIndex, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(10,14,10,.92)', display: 'grid', placeItems: 'center', animation: 'fadeBg .18s ease', cursor: 'zoom-out' }}>
      <img src={images[index]} alt={`大图 ${index + 1}`} style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
      {images.length > 1 && (
        <>
          <CarouselBtn dir="prev" onClick={(e) => { e.stopPropagation(); setIndex((index - 1 + images.length) % images.length); }} />
          <CarouselBtn dir="next" onClick={(e) => { e.stopPropagation(); setIndex((index + 1) % images.length); }} />
        </>
      )}
      <span style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,.8)', fontSize: 13 }} className="mono">{index + 1} / {images.length}</span>
      <CloseBtn onClick={onClose} />
    </div>
  );
}

// —— 评论区：一层回复 ——
function Comments({ postId }) {
  const [list, setList] = useState(null);
  const [input, setInput] = useState('');
  const [replyTarget, setReplyTarget] = useState(null); // {id(顶层), author}
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/comments?postId=${encodeURIComponent(postId)}`);
      setList(r.ok ? await r.json() : []);
    } catch { setList([]); }
  }, [postId]);
  useEffect(() => { load(); }, [load]);

  async function submit() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true); setError('');
    try {
      const r = await fetch('/api/comments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId, content,
          parentId: replyTarget?.id || undefined,
          replyTo: replyTarget?.author || undefined,
        }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || '发送失败'); }
      setInput(''); setReplyTarget(null);
      load();
    } catch (e) { setError(e.message); } finally { setSending(false); }
  }

  async function remove(id) {
    await fetch(`/api/comments?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    load();
  }

  const tops = (list || []).filter((c) => !c.parentId);
  const replies = (id) => (list || []).filter((c) => c.parentId === id);

  return (
    <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--line-2)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>评论 {list ? `· ${list.length}` : ''}</div>
      {list === null && <p className="caption">加载中…</p>}
      {list && tops.length === 0 && <p className="caption" style={{ margin: '4px 0 12px' }}>还没有评论，坐个沙发？</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tops.map((c) => (
          <div key={c.id}>
            <CommentRow c={c} onReply={() => { setReplyTarget({ id: c.id, author: c.author }); inputRef.current?.focus(); }} onDelete={() => remove(c.id)} />
            {replies(c.id).map((r) => (
              <div key={r.id} style={{ marginLeft: 34, marginTop: 10 }}>
                <CommentRow c={r} reply onReply={() => { setReplyTarget({ id: c.id, author: r.author }); inputRef.current?.focus(); }} onDelete={() => remove(r.id)} />
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* 输入框 */}
      <div style={{ marginTop: 16 }}>
        {replyTarget && (
          <div className="caption" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            回复 @{replyTarget.author}
            <button onClick={() => setReplyTarget(null)} style={{ border: 0, background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 13 }}>×</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={inputRef} className="input" placeholder="友善评论 温暖他人…" maxLength={500} value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            style={{ height: 40, borderRadius: 999 }} />
          <button className="btn btn-primary btn-sm" style={{ height: 40, borderRadius: 999 }} onClick={submit} disabled={sending || !input.trim()}>
            {sending ? '…' : '发送'}
          </button>
        </div>
        {error && <div style={{ color: 'var(--accent)', fontSize: 12.5, marginTop: 6 }}>{error}</div>}
      </div>
    </div>
  );
}

function CommentRow({ c, reply, onReply, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <span style={{ width: reply ? 22 : 26, height: reply ? 22 : 26, borderRadius: 999, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Emoji text={c.authorAvatar || '🐾'} size={reply ? 12 : 14} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>
          {c.author}
          {c.replyTo && <span style={{ fontWeight: 400 }}> 回复 <span style={{ fontWeight: 600 }}>@{c.replyTo}</span></span>}
          <span style={{ fontWeight: 400 }}> · {timeAgo(c.createdAt)}</span>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 3, whiteSpace: 'pre-wrap' }}>{c.content}</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
          <button onClick={onReply} style={{ border: 0, background: 'transparent', color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer', padding: 0 }}>回复</button>
          {c.mine && <button onClick={onDelete} style={{ border: 0, background: 'transparent', color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer', padding: 0 }}>删除</button>}
        </div>
      </div>
    </div>
  );
}

// —— 分享海报：canvas 绘制品牌卡片（含首图），下载 PNG ——
async function sharePoster(p) {
  const W = 750, H = 1000;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  // 底
  ctx.fillStyle = '#F7F2E5'; ctx.fillRect(0, 0, W, H);
  let y = 60;
  // 首图（有图时铺顶部）
  if (p.images?.[0]) {
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = p.images[0]; });
      const ih = 460;
      const scale = Math.max(W / img.width, ih / img.height);
      const sw = W / scale, sh = ih / scale;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, ih);
      y = ih + 48;
    } catch { y = 80; }
  } else {
    ctx.fillStyle = p.bg || '#E5ECDF';
    ctx.fillRect(0, 0, W, 300);
    ctx.font = '120px serif'; ctx.textAlign = 'center';
    ctx.fillText(p.emoji || '🐾', W / 2, 190);
    ctx.textAlign = 'left';
    y = 348;
  }
  // 标题（手动换行）
  ctx.fillStyle = '#1F2A1D';
  ctx.font = '600 40px "Helvetica Neue", "PingFang SC", sans-serif';
  y = drawWrapped(ctx, p.title, 56, y, W - 112, 54, 2);
  // 正文摘录
  ctx.fillStyle = 'rgba(31,42,29,.66)';
  ctx.font = '26px "PingFang SC", sans-serif';
  y = drawWrapped(ctx, p.content, 56, y + 16, W - 112, 42, 5);
  // 作者
  ctx.fillStyle = 'rgba(31,42,29,.45)';
  ctx.font = '24px "PingFang SC", sans-serif';
  ctx.fillText(`@${p.author} · 发布于 Pawly 社区`, 56, y + 30);
  // 底部品牌条
  ctx.fillStyle = '#1F2A1D'; ctx.fillRect(0, H - 120, W, 120);
  ctx.fillStyle = '#F5F9F2';
  ctx.font = '600 34px "Helvetica Neue", sans-serif';
  ctx.fillText('Pawly 宝莉 🐾', 56, H - 68);
  ctx.fillStyle = 'rgba(245,249,242,.6)';
  ctx.font = '22px "PingFang SC", sans-serif';
  ctx.fillText('养宠不懂 就问宝莉 · 答案有出处的 AI 宠物管家', 56, H - 32);
  // 下载
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `pawly-${p.id.slice(-6)}.png`;
  a.click();
}

function drawWrapped(ctx, text, x, y, maxW, lineH, maxLines) {
  const chars = String(text || '').replace(/\n+/g, ' ');
  let line = '', lines = 0;
  for (const ch of chars) {
    if (ctx.measureText(line + ch).width > maxW) {
      lines++;
      if (lines >= maxLines) { ctx.fillText(line.slice(0, -1) + '…', x, y + lines * lineH); return y + (lines + 1) * lineH; }
      ctx.fillText(line, x, y + lines * lineH);
      line = ch;
    } else line += ch;
  }
  if (line) { lines++; ctx.fillText(line, x, y + lines * lineH); }
  return y + (lines + 1) * lineH;
}

// —— 发帖弹窗：图片上传（压缩预览）+ 话题标签 + 无图时的 emoji 封面 ——
function Composer({ onClose, onPosted }) {
  const [form, setForm] = useState({ title: '', content: '', topic: '晒宠', emoji: COVER_EMOJIS[0], bg: COVER_BGS[0], petName: '', nickname: '' });
  const [images, setImages] = useState([]); // dataURL 列表
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [pets, setPets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    fetch('/api/pets').then((r) => (r.ok ? r.json() : [])).then(setPets).catch(() => {});
  }, []);

  async function pickImages(e) {
    const files = Array.from(e.target.files || []).slice(0, 9 - images.length);
    e.target.value = '';
    if (!files.length) return;
    try {
      const compressed = await Promise.all(files.map(compressImage));
      const tooBig = compressed.filter((d) => d.length > 600_000);
      if (tooBig.length) setError('部分图片过大已跳过');
      setImages((prev) => [...prev, ...compressed.filter((d) => d.length <= 600_000)].slice(0, 9));
    } catch { setError('图片读取失败，请换一张试试'); }
  }

  function addTag(t) {
    const clean = t.replace(/^#/, '').trim().slice(0, 16);
    if (!clean || tags.includes(clean) || tags.length >= 5) return;
    setTags([...tags, clean]);
    setTagInput('');
  }

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
          images, topics: tags,
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,42,29,.4)', animation: 'fadeBg .2s ease' }} />
      <div role="dialog" aria-label="发布分享" style={{
        position: 'relative', width: 'min(640px, 100%)', maxHeight: 'calc(100vh - 64px)', overflowY: 'auto',
        background: 'var(--bg)', borderRadius: 20, padding: 32, boxShadow: '0 24px 64px -16px rgba(31,42,29,.35)',
        animation: 'dialogIn .28s cubic-bezier(.22,.61,.36,1) both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="eyebrow">New Post</div>
            <h2 className="serif" style={{ fontSize: 24, fontWeight: 500, margin: '4px 0 0' }}>发布分享</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ width: 36, padding: 0, justifyContent: 'center' }} aria-label="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6 18 18 M18 6 6 18" /></svg>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {TOPICS.filter((t) => t.id !== 'all').map((t) => (
            <button key={t.id} onClick={() => setForm({ ...form, topic: t.id })}
              style={{ height: 34, padding: '0 14px', borderRadius: 999, border: form.topic === t.id ? '2px solid var(--ink)' : '1px solid var(--line)', background: form.topic === t.id ? 'var(--surface-2)' : 'transparent', color: 'var(--ink)', fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Emoji text={t.emoji} size={13} />{t.name}
            </button>
          ))}
        </div>

        <input ref={titleRef} className="input" placeholder="标题（最多 40 字）" maxLength={40}
          value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="input" placeholder="分享你的养宠日常、好物心得或求助问题…（最多 1000 字）" maxLength={1000} rows={5}
          value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
          style={{ marginTop: 12, resize: 'vertical', minHeight: 110, height: 'auto', lineHeight: 1.6, paddingTop: 12, borderRadius: 12 }} />

        {/* 图片：最多 9 张，客户端压缩 */}
        <div style={{ marginTop: 14 }}>
          <div className="caption" style={{ marginBottom: 8 }}>图片（{images.length}/9 · 选填，第一张会作为封面）</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8 }}>
            {images.map((src, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 10, overflow: 'hidden' }}>
                <img src={src} alt={`图 ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button onClick={() => setImages(images.filter((_, j) => j !== i))} aria-label="移除图片" style={{
                  position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 999, border: 0,
                  background: 'rgba(31,42,29,.65)', color: '#fff', fontSize: 13, lineHeight: 1, cursor: 'pointer',
                }}>×</button>
              </div>
            ))}
            {images.length < 9 && (
              <button onClick={() => fileRef.current?.click()} aria-label="添加图片" style={{
                aspectRatio: '1/1', borderRadius: 10, border: '1.5px dashed var(--line)', background: 'var(--surface)',
                display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={pickImages} />
        </div>

        {/* 话题标签 */}
        <div style={{ marginTop: 14 }}>
          <div className="caption" style={{ marginBottom: 8 }}>话题（最多 5 个）</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {tags.map((t) => (
              <button key={t} onClick={() => setTags(tags.filter((x) => x !== t))} className="badge" style={{ cursor: 'pointer', background: 'var(--ink)', color: 'var(--bg)', border: 0, height: 28 }}>
                #{t} ×
              </button>
            ))}
            {tags.length < 5 && (
              <input className="input" placeholder="#输入后回车" value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                style={{ width: 130, height: 32, fontSize: 12.5, borderRadius: 999, padding: '0 12px' }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
              <button key={t} onClick={() => addTag(t)} className="badge" style={{ cursor: 'pointer', height: 26 }}>#{t}</button>
            ))}
          </div>
        </div>

        {/* 无图时选 emoji 封面 */}
        {images.length === 0 && (
          <div className="m-1col" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, marginTop: 16, alignItems: 'start' }}>
            <div style={{ width: 96, height: 96, borderRadius: 16, background: form.bg, display: 'grid', placeItems: 'center' }}>
              <Emoji text={form.emoji} size={56} />
            </div>
            <div>
              <div className="caption" style={{ marginBottom: 6 }}>封面表情（未传图时使用）</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {COVER_EMOJIS.map((e) => (
                  <button key={e} onClick={() => setForm({ ...form, emoji: e })} aria-label={`封面 ${e}`}
                    style={{ width: 34, height: 34, borderRadius: 10, border: form.emoji === e ? '2px solid var(--ink)' : '1px solid var(--line-2)', background: 'transparent', padding: 0, display: 'grid', placeItems: 'center' }}>
                    <Emoji text={e} size={20} />
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
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <select className="input" value={form.petName} onChange={(e) => setForm({ ...form, petName: e.target.value })}>
            <option value="">关联毛孩子（可选）</option>
            {pets.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <input className="input" placeholder="昵称（可选，默认匿名）" maxLength={20}
            value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
        </div>

        {error && <div style={{ color: 'var(--accent)', fontSize: 13, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Emoji text="⚠️" size={14} /> {error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary btn-lg" style={{ flex: 1, justifyContent: 'center' }} onClick={submit} disabled={saving || !form.title.trim() || !form.content.trim()}>
            {saving ? '发布中…' : '发布'}
          </button>
          <button className="btn btn-line btn-lg" onClick={onClose}>取消</button>
        </div>
        <p className="caption" style={{ margin: '12px 0 0', textAlign: 'center' }}>请友善分享 · 含违规内容将无法发布 · 健康问题请以兽医意见为准</p>
      </div>
    </div>
  );
}
