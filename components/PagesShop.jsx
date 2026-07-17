// 首页 + 商品列表 + 商品详情
import { useState, useMemo } from 'react';
import { fmt } from './util';
import { PRODUCTS, CATEGORIES, ARTICLES } from './data';
import { ProductCard, ArticleCard, Reveal } from './ui';
import { Emoji } from './Emoji';

export function HomePage({ navigate, onAdd, onAskAI }) {
  const featured = PRODUCTS.slice(0, 8);
  const newArrivals = PRODUCTS.filter((p) => p.tag === '新品' || p.cat === 'snack').slice(0, 4);
  const marqueeArticles = ARTICLES.slice(0, 10);

  return (
    <>
      <section style={{ paddingTop: 80, paddingBottom: 64, position: 'relative' }}>
        <div aria-hidden className="hero-blobs"><span className="blob b1" /><span className="blob b2" /><span className="blob b3" /></div>
        <div className="container m-1col m-gap" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 64, alignItems: 'center', position: 'relative' }}>
          <div className="fade-up">
            <div className="eyebrow" style={{ marginBottom: 24 }}>Pawly · AI 宠物管家</div>
            <h1 className="h-display" style={{ margin: 0 }}>
              养宠不懂就问，<br /><span className="marker">AI 管家</span><br />随时在线。
            </h1>
            <p className="body-lg" style={{ marginTop: 28, maxWidth: 460 }}>
              从怎么喂、怎么养，到到底该买什么——Pawly 的 AI 管家基于循证科普先帮你把问题弄明白，再替你把东西挑对。
            </p>
            <div className="m-wrap" style={{ display: 'flex', gap: 12, marginTop: 36 }}>
              <button onClick={onAskAI} className="btn btn-primary btn-lg">让 AI 帮我挑 <span style={{ fontSize: 16 }}>→</span></button>
              <button onClick={() => navigate({ page: 'articles' })} className="btn btn-line btn-lg">看科普文章</button>
            </div>
            <div style={{ display: 'flex', gap: 40, marginTop: 56 }}>
              {[{ n: '24h', l: 'AI 管家在线' }, { n: '58 篇', l: '循证科普' }, { n: '120+', l: '严选商品' }].map((s) => (
                <div key={s.l}>
                  <div className="mono" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.n}</div>
                  <div className="caption" style={{ marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', aspectRatio: '1 / 1.05' }}>
            <div className="float-card" style={{ '--r': '-3deg', position: 'absolute', top: '4%', left: '0%', width: '54%', aspectRatio: '1/1.15', borderRadius: 28, background: '#F2CD9A', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-lg)' }}><Emoji text="🐶" size={160} /></div>
            <div className="float-card" style={{ '--r': '4deg', animationDelay: '1.4s', position: 'absolute', top: '8%', right: '0%', width: '46%', aspectRatio: '1/1', borderRadius: 24, background: '#D4DCE9', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-lg)' }}><Emoji text="🐱" size={130} /></div>
            <div className="float-card" style={{ '--r': '-2deg', animationDelay: '0.7s', position: 'absolute', bottom: '0%', left: '14%', width: '42%', aspectRatio: '1.4/1', borderRadius: 22, background: 'var(--ink)', color: 'var(--bg)', padding: 24, boxShadow: 'var(--shadow-lg)' }}>
              <div className="eyebrow" style={{ color: 'rgba(255,255,255,.6)' }}>Best Seller</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8, lineHeight: 1.3 }}>鸡胸肉条 · 训练奖励首选</div>
              <div className="mono" style={{ fontSize: 26, fontWeight: 700, marginTop: 14, letterSpacing: '-0.01em' }}>¥39 <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', textDecoration: 'line-through', fontWeight: 400 }}>¥49</span></div>
            </div>
            <div className="float-card" style={{ '--r': '3deg', animationDelay: '2.1s', position: 'absolute', bottom: '8%', right: '4%', width: '38%', aspectRatio: '1/1', borderRadius: 22, background: 'var(--accent)', padding: 20, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Emoji text="🦴" size={40} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2a1a0a' }}>新人专享</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#2a1a0a', lineHeight: 1.1, marginTop: 4 }}>首单 8 折</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0, paddingBottom: 32 }}>
        <Reveal>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 12 }}>宠物科普 · Pawly Journal</div>
                <h2 className="h-1" style={{ margin: 0, maxWidth: 560 }}>养宠物这件事，<br />没人天生就会。</h2>
              </div>
              <button onClick={() => navigate({ page: 'articles' })} className="btn btn-ghost">所有文章 →</button>
            </div>
          </div>
          {/* 无缝横向滚动：列表渲染两遍循环位移，悬停暂停可点击 */}
          <div className="marquee">
            <div className="marquee-track">
              {[...marqueeArticles, ...marqueeArticles].map((a, i) => (
                <div key={`${a.id}-${i}`} style={{ width: 320, flexShrink: 0 }} aria-hidden={i >= marqueeArticles.length || undefined}>
                  <ArticleCard a={a} onOpen={(x) => navigate({ page: 'article', id: x.id })} />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section style={{ paddingTop: 32, paddingBottom: 32 }}>
        <Reveal><div className="container">
          <div className="m-1col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { e: '💬', t: '有问题，先问一句', d: '掉毛、软便、挑食、要不要驱虫……随时开口，AI 管家马上接住。' },
              { e: '📖', t: '答案有出处', d: '回答基于站内循证科普与权威兽医资料，不瞎编、不带货式忽悠。' },
              { e: '🛒', t: '需要买，才推荐', d: '确实需要用到什么，AI 才会从严选清单里帮你挑，一键加购。' },
            ].map((s) => (
              <div key={s.t} className="card" style={{ padding: '24px 24px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <Emoji text={s.e} size={28} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{s.t}</div>
                  <div className="caption" style={{ marginTop: 6, lineHeight: 1.55 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div></Reveal>
      </section>

      <section style={{ paddingTop: 32, paddingBottom: 32 }}>
        <Reveal><div className="container">
          <div className="m-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 16 }}>
            {CATEGORIES.slice(1).map((c) => (
              <button key={c.id} onClick={() => navigate({ page: 'shop', cat: c.id })} className="card-hot"
                style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 18, padding: '24px 8px', textAlign: 'center', transition: 'transform .18s ease, box-shadow .22s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Emoji text={c.icon} size={28} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
              </button>
            ))}
          </div>
        </div></Reveal>
      </section>

      <section style={{ paddingTop: 56, paddingBottom: 56 }}>
        <Reveal><div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>编辑精选</div>
              <h2 className="h-1" style={{ margin: 0 }}>本周人气好物</h2>
            </div>
            <button onClick={() => navigate({ page: 'shop' })} className="btn btn-ghost">查看全部 →</button>
          </div>
        </div>
        {/* 商品无缝横向滚动（与科普栏反向），悬停暂停 */}
        <div className="marquee">
          <div className="marquee-track marquee-track-rev">
            {[...featured, ...featured].map((p, i) => (
              <div key={`${p.id}-${i}`} style={{ width: 300, flexShrink: 0 }} aria-hidden={i >= featured.length || undefined}>
                <ProductCard p={p} onOpen={(x) => navigate({ page: 'product', id: x.id })} onAdd={onAdd} />
              </div>
            ))}
          </div>
        </div></Reveal>
      </section>

      <section style={{ paddingTop: 32, paddingBottom: 32 }}>
        <Reveal><div className="container">
          <div className="m-1col m-pad" style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 28, padding: '56px 56px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 40, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -40, bottom: -60, opacity: .08 }}><Emoji text="🐾" size={280} /></div>
            <div style={{ position: 'relative' }}>
              <div className="eyebrow" style={{ color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>Pawly Club · 会员计划</div>
              <h2 style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>把日常开销，<br />变成会员福利。</h2>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,.7)', marginTop: 16, maxWidth: 480 }}>
                ¥29/月 解锁全场 9 折、更多 AI 管家额度、生日礼盒，以及每年一次免费宠物体检。日常买粮买罐头省下的钱，往往就够回本。
              </p>
              <button onClick={() => navigate({ page: 'member', tab: 'benefits' })} className="btn btn-accent btn-lg" style={{ marginTop: 28 }}>了解会员 →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, position: 'relative' }}>
              {[{ e: '🤖', t: 'AI 额度升级' }, { e: '💳', t: '全场 9 折' }, { e: '🏥', t: '年度体检' }, { e: '🎂', t: '生日福利' }].map((it) => (
                <div key={it.t} style={{ background: 'rgba(255,255,255,.08)', backdropFilter: 'blur(8px)', borderRadius: 14, padding: '20px 16px', border: '1px solid rgba(255,255,255,.1)', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Emoji text={it.e} size={18} />{it.t}
                </div>
              ))}
            </div>
          </div>
        </div></Reveal>
      </section>

      <section style={{ paddingTop: 56, paddingBottom: 96 }}>
        <Reveal><div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>本周新品</div>
              <h2 className="h-1" style={{ margin: 0 }}>新到货</h2>
            </div>
            <button onClick={() => navigate({ page: 'shop' })} className="btn btn-ghost">查看全部 →</button>
          </div>
          <div className="m-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {newArrivals.map((p) => <ProductCard key={p.id} p={p} onOpen={(p) => navigate({ page: 'product', id: p.id })} onAdd={onAdd} />)}
          </div>
        </div></Reveal>
      </section>
    </>
  );
}

export function ShopPage({ initialCat, navigate, onAdd }) {
  const [cat, setCat] = useState(initialCat || 'all');
  const [pet, setPet] = useState('全部');
  const [sort, setSort] = useState('热度');

  const filtered = useMemo(() => {
    let list = PRODUCTS.filter((p) => (cat === 'all' || p.cat === cat) && (pet === '全部' || p.pet === pet));
    if (sort === '价格升序') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === '价格降序') list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === '评分') list = [...list].sort((a, b) => b.rating - a.rating);
    else list = [...list].sort((a, b) => b.sold - a.sold);
    return list;
  }, [cat, pet, sort]);

  return (
    <>
      <section style={{ paddingTop: 56, paddingBottom: 32 }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 16 }}>商品 / Shop all</div>
          <h1 className="h-1" style={{ margin: 0, maxWidth: 720 }}>挑货吧，铲屎官。<br />每一件都被我们的狗（或猫）批准过。</h1>
        </div>
      </section>

      <div className="m-static" style={{ position: 'sticky', top: 72, zIndex: 30, background: 'rgba(244,239,231,.78)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--line-2)', borderBottom: '1px solid var(--line-2)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', gap: 16, flexWrap: 'wrap' }}>
          <div className="h-scroll" style={{ display: 'flex', gap: 8 }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)}
                style={{ height: 36, padding: '0 16px', borderRadius: 999, background: cat === c.id ? 'var(--ink)' : 'var(--surface)', color: cat === c.id ? 'var(--bg)' : 'var(--ink)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, border: cat === c.id ? 0 : '1px solid var(--line-2)', transition: 'all .15s' }}>
                <Emoji text={c.icon} size={15} />{c.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'inline-flex', borderRadius: 999, padding: 3, background: 'var(--surface-2)', border: '1px solid var(--line-2)' }}>
              {['全部', '狗', '猫'].map((p) => (
                <button key={p} onClick={() => setPet(p)}
                  style={{ height: 28, padding: '0 14px', borderRadius: 999, border: 0, background: pet === p ? 'var(--surface)' : 'transparent', boxShadow: pet === p ? 'var(--shadow-sm)' : 'none', color: 'var(--ink)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Emoji text={p === '狗' ? '🐶' : p === '猫' ? '🐱' : '✨'} size={13} /> {p}
                </button>
              ))}
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              style={{ height: 34, padding: '0 12px', borderRadius: 999, border: '1px solid var(--line-2)', background: 'var(--surface)', fontSize: 12, color: 'var(--ink)', fontFamily: 'inherit' }}>
              <option>热度</option><option>评分</option><option>价格升序</option><option>价格降序</option>
            </select>
          </div>
        </div>
      </div>

      <section style={{ paddingTop: 32, paddingBottom: 96 }}>
        <div className="container">
          <div className="caption" style={{ marginBottom: 24 }}>共 {filtered.length} 件商品</div>
          <div className="m-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {filtered.map((p) => <ProductCard key={p.id} p={p} onOpen={(p) => navigate({ page: 'product', id: p.id })} onAdd={onAdd} />)}
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: '96px 0', textAlign: 'center' }}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: 16 }}><Emoji text="🥹" size={64} /></div>
              <p className="body">没有找到合适的商品，试试别的分类？</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function ProductPage({ id, navigate, onAdd, onCartOpen }) {
  const p = PRODUCTS.find((x) => x.id === id) || PRODUCTS[0];
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState(0);
  const variants = p.cat === 'food' ? ['500g', '1.5kg', '5kg'] : p.cat === 'out' ? ['S', 'M', 'L'] : ['标准装', '家庭装'];
  const related = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4);

  return (
    <>
      <section style={{ paddingTop: 32, paddingBottom: 64 }}>
        <div className="container">
          <div className="caption" style={{ marginBottom: 24, display: 'flex', gap: 6 }}>
            <button onClick={() => navigate({ page: 'home' })} style={{ background: 'none', border: 0, padding: 0, color: 'inherit' }}>首页</button>
            <span>/</span>
            <button onClick={() => navigate({ page: 'shop' })} style={{ background: 'none', border: 0, padding: 0, color: 'inherit' }}>商品</button>
            <span>/</span>
            <span style={{ color: 'var(--ink-2)' }}>{p.name}</span>
          </div>
          <div className="m-1col m-gap" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
            <div>
              <div className="prod-img" style={{ background: p.bg, aspectRatio: '1/1', borderRadius: 24 }}>
                <span className="pet-pill"><Emoji text={p.pet === '狗' ? '🐶' : '🐱'} size={14} /> {p.pet === '狗' ? '狗狗' : '猫咪'}</span>
                {p.tag && <span className="tag-pill">{p.tag}</span>}
                <Emoji text={p.emoji} size={220} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12 }}>
                {[p.emoji, '📷', '📐', '🎬'].map((e, i) => (
                  <div key={i} style={{ aspectRatio: '1/1', borderRadius: 12, background: i === 0 ? p.bg : 'var(--surface-2)', display: 'grid', placeItems: 'center', border: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line-2)', cursor: 'pointer' }}><Emoji text={e} size={28} /></div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
                <span className="badge" style={{ background: 'var(--bg)' }}>★ {p.rating} · {p.sold.toLocaleString()} 已售</span>
                {p.tag && <span className="badge" style={{ background: 'var(--ink)', color: 'var(--bg)', borderColor: 'transparent' }}>{p.tag}</span>}
              </div>
              <h1 className="h-2" style={{ margin: 0, fontSize: 36 }}>{p.name}</h1>
              <p className="body-lg" style={{ marginTop: 16 }}>{p.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
                {p.badges.map((b) => <span key={b} className="badge">✓ {b}</span>)}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 32 }}>
                <span className="mono" style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em' }}>{fmt(p.price)}</span>
                {p.was && <span className="mono caption" style={{ textDecoration: 'line-through', fontSize: 16 }}>{fmt(p.was)}</span>}
                {p.was && <span className="badge" style={{ background: 'var(--accent)', color: '#2a1a0a', borderColor: 'transparent', fontWeight: 600 }}>省 {fmt(p.was - p.price)}</span>}
              </div>
              <div style={{ marginTop: 32 }}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>规格</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {variants.map((v, i) => (
                    <button key={v} onClick={() => setVariant(i)} style={{ height: 44, padding: '0 22px', borderRadius: 999, border: variant === i ? '2px solid var(--ink)' : '1px solid var(--line)', background: variant === i ? 'var(--ink)' : 'var(--surface)', color: variant === i ? 'var(--bg)' : 'var(--ink)', fontSize: 14, fontWeight: 500 }}>{v}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 32, alignItems: 'stretch' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, border: '1px solid var(--line)', overflow: 'hidden', height: 52, background: 'var(--surface)' }}>
                  <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 44, height: 52, border: 0, background: 'transparent', color: 'var(--ink)', fontSize: 18 }}>−</button>
                  <span style={{ width: 40, textAlign: 'center', fontSize: 16, fontWeight: 600 }} className="mono">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} style={{ width: 44, height: 52, border: 0, background: 'transparent', color: 'var(--ink)', fontSize: 18 }}>+</button>
                </div>
                <button onClick={() => { onAdd(p, qty); onCartOpen(); }} className="btn btn-primary btn-lg" style={{ flex: 1, justifyContent: 'center' }}>加入购物车 · {fmt(p.price * qty)}</button>
              </div>
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--line-2)', display: 'flex', gap: 28, fontSize: 13, color: 'var(--ink-2)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Emoji text="🚚" size={14} /> 满 ¥99 包邮</span>
                <span>↺ 7 天无理由退换</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Emoji text="🏷️" size={14} /> 假一赔三</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 商品介绍 + 规格参数 */}
      <section style={{ paddingTop: 8, paddingBottom: 64 }}>
        <div className="container">
          <div className="m-1col m-gap" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 48 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>商品介绍</div>
              <h2 className="h-2" style={{ margin: '0 0 16px' }}>关于这款{CATEGORIES.find((c) => c.id === p.cat)?.name || '商品'}</h2>
              <p className="body-lg" style={{ marginTop: 0 }}>{p.detail || p.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
                {p.badges.map((b) => <span key={b} className="badge">✓ {b}</span>)}
              </div>
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: 24, padding: 28, border: '1px solid var(--line-2)', alignSelf: 'start' }}>
              <div className="eyebrow" style={{ marginBottom: 16 }}>规格参数</div>
              <dl style={{ margin: 0 }}>
                {[
                  ['适用宠物', <span key="pet" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Emoji text={p.pet === '狗' ? '🐶' : '🐱'} size={14} /> {p.pet === '狗' ? '狗狗' : '猫咪'}</span>],
                  ['规格 / 适用', p.sub],
                  ['类别', CATEGORIES.find((c) => c.id === p.cat)?.name || '—'],
                  ['主要卖点', p.badges.join(' / ')],
                  ['评分', `★ ${p.rating}`],
                  ['累计已售', p.sold.toLocaleString()],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--line-2)' }}>
                    <dt className="caption">{k}</dt>
                    <dd style={{ margin: 0, fontSize: 14, color: 'var(--ink)' }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 32, paddingBottom: 96 }}>
        <div className="container">
          <h2 className="h-2" style={{ margin: '0 0 32px' }}>顺手再看看</h2>
          <div className="m-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {related.map((rp) => <ProductCard key={rp.id} p={rp} onOpen={(p) => { navigate({ page: 'product', id: p.id }); window.scrollTo(0, 0); }} onAdd={onAdd} />)}
          </div>
        </div>
      </section>
    </>
  );
}
