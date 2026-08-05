// 共享组件：Logo、Header（含全站搜索）、Footer、ProductCard、ArticleCard、CartDrawer
import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { fmt } from './util';
import { ARTICLE_CATS, PRODUCTS, ARTICLES } from './data';
import { Emoji } from './Emoji';
import { getPetSpecies } from '@/lib/pet-species';

// 头像：优先显示用户上传的照片（走 /api/avatar 带缓存），没有则回退到 emoji 头像。
// 全站统一用它渲染，保证换头像后各处一致。
export function Avatar({ url, emoji = '🐾', size = 32, ring, style }) {
  const box = {
    width: size, height: size, borderRadius: 999, flexShrink: 0,
    background: 'var(--surface-2)', display: 'grid', placeItems: 'center', overflow: 'hidden',
    ...(ring ? { border: `${ring}px solid var(--surface)` } : {}),
    ...style,
  };
  if (url) return <span style={box}><img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} /></span>;
  return <span style={box}><Emoji text={emoji || '🐾'} size={Math.round(size * 0.56)} /></span>;
}

// 漂浮装饰贴纸：绝对定位的 emoji，轻柔浮动（reduced-motion 自动静止；默认小屏隐藏）
// 用法：父容器 position:relative，<FloatEmoji e="🎾" size={40} style={{ right: 20, top: 8 }} r={-10} dur={7.5} delay={.6} />
export const FloatEmoji = ({ e, size = 40, style, r = 0, rd = 3, dur = 7, delay = 0, mobile = false }) => (
  <span aria-hidden className={`float-deco${mobile ? '' : ' m-none'}`}
    style={{ position: 'absolute', pointerEvents: 'none', zIndex: 1, '--r': `${r}deg`, '--rd': `${rd}deg`, '--fd': `${dur}s`, '--fdel': `${delay}s`, ...style }}>
    <Emoji text={e} size={size} />
  </span>
);

export const Logo = ({ size = 28 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="9" cy="11" r="3" fill="currentColor" />
      <circle cx="16" cy="8" r="3" fill="currentColor" />
      <circle cx="23" cy="11" r="3" fill="currentColor" />
      <circle cx="6" cy="18" r="2.4" fill="currentColor" />
      <path d="M9 21c0-3.5 3-6 7-6s7 2.5 7 6c0 2.5-2 4.5-7 4.5S9 23.5 9 21Z" fill="currentColor" />
    </svg>
    <span className="serif" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '0.01em' }}>Pawly</span>
    <span className="logo-sub" style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, marginLeft: -2 }}>宝莉</span>
  </div>
);

export function Header({ route, navigate, cartCount, onCartOpen }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const navRef = useRef(null);
  const [ind, setInd] = useState(null); // 滑动指示块的位置
  const navItems = [
    { id: 'home', label: '首页' },
    { id: 'articles', label: '宠物科普' },
    { id: 'community', label: '社区' },
    { id: 'shop', label: '商品' },
    { id: 'member', label: '会员' },
  ];
  const activeId = ['product'].includes(route.page) ? 'shop' : ['article'].includes(route.page) ? 'articles' : route.page;
  // 指示块跟随当前项平滑滑动（浮雕白块）；窗口缩放时重新测量
  useEffect(() => {
    const measure = () => {
      const el = navRef.current?.querySelector('button.active');
      if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
      else setInd(null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeId]);
  // 只有首页首屏内顶栏透明压在视频上；滚过首屏或进入其他页面都用实底
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight - 140);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const overVideo = route.page === 'home' && !scrolled;
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50, pointerEvents: 'none',
      background: overVideo ? 'transparent' : 'rgba(247,242,229,.86)',
      backdropFilter: overVideo ? undefined : 'blur(14px) saturate(140%)',
      WebkitBackdropFilter: overVideo ? undefined : 'blur(14px) saturate(140%)',
      borderBottom: overVideo ? 'none' : '1px solid var(--line-2)',
    }}>
      {/* 左右两侧 flex:1 等宽占位，保证中间的 pill 导航始终真居中（不受两侧内容宽度影响） */}
      <div className="container site-header-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 76, pointerEvents: 'auto' }}>
        <div className="site-header-side" style={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
          <button onClick={() => navigate({ page: 'home' })} style={{ border: 0, background: 'transparent', color: 'var(--ink)', padding: 0 }}>
            <Logo />
          </button>
        </div>
        <nav className="site-nav" style={{ display: 'flex', flexShrink: 0 }}>
          <div ref={navRef} className="pill-nav glass">
            {ind && <span className="indicator" style={{ left: ind.left, width: ind.width }} />}
            {navItems.map((it) => (
              <button key={it.id} onClick={() => navigate({ page: it.id })} className={activeId === it.id ? 'active' : ''}>
                {it.label}
              </button>
            ))}
          </div>
        </nav>
        <div className="site-header-side" style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, minWidth: 0 }}>
          <button onClick={() => setSearchOpen(true)} className="btn btn-ghost btn-sm" style={{ width: 36, padding: 0, justifyContent: 'center', borderRadius: 999 }} aria-label="搜索">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
          </button>
          <NotifyBell navigate={navigate} />
          <button onClick={onCartOpen} className="btn btn-line btn-sm" style={{ position: 'relative', paddingLeft: 14, paddingRight: 14 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h2l2.4 12.3a2 2 0 0 0 2 1.7h8.2a2 2 0 0 0 2-1.6L21 8H6" />
              <circle cx="9" cy="21" r="1.4" /><circle cx="18" cy="21" r="1.4" />
            </svg>
            <span>购物车</span>
            {cartCount > 0 && (
              <span key={cartCount} style={{
                minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
                background: 'var(--accent)', color: '#2a1a0a', fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2,
                animation: 'cartBump .4s ease',
              }}>{cartCount}</span>
            )}
          </button>
          <UserButton navigate={navigate} />
        </div>
      </div>
      {searchOpen && <SearchOverlay navigate={navigate} onClose={() => setSearchOpen(false)} />}
    </header>
  );
}

// 通知铃铛：未读角标 + 下拉面板（打开即标记已读）
function NotifyBell({ navigate }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState(null);
  const wrapRef = useRef(null);

  // 未读数：进站拉一次，之后每 60s 轮询
  useEffect(() => {
    let alive = true;
    const poll = () => fetch('/api/notifications?unread=1').then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive && d) setUnread(d.count || 0); }).catch(() => {});
    poll();
    const t = setInterval(poll, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // 点击面板外关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const r = await fetch('/api/notifications');
        setItems(r.ok ? await r.json() : []);
        await fetch('/api/notifications', { method: 'POST' });
        setUnread(0);
      } catch { setItems([]); }
    }
  }

  const typeEmoji = { like: '💚', comment: '💬', follow: '🐾', system: '💡' };
  const ago = (iso) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} 分钟前`;
    if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
    return `${Math.floor(s / 86400)} 天前`;
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button onClick={toggle} className="btn btn-ghost btn-sm" style={{ width: 36, padding: 0, justifyContent: 'center', borderRadius: 999, position: 'relative' }} aria-label="通知">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 44, width: 320, maxHeight: 420, overflowY: 'auto', zIndex: 60,
          background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line-2)',
          boxShadow: 'var(--shadow-lg)', animation: 'dialogIn .2s ease both',
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-2)', fontSize: 14, fontWeight: 700 }}>通知</div>
          {items === null && <p className="caption" style={{ padding: 18 }}>加载中…</p>}
          {items && items.length === 0 && <p className="caption" style={{ padding: '28px 18px', textAlign: 'center' }}>还没有通知</p>}
          {items && items.map((n) => (
            <button key={n.id} onClick={() => { setOpen(false); if (n.actorId) navigate({ page: 'profile', userId: n.actorId }); }}
              style={{ display: 'flex', gap: 10, padding: '12px 18px', width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--line-2)', background: n.read ? 'transparent' : 'rgba(222,116,41,.05)', cursor: 'pointer' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}><Emoji text={typeEmoji[n.type] || '💡'} size={18} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, lineHeight: 1.5, display: 'block' }}>
                  <b>{n.actorName || 'Pawly'}</b> {n.content || ''}
                </span>
                <span className="caption" style={{ fontSize: 11.5 }}>{ago(n.createdAt)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 顶栏右上角：未登录显示「登录」，已登录显示头像（点击进个人中心）
function UserButton({ navigate }) {
  const [me, setMe] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive) setMe(d); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const loggedIn = me && !me.guest;
  if (loggedIn) {
    return (
      <button onClick={() => navigate({ page: 'member' })} aria-label="个人中心" title={me.phoneMasked || '个人中心'}
        style={{
          width: 36, height: 36, borderRadius: 999, border: '1px solid var(--line)',
          background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center', padding: 0,
        }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
        </svg>
      </button>
    );
  }
  return (
    <button onClick={() => navigate({ page: 'member' })} className="btn btn-line btn-sm">登录</button>
  );
}

// 滚动进场：进入视口后加 .in 浮现（动画样式见 globals.css .reveal）
export function Reveal({ children, delay = 0, className = '', style }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); ob.disconnect(); } }, { threshold: 0.12 });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal${inView ? ' in' : ''}${className ? ' ' + className : ''}`} style={{ ...style, transitionDelay: delay ? `${delay}ms` : undefined }}>
      {children}
    </div>
  );
}

// 智能图片层：铺在设计占位（色块+emoji）之上；素材不存在时自动隐藏。
// 素材放置约定：商品 /public/images/products/<id>.jpg，科普 /public/images/articles/<id>.jpg
export function SmartImage({ src, alt = '' }) {
  const [ok, setOk] = useState(true);
  useEffect(() => { setOk(true); }, [src]);
  if (!src || !ok) return null;
  return (
    <img src={src} alt={alt} draggable={false} onError={() => setOk(false)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
  );
}

// 全站搜索浮层：本地检索商品 + 科普文章，点击结果直接跳转
function SearchOverlay({ navigate, onClose }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const kw = q.trim();
  // 社区帖子：走后端检索（数据在数据库里），300ms 防抖
  const [postHits, setPostHits] = useState([]);
  useEffect(() => {
    if (!kw) { setPostHits([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/posts/search?q=${encodeURIComponent(kw)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setPostHits(Array.isArray(d) ? d : []))
        .catch(() => setPostHits([]));
    }, 300);
    return () => clearTimeout(t);
  }, [kw]);
  const { prods, arts } = useMemo(() => {
    if (!kw) return { prods: [], arts: [] };
    // 整词命中优先；否则拆成单字全部命中即可（"狗粮"→"狗"匹配宠物类型+"粮"匹配名称）
    const hit = (text) => text.includes(kw) || Array.from(kw).every((ch) => text.includes(ch));
    return {
      prods: PRODUCTS.filter((p) => hit(`${p.pet}${p.name}${p.sub}${p.desc}${(p.badges || []).join('')}`)).slice(0, 6),
      arts: ARTICLES.filter((a) => hit(`${a.title}${a.excerpt}`)).slice(0, 4),
    };
  }, [kw]);

  const go = (route) => { onClose(); navigate(route); };

  // 必须 Portal 到 body：header 的 backdrop-filter 会把 fixed 定位"困"在
  // 72px 高的 header 盒子里，导致遮罩只覆盖顶部一条、点击页面无法关闭
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,42,29,.35)', animation: 'fadeBg .2s ease' }} />
      <div role="dialog" aria-label="全站搜索" style={{
        position: 'relative', margin: '96px auto 0', width: 'min(640px, calc(100vw - 32px))',
        background: 'var(--bg)', borderRadius: 24, padding: 20, boxShadow: '0 24px 64px -16px rgba(31,42,29,.35)',
        maxHeight: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column',
        animation: 'dialogIn .28s cubic-bezier(.22,.61,.36,1) both',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input ref={inputRef} className="input" placeholder="搜索商品、科普文章、社区帖子…"
              value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 44 }} />
            <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </div>
          <button onClick={onClose} aria-label="关闭搜索" style={{ width: 40, height: 40, flexShrink: 0, border: '1px solid var(--line)', borderRadius: 999, background: 'var(--surface)', color: 'var(--ink-2)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6 18 18 M18 6 6 18" /></svg>
          </button>
        </div>

        <div style={{ overflowY: 'auto', marginTop: 8 }}>
          {kw && prods.length === 0 && arts.length === 0 && postHits.length === 0 && (
            <p className="caption" style={{ textAlign: 'center', padding: '32px 0' }}>没有找到「{kw}」相关的内容，换个词试试？</p>
          )}
          {prods.length > 0 && (
            <>
              <div className="eyebrow" style={{ margin: '14px 4px 8px' }}>商品</div>
              {prods.map((p) => (
                <button key={p.id} onClick={() => go({ page: 'product', id: p.id })}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 8px', borderRadius: 12, border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'var(--ink)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: p.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Emoji text={p.emoji} size={22} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div className="caption">{p.sub}</div>
                  </div>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{fmt(p.price)}</span>
                </button>
              ))}
            </>
          )}
          {arts.length > 0 && (
            <>
              <div className="eyebrow" style={{ margin: '14px 4px 8px' }}>科普文章</div>
              {arts.map((a) => (
                <button key={a.id} onClick={() => go({ page: 'article', id: a.id })}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 8px', borderRadius: 12, border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'var(--ink)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: a.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Emoji text={a.emoji} size={22} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                    <div className="caption" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.excerpt}</div>
                  </div>
                </button>
              ))}
            </>
          )}
          {postHits.length > 0 && (
            <>
              <div className="eyebrow" style={{ margin: '14px 4px 8px' }}>社区帖子</div>
              {postHits.map((ph) => (
                <button key={ph.id} onClick={() => go({ page: 'community', postId: ph.id })}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 8px', borderRadius: 12, border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'var(--ink)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  {ph.images?.[0] ? (
                    <img src={ph.images[0]} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: ph.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Emoji text={ph.emoji} size={22} /></div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ph.title}</div>
                    <div className="caption" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ph.author} · {ph.content}</div>
                  </div>
                </button>
              ))}
            </>
          )}
          {!kw && (
            <p className="caption" style={{ textAlign: 'center', padding: '24px 0', margin: 0 }}>试试搜「狗粮」「猫砂」「疫苗」「训练」…</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Footer({ navigate }) {
  const cols = [
    { title: '科普', items: [
      { t: '幼犬指南', to: { page: 'articles' } }, { t: '猫咪护理', to: { page: 'articles' } },
      { t: '训练教程', to: { page: 'articles' } }, { t: '健康百科', to: { page: 'articles' } },
    ] },
    { title: '社区', items: [
      { t: '铲屎官社区', to: { page: 'community' } }, { t: '晒宠分享', to: { page: 'community' } },
      { t: '好物种草', to: { page: 'community' } }, { t: '养宠求助', to: { page: 'community' } },
    ] },
    { title: '购物', items: [
      { t: '新品上架', to: { page: 'shop' } }, { t: '畅销商品', to: { page: 'shop' } },
      { t: '主粮零食', to: { page: 'shop', cat: 'food' } }, { t: '玩具好物', to: { page: 'shop', cat: 'toy' } },
    ] },
    { title: '会员', items: [
      { t: '会员权益', to: { page: 'member', tab: 'benefits' } }, { t: '我的订单', to: { page: 'member', tab: 'orders' } },
      { t: '宠物档案', to: { page: 'member', tab: 'pets' } }, { t: '地址管理', to: { page: 'member', tab: 'addr' } },
    ] },
  ];
  return (
    <footer style={{ background: 'var(--ink)', color: 'rgba(244,248,242,.72)', padding: '88px 0 32px' }}>
      <div className="container">
        {/* 编辑风品牌陈述：大衬线句子压场 */}
        <div style={{ marginBottom: 64, paddingBottom: 56, borderBottom: '1px solid rgba(244,248,242,.12)', position: 'relative', overflow: 'hidden' }}>
          <div className="eyebrow" style={{ color: 'rgba(244,248,242,.45)', marginBottom: 20 }}>PAWLY · 宝莉</div>
          <p className="serif m-h1" style={{ fontSize: 'clamp(28px, 3.6vw, 48px)', lineHeight: 1.22, margin: 0, color: '#F5F9F2', maxWidth: 760 }}>
            把宠物照顾明白这件事<br />没人天生就会 <span style={{ color: 'var(--green-soft)' }}>但可以问</span>
          </p>
          {/* 右侧低透明度贴纸群：打破深绿大面积纯色 */}
          <div aria-hidden className="m-none" style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-55%)', opacity: .16, display: 'flex', gap: 36, alignItems: 'flex-end' }}>
            <span className="float-deco" style={{ '--r': '-10deg', '--fd': '8s' }}><Emoji text="🦴" size={90} /></span>
            <span className="float-deco" style={{ '--r': '8deg', '--fd': '9.5s', '--fdel': '1.2s', marginBottom: 28 }}><Emoji text="🐾" size={130} /></span>
            <span className="float-deco" style={{ '--r': '-6deg', '--fd': '7s', '--fdel': '.6s' }}><Emoji text="🧶" size={80} /></span>
          </div>
        </div>
        <div className="m-2col m-gap" style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)', gap: 48, marginBottom: 64 }}>
          <div className="footer-brand">
            <div style={{ color: 'white', marginBottom: 16 }}><Logo /></div>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'rgba(255,255,255,.6)', maxWidth: 280 }}>
              专门给铲屎官选品的小铺子。每件商品都被我们的狗（和猫）亲自批准过。
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 600, marginBottom: 16, letterSpacing: '.04em' }}>{c.title}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.items.map((it) => (
                  <li key={it.t} style={{ fontSize: 13 }}>
                    <button onClick={() => { navigate?.(it.to); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                      style={{ border: 0, background: 'transparent', color: 'inherit', padding: 0, fontSize: 13, cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'inherit')}>
                      {it.t}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{
          paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12, color: 'rgba(255,255,255,.4)',
        }}>
          <span>© 2026 Pawly 宝莉 · 所有狗狗都是好狗狗 · Emoji graphics by Microsoft Fluent Emoji (MIT)</span>
          <span className="mono" style={{ whiteSpace: 'nowrap' }}>v 3.0 · 上海 → 你家门口</span>
        </div>
      </div>
    </footer>
  );
}

export function ProductCard({ p, onOpen, onAdd }) {
  return (
    <div className="card card-hot fade-up" style={{ padding: 12 }} onClick={() => onOpen(p)}>
      <div className="prod-img" style={{ background: `radial-gradient(closest-side at 42% 38%, rgba(255,255,255,.42), transparent), ${p.bg}` }}>
        <Emoji text={p.emoji} size={64} className="emoji" style={{ width: 'clamp(56px, 8vw, 104px)', height: 'clamp(56px, 8vw, 104px)', filter: 'drop-shadow(0 10px 18px rgba(31,42,29,.14))' }} />
        <SmartImage src={`/images/products/${p.id}.jpg`} alt={p.name} />
        <span className="pet-pill"><Emoji text={getPetSpecies(p.pet).emoji} size={14} /> {getPetSpecies(p.pet).label}</span>
        {p.tag && <span className="tag-pill">{p.tag}</span>}
      </div>
      <div style={{ padding: '14px 6px 6px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, minHeight: 38 }}>{p.name}</div>
        <div className="caption" style={{ marginTop: 4 }}>{p.sub}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }} className="mono">{fmt(p.price)}</span>
            {p.was && <span className="caption mono" style={{ textDecoration: 'line-through' }}>{fmt(p.was)}</span>}
          </div>
          <button onClick={(e) => {
              e.stopPropagation(); onAdd(p);
              const b = e.currentTarget; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = 'addPop .3s ease';
            }}
            style={{
              width: 32, height: 32, borderRadius: 999, border: 0,
              background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center',
              transition: 'transform .15s, background .15s',
            }} aria-label="加入购物车">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ArticleCard({ a, onOpen, featured }) {
  return (
    <article className="card card-hot fade-up m-col" onClick={() => onOpen(a)}
      style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: featured ? 'row' : 'column', gap: 0 }}>
      <div className="m-full" style={{
        background: a.bg, width: featured ? '50%' : '100%', overflow: 'hidden',
        aspectRatio: featured ? 'auto' : '16/10', minHeight: featured ? 160 : undefined, display: 'grid', placeItems: 'center', position: 'relative',
      }}>
        <Emoji text={a.emoji} size={featured ? 120 : 64} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.06))' }} />
        <SmartImage src={`/images/articles/${a.id}.jpg`} alt={a.title} />
        {a.refs?.length > 0 && <span className="tag-pill" title="内容编译自权威兽医指南，文末附来源">✓ 循证</span>}
      </div>
      <div style={{ padding: featured ? '40px' : '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          {ARTICLE_CATS.find((c) => c.id === a.cat)?.name} · {a.read}
        </div>
        <h3 className="serif" style={{ fontSize: featured ? 30 : 19, fontWeight: 500, lineHeight: 1.3, margin: '0 0 12px' }}>{a.title}</h3>
        <p className="body" style={{ margin: 0, fontSize: featured ? 15 : 14, display: '-webkit-box', WebkitLineClamp: featured ? 3 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {a.excerpt}
        </p>
        <div style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}><Emoji text="👤" size={14} /></div>
          <span className="caption">{a.author} · {a.date}</span>
        </div>
      </div>
    </article>
  );
}

export function CartDrawer({ open, onClose, items, setQty, removeItem, onCheckout }) {
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = items.length === 0 ? 0 : subtotal >= 99 ? 0 : 12;
  return (
    <>
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(31,42,29,.35)', zIndex: 60, animation: 'fadeBg .2s ease' }} />}
      <aside style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(440px, 100vw)',
        background: 'var(--bg)', zIndex: 70,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .35s cubic-bezier(.22,.61,.36,1)',
        display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 40px -8px rgba(31,42,29,.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderBottom: '1px solid var(--line-2)' }}>
          <div>
            <div className="eyebrow">Cart</div>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: '4px 0 0' }}>购物车 · {items.length}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ width: 36, padding: 0 }} aria-label="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6 18 18 M18 6 6 18" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 28px' }}>
          {items.length === 0 ? (
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: 16 }}><Emoji text="🦴" size={64} /></div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>购物车空空如也</h3>
              <p className="caption" style={{ margin: '0 0 24px' }}>主子等不及啦，快去挑点好东西~</p>
              <button onClick={onClose} className="btn btn-primary">去逛逛</button>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {items.map((it) => (
                <li key={it.id} style={{ display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--line-2)' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 14, background: it.bg, display: 'grid', placeItems: 'center' }}><Emoji text={it.emoji} size={36} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.name}</div>
                    <div className="caption" style={{ marginTop: 4 }}>{it.sub}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, border: '1px solid var(--line)', overflow: 'hidden', height: 26 }}>
                        <button onClick={() => setQty(it.id, Math.max(0, it.qty - 1))} style={{ width: 26, height: 26, border: 0, background: 'transparent', color: 'var(--ink)' }}>−</button>
                        <span style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: 600 }} className="mono">{it.qty}</span>
                        <button onClick={() => setQty(it.id, it.qty + 1)} style={{ width: 26, height: 26, border: 0, background: 'transparent', color: 'var(--ink)' }}>+</button>
                      </div>
                      <button onClick={() => removeItem(it.id)} style={{ background: 'transparent', border: 0, padding: 0, color: 'var(--ink-3)', fontSize: 12 }}>删除</button>
                    </div>
                  </div>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{fmt(it.price * it.qty)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {items.length > 0 && (
          <div style={{ padding: 28, borderTop: '1px solid var(--line-2)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
              <span>小计</span><span className="mono">{fmt(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)', marginTop: 8 }}>
              <span>运费 {shipping === 0 && subtotal > 0 && <span style={{ color: 'var(--accent)' }}>· 满 99 包邮</span>}</span>
              <span className="mono">{shipping === 0 ? '免费' : fmt(shipping)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 14, fontWeight: 600, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-2)' }}>
              <span>合计</span>
              <span className="mono" style={{ fontSize: 24, letterSpacing: '-0.01em' }}>{fmt(subtotal + shipping)}</span>
            </div>
            <button onClick={onCheckout} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}>去结算 →</button>
          </div>
        )}
      </aside>
    </>
  );
}
