// 共享组件：Logo、Header、Footer、ProductCard、ArticleCard、CartDrawer
import { fmt } from './util';
import { ARTICLE_CATS } from './data';

export const Logo = ({ size = 28 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="9" cy="11" r="3" fill="currentColor" />
      <circle cx="16" cy="8" r="3" fill="currentColor" />
      <circle cx="23" cy="11" r="3" fill="currentColor" />
      <circle cx="6" cy="18" r="2.4" fill="currentColor" />
      <path d="M9 21c0-3.5 3-6 7-6s7 2.5 7 6c0 2.5-2 4.5-7 4.5S9 23.5 9 21Z" fill="currentColor" />
    </svg>
    <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Pawly</span>
    <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, marginLeft: -2 }}>宝莉</span>
  </div>
);

export function Header({ route, navigate, cartCount, onCartOpen }) {
  const navItems = [
    { id: 'home', label: '首页' },
    { id: 'shop', label: '商品' },
    { id: 'articles', label: '宠物科普' },
    { id: 'member', label: '会员' },
  ];
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(239,244,242,.78)',
      backdropFilter: 'blur(14px) saturate(140%)', WebkitBackdropFilter: 'blur(14px) saturate(140%)',
      borderBottom: '1px solid var(--line-2)',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        <button onClick={() => navigate({ page: 'home' })} style={{ border: 0, background: 'transparent', color: 'var(--ink)', padding: 0 }}>
          <Logo />
        </button>
        <nav style={{ display: 'flex', gap: 4 }}>
          {navItems.map((it) => {
            const active = route.page === it.id
              || (it.id === 'shop' && ['product'].includes(route.page))
              || (it.id === 'articles' && ['article'].includes(route.page));
            return (
              <button key={it.id} onClick={() => navigate({ page: it.id })}
                style={{
                  height: 36, padding: '0 14px', borderRadius: 999, border: 0,
                  background: active ? 'var(--ink)' : 'transparent',
                  color: active ? 'var(--bg)' : 'var(--ink)',
                  fontSize: 14, fontWeight: 500, transition: 'background .15s',
                }}>{it.label}</button>
            );
          })}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 36, padding: 0 }} aria-label="搜索">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
          </button>
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
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const cols = [
    { title: '购物', items: ['新品上架', '畅销商品', '订阅服务', '礼品卡'] },
    { title: '科普', items: ['幼犬指南', '猫咪护理', '训练课程', '健康百科'] },
    { title: '客服', items: ['配送说明', '退换政策', '联系我们', '常见问题'] },
    { title: '关于', items: ['品牌故事', '加入我们', '宠物公益', '商业合作'] },
  ];
  return (
    <footer style={{ background: 'var(--ink)', color: 'rgba(255,255,255,.7)', padding: '80px 0 32px' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)', gap: 48, marginBottom: 64 }}>
          <div>
            <div style={{ color: 'white', marginBottom: 16 }}><Logo /></div>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'rgba(255,255,255,.6)', maxWidth: 280 }}>
              专门给铲屎官选品的小铺子。每件商品都被我们的狗（和猫）亲自批准过。
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 600, marginBottom: 16, letterSpacing: '.04em' }}>{c.title}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.items.map((it) => <li key={it} style={{ fontSize: 13 }}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{
          paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12, color: 'rgba(255,255,255,.4)',
        }}>
          <span>© 2026 Pawly 宝莉 · 所有狗狗都是好狗狗</span>
          <span className="mono">v 3.0 · 上海 → 你家门口</span>
        </div>
      </div>
    </footer>
  );
}

export function ProductCard({ p, onOpen, onAdd }) {
  return (
    <div className="card fade-up" style={{ padding: 12, cursor: 'pointer' }} onClick={() => onOpen(p)}>
      <div className="prod-img" style={{ background: p.bg }}>
        <span className="pet-pill">{p.pet === '狗' ? '🐶 狗狗' : '🐱 猫咪'}</span>
        {p.tag && <span className="tag-pill">{p.tag}</span>}
        <span className="emoji">{p.emoji}</span>
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
    <article className="card fade-up" onClick={() => onOpen(a)}
      style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: featured ? 'row' : 'column', gap: 0 }}>
      <div style={{
        background: a.bg, width: featured ? '50%' : '100%',
        aspectRatio: featured ? 'auto' : '16/10', display: 'grid', placeItems: 'center',
        fontSize: featured ? 120 : 64, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.06))',
      }}>{a.emoji}</div>
      <div style={{ padding: featured ? '40px' : '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          {ARTICLE_CATS.find((c) => c.id === a.cat)?.name} · {a.read}
        </div>
        <h3 style={{ fontSize: featured ? 28 : 18, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.25, margin: '0 0 12px' }}>{a.title}</h3>
        <p className="body" style={{ margin: 0, fontSize: featured ? 15 : 14, display: '-webkit-box', WebkitLineClamp: featured ? 3 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {a.excerpt}
        </p>
        <div style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', fontSize: 13 }}>👤</div>
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
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(38,70,83,.35)', zIndex: 60, animation: 'fadeBg .2s ease' }} />}
      <aside style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(440px, 100vw)',
        background: 'var(--bg)', zIndex: 70,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .35s cubic-bezier(.22,.61,.36,1)',
        display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 40px -8px rgba(38,70,83,.18)',
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
              <div style={{ fontSize: 64, marginBottom: 16 }}>🦴</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>购物车空空如也</h3>
              <p className="caption" style={{ margin: '0 0 24px' }}>主子等不及啦，快去挑点好东西~</p>
              <button onClick={onClose} className="btn btn-primary">去逛逛</button>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {items.map((it) => (
                <li key={it.id} style={{ display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--line-2)' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 14, background: it.bg, display: 'grid', placeItems: 'center', fontSize: 36 }}>{it.emoji}</div>
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
