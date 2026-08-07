// 科普列表 + 文章详情 + 结算 + 会员中心（宠物档案接真实 /api/pets）
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { fmt } from './util';
import { ARTICLES, ARTICLE_CATS, PRODUCTS } from './data';
import { ArticleCard, ProductCard, FloatEmoji, Avatar } from './ui';
import { LoginDialog } from './LoginDialog';
import { Emoji } from './Emoji';
import { VideoSlot } from './VideoSlot';
import { PET_CONTENT_FILTERS, PET_SPECIES, RODENT_ALIASES, getPetSpecies } from '@/lib/pet-species';

const petEmoji = (sp) => getPetSpecies(sp).emoji;
const petBg = (sp) => ({ dog: '#F4D7B0', cat: '#D3DEE2', rabbit: '#E8DCCF', bird: '#DCE5D4', hamster: '#F2DDC1', guinea_pig: '#EAD9DE', aquatic: '#C8DDE2', reptile: '#D5E0CC', mini_pig: '#F4D7B0' }[getPetSpecies(sp).id] || '#D3DEE2');

export function ArticlesPage({ navigate }) {
  const [cat, setCat] = useState('all');
  const [species, setSpecies] = useState('all');
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => ARTICLES
      .filter((a) => (cat === 'all' || a.cat === cat) && (species === 'all' || articleMatchesSpecies(a, species)) && (q === '' || a.title.includes(q) || a.excerpt.includes(q)))
      .sort((a, b) => articlePublicationTime(b) - articlePublicationTime(a)),
    [cat, species, q],
  );
  const [hero, ...rest] = filtered;

  return (
    <>
      <section style={{ paddingTop: 64, paddingBottom: 32 }}>
        <div className="container m-col m-gap" style={{ display: 'flex', alignItems: 'flex-end', gap: 48 }}>
          <div style={{ flex: 1 }}>
            <div className="eyebrow eyebrow-rule" style={{ marginBottom: 16 }}>Pawly Journal · 宠物科普</div>
            <h1 className="h-1" style={{ margin: 0, maxWidth: 760 }}>养它 从<span style={{ color: 'var(--green-soft)' }}>了解它</span>开始</h1>
            <p className="body-lg" style={{ marginTop: 20, maxWidth: 620 }}>和兽医、训犬师、铲屎官一起写的实用指南。没有专业术语，只有"今晚就能用"的小知识。</p>
            <div style={{ marginTop: 32, position: 'relative', maxWidth: 480 }}>
              <input className="input" placeholder="搜索：幼犬、疫苗、训练、剪指甲..." value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 44 }} />
              <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </div>
          </div>
          {/* 栏目氛围视频（public/videos/journal.mp4，与首页共用素材）+ 漂浮贴纸 */}
          <div className="m-full" style={{ position: 'relative', flexShrink: 0 }}>
            <FloatEmoji e="🌿" size={42} style={{ left: -26, top: -20 }} r={-10} dur={8.2} />
            <FloatEmoji e="🐾" size={34} style={{ right: -18, bottom: -12 }} r={14} rd={-4} dur={6.8} delay={1} />
            <div className="m-full" style={{ position: 'relative', width: 340, height: 200, borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
              <VideoSlot name="journal" overlay="linear-gradient(180deg, transparent 55%, rgba(31,42,29,.35))" />
              <span style={{ position: 'absolute', left: 16, bottom: 12, fontSize: 12.5, fontWeight: 600, color: '#fff', textShadow: '0 1px 4px rgba(31,42,29,.5)' }}>和它一起慢慢学</span>
            </div>
          </div>
        </div>
      </section>
      <div style={{ borderTop: '1px solid var(--line-2)', borderBottom: '1px solid var(--line-2)' }}>
        <div className="container">
          <div className="h-scroll" style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
            {ARTICLE_CATS.map((c) => (
              <button key={c.id} onClick={() => { setCat(c.id); if (c.id === 'all') setSpecies('all'); }} style={{ height: 40, padding: '0 16px', borderRadius: 999, border: 0, background: cat === c.id ? 'var(--ink)' : 'transparent', color: cat === c.id ? 'var(--bg)' : 'var(--ink)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{c.name}</button>
            ))}
          </div>
          <div className="h-scroll" style={{ display: 'flex', gap: 4, padding: '0 0 10px' }}>
            <span className="caption" style={{ display: 'inline-flex', alignItems: 'center', padding: '0 8px 0 2px', whiteSpace: 'nowrap' }}>按宠物</span>
            <button onClick={() => { setCat('all'); setSpecies('all'); }} style={speciesFilterStyle(species === 'all')}>全部</button>
            {PET_CONTENT_FILTERS.filter((item) => item.id !== 'all').map((item) => (
              <button key={item.id} onClick={() => setSpecies(item.id)} style={speciesFilterStyle(species === item.id)}>
                <Emoji text={item.emoji} size={14} /> {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <section style={{ paddingTop: 48, paddingBottom: 96 }}>
        <div className="container">
          {hero && <div style={{ marginBottom: 40 }}><ArticleCard a={hero} featured onOpen={(a) => navigate({ page: 'article', id: a.id })} /></div>}
          <div className="m-1col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {rest.map((a) => <ArticleCard key={a.id} a={a} onOpen={(a) => navigate({ page: 'article', id: a.id })} />)}
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: '96px 0', textAlign: 'center' }}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: 16 }}><Emoji text="🔍" size={64} /></div>
              <p className="body">没找到匹配的文章，换个关键词试试？</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function articlePublicationTime(article) {
  const machineReadableDate = article.publishedAt || article.importedAt;
  if (machineReadableDate) {
    const timestamp = Date.parse(machineReadableDate);
    if (!Number.isNaN(timestamp)) return timestamp;
  }

  // 现有人工录入内容仅展示月日；这些历史内容均为 2026 年发布。
  const match = String(article.date || '').match(/(?:(\d{4})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*日?/);
  if (!match) return 0;
  const [, year, month, day] = match;
  return Date.UTC(Number(year || 2026), Number(month) - 1, Number(day));
}

function articleMatchesSpecies(article, speciesName) {
  const filter = PET_CONTENT_FILTERS.find((item) => item.id === speciesName);
  if (!filter || filter.id === 'all') return true;
  if (Array.isArray(article.species) && article.species.length) {
    return filter.speciesIds.some((id) => article.species.includes(id));
  }
  const text = `${article.title} ${article.excerpt}`.toLowerCase();
  if (filter.id === 'rodent') return RODENT_ALIASES.some((alias) => text.includes(alias.toLowerCase()));
  return filter.speciesIds.some((id) => {
    const species = PET_SPECIES.find((item) => item.id === id);
    return species?.aliases.some((alias) => text.includes(alias.toLowerCase())) || text.includes(species?.name.toLowerCase() || '');
  });
}

function speciesFilterStyle(active) {
  return {
    height: 32,
    padding: '0 12px',
    borderRadius: 999,
    border: 0,
    background: active ? 'var(--surface-2)' : 'transparent',
    color: 'var(--ink)',
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  };
}

export function ArticlePage({ id, navigate }) {
  const a = ARTICLES.find((x) => x.id === id) || ARTICLES[0];
  const more = ARTICLES.filter((x) => x.cat === a.cat && x.id !== a.id).slice(0, 3);
  const allMore = more.length > 0 ? more : ARTICLES.filter((x) => x.id !== a.id).slice(0, 3);

  // 收藏存本地（登录体系完善后可迁到服务端）；分享=复制链接
  const [faved, setFaved] = useState(false);
  const [shared, setShared] = useState(false);
  useEffect(() => {
    try { setFaved((JSON.parse(localStorage.getItem('pawly.favArticles') || '[]')).includes(a.id)); } catch {}
  }, [a.id]);
  function toggleFav() {
    try {
      const list = JSON.parse(localStorage.getItem('pawly.favArticles') || '[]');
      const next = list.includes(a.id) ? list.filter((x) => x !== a.id) : [...list, a.id];
      localStorage.setItem('pawly.favArticles', JSON.stringify(next));
      setFaved(next.includes(a.id));
    } catch {}
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {}
  }

  return (
    <>
      <section style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div className="container">
          <button onClick={() => navigate({ page: 'articles' })} className="btn btn-ghost btn-sm" style={{ paddingLeft: 6 }}>← 返回文章列表</button>
        </div>
      </section>
      <article>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="eyebrow eyebrow-rule" style={{ marginBottom: 16 }}>{ARTICLE_CATS.find((c) => c.id === a.cat)?.name} · {a.read}</div>
          <h1 className="h-1 m-h1" style={{ margin: 0, fontSize: 48 }}>{a.title}</h1>
          <p style={{ fontSize: 19, lineHeight: 1.65, color: 'var(--ink-2)', marginTop: 24 }}>{a.excerpt}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--line-2)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}><Emoji text="👤" size={20} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{a.author}</div>
              <div className="caption">{a.date} · {a.read}阅读</div>
            </div>
            <button className="btn btn-line btn-sm" onClick={toggleFav} style={faved ? { background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1.5px var(--ink)' } : undefined}>
              {faved ? '已收藏 ★' : '收藏 ☆'}
            </button>
            <button className="btn btn-line btn-sm" onClick={share}>{shared ? '已复制链接 ✓' : '分享'}</button>
          </div>
        </div>
        <div className="container" style={{ maxWidth: 880, marginTop: 48 }}>
          <div style={{ background: a.bg, borderRadius: 20, aspectRatio: '21/9', display: 'grid', placeItems: 'center' }}>
            <Emoji text={a.emoji} size={200} style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,.06))' }} />
          </div>
        </div>
        <div className="container" style={{ maxWidth: 720, marginTop: 56 }}>
          {a.body.map((p, i) => (
            <p key={i} style={{ fontSize: 18, lineHeight: 1.75, color: 'var(--ink)', margin: '0 0 24px' }}>
              {i === 0 && <span className="serif" style={{ float: 'left', fontSize: 64, lineHeight: 1, paddingRight: 12, paddingTop: 6, fontWeight: 500 }}>{p[0]}</span>}
              {i === 0 ? p.slice(1) : p}
            </p>
          ))}
          {/* 参考来源：循证文章标注编译出处，点击可跳转权威机构原文 */}
          {a.refs?.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', borderLeft: '3px solid var(--sage)', borderRadius: 14, padding: '24px 28px', marginTop: 40 }}>
              <div className="eyebrow" style={{ color: 'var(--sage)', marginBottom: 14 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--sage)' }} />
                参考来源 · References
              </div>
              <hr className="hairline" style={{ marginBottom: 14 }} />
              <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {a.refs.map((r, i) => (
                  <li key={i} style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.org}</span>
                    {' · '}
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: 'var(--sage)' }}>{r.title}</a>
                  </li>
                ))}
              </ol>
              <hr className="hairline" style={{ marginTop: 14 }} />
              <p className="caption" style={{ margin: '12px 0 0' }}>本文由 Pawly 编辑团队编译整理自上述公开指南，仅供参考。</p>
            </div>
          )}
          <div style={{ background: 'var(--ink)', color: '#F5F9F2', borderRadius: 16, padding: 32, marginTop: a.refs?.length ? 16 : 40, display: 'flex', gap: 20 }}>
            <Emoji text="💡" size={36} />
            <div>
              <div className="eyebrow" style={{ color: 'rgba(244,248,242,.55)', marginBottom: 8 }}>Pawly 提示</div>
              <p className="serif" style={{ fontSize: 17, lineHeight: 1.65, margin: 0, color: 'rgba(244,248,242,.92)' }}>{a.refs?.length ? '内容编译自权威兽医指南，但每只宠物都是独特的。' : '这些建议来自我们的合作兽医团队，但每只宠物都是独特的。'}有任何异常情况，第一时间联系你的兽医才是最稳妥的。</p>
            </div>
          </div>
        </div>
      </article>
      <section style={{ paddingTop: 80, paddingBottom: 96 }}>
        <div className="container">
          <h2 className="h-2" style={{ margin: '0 0 32px' }}>继续阅读</h2>
          <div className="m-1col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {allMore.map((x) => <ArticleCard key={x.id} a={x} onOpen={(a) => { navigate({ page: 'article', id: a.id }); window.scrollTo(0, 0); }} />)}
          </div>
        </div>
      </section>
    </>
  );
}

const EMPTY_ADDR_FORM = { name: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: false };

export function CheckoutPage({ items, navigate, clearCart }) {
  const [step, setStep] = useState(items.length === 0 ? 'empty' : 'form');
  const [delivery, setDelivery] = useState('standard');
  const [pay, setPay] = useState('wechat');
  const [addresses, setAddresses] = useState(null); // null=加载中
  const [selectedId, setSelectedId] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [addrForm, setAddrForm] = useState(EMPTY_ADDR_FORM);
  const [addrError, setAddrError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null); // 下单成功后的 {orderId, total}
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = delivery === 'express' ? 18 : subtotal >= 99 ? 0 : 12;
  const total = subtotal + shipping;

  const loadAddresses = useCallback(async () => {
    try {
      const r = await fetch('/api/addresses');
      const list = r.ok ? await r.json() : [];
      setAddresses(list);
      setSelectedId((prev) => prev || list.find((a) => a.isDefault)?.id || list[0]?.id || null);
      if (list.length === 0) setAddingNew(true);
    } catch { setAddresses([]); setAddingNew(true); }
  }, []);
  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  async function saveNewAddress() {
    const f = addrForm;
    if (!f.name.trim() || !f.phone.trim() || !f.province.trim() || !f.city.trim() || !f.district.trim() || !f.detail.trim()) {
      setAddrError('请填写完整的收货信息'); return false;
    }
    if (!/^1\d{10}$/.test(f.phone.trim())) { setAddrError('手机号格式不正确'); return false; }
    setAddrError('');
    const r = await fetch('/api/addresses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setAddrError(d.error || '保存失败'); return false; }
    setAddrForm(EMPTY_ADDR_FORM);
    setAddingNew(false);
    await loadAddresses();
    setSelectedId(d.id);
    return d.id; // 返回新地址 id 供下单直接使用
  }

  if (step === 'empty') {
    return (
      <section style={{ paddingTop: 120, paddingBottom: 120 }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{ display: 'grid', placeItems: 'center' }}><Emoji text="🦴" size={96} /></div>
          <h2 className="h-1" style={{ marginTop: 24 }}>购物车里空空的</h2>
          <p className="body-lg" style={{ marginTop: 12 }}>挑两件给毛孩子吧。</p>
          <button onClick={() => navigate({ page: 'shop' })} className="btn btn-primary btn-lg" style={{ marginTop: 24 }}>去逛逛</button>
        </div>
      </section>
    );
  }
  if (step === 'done') {
    return (
      <section style={{ paddingTop: 120, paddingBottom: 120 }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 520 }}>
          <div style={{ display: 'grid', placeItems: 'center' }}><Emoji text="🎉" size={80} /></div>
          <h2 className="h-1" style={{ marginTop: 24 }}>下单成功！</h2>
          <p className="body-lg" style={{ marginTop: 12 }}>
            订单号 <span className="mono">{placedOrder?.orderId?.slice(-8).toUpperCase()}</span>（待支付）<br />
            可在「会员 → 我的订单」查看；毛孩子在家门口等着了~
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
            <button onClick={() => navigate({ page: 'member', tab: 'orders' })} className="btn btn-primary btn-lg">查看订单</button>
            <button onClick={() => navigate({ page: 'home' })} className="btn btn-line btn-lg">继续逛</button>
          </div>
        </div>
      </section>
    );
  }

  const canSubmit = !placing && (selectedId || (addingNew && addrForm.name && addrForm.phone && addrForm.province && addrForm.city && addrForm.district && addrForm.detail));

  async function confirmOrder() {
    setPlacing(true);
    try {
      let addressId = selectedId;
      if (addingNew) {
        const saved = await saveNewAddress();
        if (!saved) return;
        addressId = saved; // saveNewAddress 返回新地址 id
      }
      const r = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((it) => ({ id: it.id, qty: it.qty })),
          addressId, delivery, shipping,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setAddrError(d.error || `下单失败（${r.status}）`); return; }
      setPlacedOrder(d);
      clearCart();
      setStep('done');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <section style={{ paddingTop: 48, paddingBottom: 96 }}>
      <div className="container">
        <div className="eyebrow eyebrow-rule" style={{ marginBottom: 16 }}>结算</div>
        <h1 className="h-1" style={{ margin: 0 }}>填一下地址，狗子等不及了。</h1>
        <div className="m-1col m-gap" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 48, marginTop: 48 }}>
          <div>
            <div className="card" style={{ padding: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="h-3" style={{ margin: 0 }}>1 · 收货信息</h3>
                {addresses?.length > 0 && !addingNew && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setAddingNew(true)}>+ 使用新地址</button>
                )}
              </div>

              {addresses === null && <p className="caption">加载地址中…</p>}

              {addresses?.length > 0 && !addingNew && (
                <div style={{ display: 'grid', gap: 10 }}>
                  {addresses.map((a) => (
                    <label key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px', borderRadius: 14, cursor: 'pointer', background: selectedId === a.id ? 'var(--surface-2)' : 'transparent', border: selectedId === a.id ? '2px solid var(--ink)' : '1px solid var(--line-2)', transition: 'all .15s' }}>
                      <input type="radio" name="addr" checked={selectedId === a.id} onChange={() => setSelectedId(a.id)} style={{ marginTop: 4 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</span>
                          <span className="caption mono">{a.phone}</span>
                          {a.isDefault && <span className="badge">默认</span>}
                        </div>
                        <div className="caption" style={{ marginTop: 4 }}>{a.province}{a.city}{a.district} {a.detail}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {addingNew && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input className="input" placeholder="收货人姓名" value={addrForm.name} onChange={(e) => setAddrForm({ ...addrForm, name: e.target.value })} />
                    <input className="input" placeholder="手机号" inputMode="numeric" maxLength={11} value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value.replace(/\D/g, '') })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                    <input className="input" placeholder="省份" value={addrForm.province} onChange={(e) => setAddrForm({ ...addrForm, province: e.target.value })} />
                    <input className="input" placeholder="城市" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} />
                    <input className="input" placeholder="区/县" value={addrForm.district} onChange={(e) => setAddrForm({ ...addrForm, district: e.target.value })} />
                  </div>
                  <input className="input" placeholder="详细地址（街道门牌号）" style={{ marginTop: 12 }} value={addrForm.detail} onChange={(e) => setAddrForm({ ...addrForm, detail: e.target.value })} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={addrForm.isDefault} onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })} />
                    设为默认地址
                  </label>
                  {addrError && <div style={{ color: '#D9826B', fontSize: 13, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Emoji text="⚠️" size={14} /> {addrError}</div>}
                  {addresses?.length > 0 && (
                    <button className="btn btn-line btn-sm" style={{ marginTop: 12 }} onClick={() => { setAddingNew(false); setAddrError(''); }}>取消，选择已保存的地址</button>
                  )}
                </div>
              )}
            </div>
            <div className="card" style={{ padding: 32, marginTop: 16 }}>
              <h3 className="h-3" style={{ margin: '0 0 20px' }}>2 · 配送方式</h3>
              {[{ id: 'standard', t: '标准配送', sub: '2-3 天到达', price: subtotal >= 99 ? 0 : 12, icon: '🚚' }, { id: 'express', t: '次日达', sub: '今天下单，明天到', price: 18, icon: '⚡' }].map((o) => (
                <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', marginBottom: 8, borderRadius: 14, cursor: 'pointer', background: delivery === o.id ? 'var(--surface-2)' : 'transparent', border: delivery === o.id ? '2px solid var(--ink)' : '1px solid var(--line-2)', transition: 'all .15s' }}>
                  <input type="radio" name="d" checked={delivery === o.id} onChange={() => setDelivery(o.id)} style={{ display: 'none' }} />
                  <Emoji text={o.icon} size={28} />
                  <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{o.t}</div><div className="caption">{o.sub}</div></div>
                  <div className="mono" style={{ fontWeight: 600 }}>{o.price === 0 ? '免费' : fmt(o.price)}</div>
                </label>
              ))}
            </div>
            <div className="card" style={{ padding: 32, marginTop: 16 }}>
              <h3 className="h-3" style={{ margin: '0 0 20px' }}>3 · 支付方式</h3>
              {[{ id: 'wechat', t: '微信支付', icon: '💚' }, { id: 'alipay', t: '支付宝', icon: '💙' }, { id: 'card', t: '银行卡', icon: '💳' }].map((o) => (
                <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', marginBottom: 8, borderRadius: 14, cursor: 'pointer', background: pay === o.id ? 'var(--surface-2)' : 'transparent', border: pay === o.id ? '2px solid var(--ink)' : '1px solid var(--line-2)', transition: 'all .15s' }}>
                  <input type="radio" name="p" checked={pay === o.id} onChange={() => setPay(o.id)} style={{ display: 'none' }} />
                  <Emoji text={o.icon} size={24} />
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{o.t}</div>
                  <div style={{ width: 18, height: 18, borderRadius: 999, border: '2px solid var(--ink)', display: 'grid', placeItems: 'center' }}>{pay === o.id && <div style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--ink)' }} />}</div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="card" style={{ padding: 28, position: 'sticky', top: 96 }}>
              <h3 className="h-3" style={{ margin: '0 0 20px' }}>订单摘要</h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, marginBottom: 16 }}>
                {items.map((it) => (
                  <li key={it.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line-2)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: it.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Emoji text={it.emoji} size={24} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.name}</div>
                      <div className="caption mono" style={{ marginTop: 4 }}>×{it.qty}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{fmt(it.price * it.qty)}</div>
                  </li>
                ))}
              </ul>
              <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 16 }}>
                {[['商品小计', fmt(subtotal)], ['运费', shipping === 0 ? '免费' : fmt(shipping)]].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}><span>{k}</span><span className="mono">{v}</span></div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 12, marginTop: 4, borderTop: '1px solid var(--line-2)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>合计</span>
                  <span className="mono" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em' }}>{fmt(total)}</span>
                </div>
              </div>
              <button onClick={confirmOrder} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }} disabled={!canSubmit}>
                {placing ? '下单中…' : `确认下单 · ${fmt(total)}`}
              </button>
              <p className="caption" style={{ textAlign: 'center', marginTop: 12, marginBottom: 0 }}>提交订单即表示同意《购物条款》</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function MemberPage({ navigate, initialTab }) {
  const TABS = ['overview', 'orders', 'pets', 'health', 'addr', 'benefits'];
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : 'overview');
  const [pets, setPets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [me, setMe] = useState(null); // null=加载中；{guest:true} 或 {phoneMasked,...}
  const [loginOpen, setLoginOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const loadPets = useCallback(async () => {
    try { const r = await fetch('/api/pets'); if (r.ok) setPets(await r.json()); } catch {}
  }, []);
  const loadOrders = useCallback(async () => {
    try { const r = await fetch('/api/orders'); if (r.ok) setOrders(await r.json()); } catch {}
  }, []);
  const loadMe = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me');
      setMe(r.ok ? await r.json() : { guest: true });
    } catch { setMe({ guest: true }); }
  }, []);
  useEffect(() => { loadPets(); loadOrders(); loadMe(); }, [loadPets, loadOrders, loadMe]);

  async function logout() {
    if (!window.confirm('退出后将回到游客身份（数据保留在账号里，重新登录即可找回）')) return;
    await fetch('/api/auth/logout', { method: 'POST' });
    setMe({ guest: true });
    loadPets(); loadOrders(); // 身份已切换，刷新数据
  }

  const orderStatusText = (s) => ({ pending_payment: '待支付', paid: '已支付', shipped: '已发货', done: '已完成' }[s] || s);
  const fmtDate = (iso) => new Date(iso).toLocaleDateString('zh-CN');

  return (
    <>
      <section style={{ paddingTop: 56, paddingBottom: 32 }}>
        <div className="container">
          <div className="m-1col m-pad" style={{ background: 'var(--ink)', color: '#F5F9F2', borderRadius: 22, padding: '40px 48px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 28, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            <div className="float-deco" style={{ position: 'absolute', right: -20, bottom: -60, opacity: .08, '--fd': '11s', '--rd': '2deg' }}><Emoji text="🐾" size={260} /></div>
            <div style={{ borderRadius: 999, border: '3px solid rgba(247,242,229,.6)', background: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Avatar url={me?.avatarUrl} emoji={me?.avatarEmoji || '🐱'} size={88} style={{ background: 'transparent' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>
                  {me && !me.guest ? (me.nickname || me.phoneMasked || me.emailMasked) : '铲屎官（游客）'}
                </h2>
                {/* 会员徽章与登录/退出按钮统一高度+字号，读起来是同一排"胶囊"而非大小不一 */}
                <span className="member-pill" style={{ background: 'var(--accent)', color: '#2a1a0a' }}><Emoji text="⭐" size={12} /> Pawly Club 会员</span>
                <button className="member-pill" style={{ background: 'rgba(244,248,242,.16)', color: '#F5F9F2', border: 0, cursor: 'pointer' }} onClick={() => setEditOpen(true)}>编辑资料</button>
                {me && (me.guest
                  ? <button className="member-pill" style={{ background: 'rgba(244,248,242,.92)', color: 'var(--ink)', border: 0, cursor: 'pointer' }} onClick={() => setLoginOpen(true)}>登录 / 注册</button>
                  : <>
                      <button className="member-pill" style={{ background: 'rgba(244,248,242,.16)', color: '#F5F9F2', border: 0, cursor: 'pointer' }} onClick={() => setPwOpen(true)}>修改密码</button>
                      <button className="member-pill" style={{ background: 'rgba(244,248,242,.16)', color: '#F5F9F2', border: 0, cursor: 'pointer' }} onClick={logout}>退出登录</button>
                    </>
                )}
              </div>
              <p style={{ margin: '8px 0 0', color: 'rgba(244,248,242,.7)', fontSize: 14 }}>
                {me && !me.guest && me.pawlyId && `宝狸号 ${me.pawlyId} · `}
                {me && !me.guest && `账号 ${me.phoneMasked || me.emailMasked} · `}
                {pets.length > 0 ? `已添加 ${pets.length} 个毛孩子档案 · ${pets.map((p) => p.name).join('、')}` : '还没有宠物档案，去"宠物档案"添加吧'}
                {me?.guest && ' · 登录后数据可跨设备同步'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 48, position: 'relative' }}>
              {[
                { n: String(pets.length), l: '毛孩子' },
                { n: String(orders.length), l: '订单' },
                { n: me && !me.guest ? 'Club' : '游客', l: '会员身份' },
              ].map((s) => (
                <div key={s.l} style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em' }}>{s.n}</div>
                  <div style={{ fontSize: 11, color: 'rgba(244,248,242,.55)', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div style={{ borderBottom: '1px solid var(--line-2)' }}>
        <div className="container">
          <div className="m-tabs" style={{ display: 'flex', gap: 4 }}>
            {[{ id: 'overview', l: '概览' }, { id: 'orders', l: '我的订单' }, { id: 'pets', l: '宠物档案' }, { id: 'health', l: '健康提醒' }, { id: 'addr', l: '地址管理' }, { id: 'benefits', l: '会员权益' }].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ height: 52, padding: '0 16px', border: 0, background: 'transparent', color: 'var(--ink)', fontSize: 14, fontWeight: 500, borderBottom: tab === t.id ? '2px solid var(--ink)' : '2px solid transparent', marginBottom: -1 }}>{t.l}</button>
            ))}
          </div>
        </div>
      </div>

      <section style={{ paddingTop: 48, paddingBottom: 96 }}>
        <div className="container">
          {tab === 'overview' && (
            <>
            <div className="m-1col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div className="card" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="h-3" style={{ margin: 0 }}>我的毛孩子</h3>
                  <button onClick={() => setTab('pets')} className="btn btn-ghost btn-sm">查看全部 →</button>
                </div>
                {pets.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0' }}>
                    <Emoji text="🐶" size={52} />
                    <div>
                      <p className="caption" style={{ margin: '0 0 10px' }}>还没有档案，建好档案后宝狸能给出更贴合的建议。</p>
                      <button className="btn btn-sm" onClick={() => setTab('pets')} style={{ background: 'var(--green)', color: '#FFF9F2', borderRadius: 999 }}>去建立档案</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 16 }}>
                    {pets.map((p) => (
                      <div key={p.name} style={{ flex: 1, padding: 20, borderRadius: 16, background: petBg(p.species), textAlign: 'center' }}>
                        <div style={{ display: 'grid', placeItems: 'center' }}><Emoji text={petEmoji(p.species)} size={64} /></div>
                        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>{p.name}</div>
                        <div className="caption">{p.breed || p.species} · {p.ageText}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="h-3" style={{ margin: 0 }}>最近订单</h3>
                  <button onClick={() => setTab('orders')} className="btn btn-ghost btn-sm">全部订单 →</button>
                </div>
                {orders.length === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0' }}>
                    <Emoji text="📦" size={52} />
                    <div>
                      <p className="caption" style={{ margin: '0 0 10px' }}>还没有订单，毛孩子的好东西都在商品页等着~</p>
                      <button className="btn btn-sm" onClick={() => navigate({ page: 'shop' })} style={{ background: 'var(--green)', color: '#FFF9F2', borderRadius: 999 }}>去逛逛</button>
                    </div>
                  </div>
                )}
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {orders.slice(0, 3).map((o) => (
                    <li key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--line-2)' }}>
                      <div style={{ display: 'flex' }}>
                        {o.items.slice(0, 3).map((it, i) => (
                          <div key={i} style={{ width: 36, height: 36, borderRadius: 8, background: it.bg || 'var(--surface-2)', display: 'grid', placeItems: 'center', marginLeft: i > 0 ? -8 : 0, border: '1px solid var(--surface)' }}><Emoji text={it.emoji} size={18} /></div>
                        ))}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.items.map((it) => it.name).join('、')}</div>
                        <div className="caption">{fmtDate(o.createdAt)} · {o.items.reduce((s, it) => s + it.qty, 0)} 件商品 · {orderStatusText(o.status)}</div>
                      </div>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{fmt(o.total)}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card" style={{ padding: 28, gridColumn: 'span 2' }}>
                <h3 className="h-3" style={{ margin: '0 0 20px' }}>猜你会回购</h3>
                <div className="m-1col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {PRODUCTS.slice(0, 4).map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, background: 'var(--surface-2)' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 10, background: p.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Emoji text={p.emoji} size={22} /></div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                        <div className="caption mono" style={{ marginTop: 2 }}>{fmt(p.price)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <CheckinBar />
            </>
          )}

          {tab === 'orders' && (
            <div>
              <h3 className="h-3" style={{ margin: '0 0 20px' }}>全部订单</h3>
              {orders.length === 0 && (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ display: 'grid', placeItems: 'center' }}><Emoji text="📦" size={56} /></div>
                  <p className="body" style={{ marginTop: 12 }}>还没有订单。去商品页挑点好东西，或让宝狸助手帮你推荐~</p>
                </div>
              )}
              <div style={{ display: 'grid', gap: 12 }}>
                {orders.map((o) => (
                  <div key={o.id} className="card" style={{ padding: 24, display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 24, alignItems: 'center' }}>
                    <div style={{ display: 'flex' }}>
                      {o.items.slice(0, 4).map((it, i) => (
                        <div key={i} style={{ width: 56, height: 56, borderRadius: 12, background: it.bg || 'var(--surface-2)', display: 'grid', placeItems: 'center', marginLeft: i > 0 ? -16 : 0, border: '2px solid var(--surface)' }}><Emoji text={it.emoji} size={28} /></div>
                      ))}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.items.map((it) => `${it.name} ×${it.qty}`).join('、')}</div>
                      <div className="caption" style={{ marginTop: 4 }}>
                        {fmtDate(o.createdAt)} 下单 · {o.items.reduce((s, it) => s + it.qty, 0)} 件商品
                        {o.address && ` · 寄往 ${o.address.province}${o.address.city} ${o.address.name}`}
                      </div>
                    </div>
                    <span className="badge">{orderStatusText(o.status)}</span>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{fmt(o.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'pets' && <PetsTab pets={pets} onChanged={loadPets} />}

          {tab === 'health' && <HealthTab />}

          {editOpen && <ProfileEditDialog me={me} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); loadMe(); }} />}
          {pwOpen && <PasswordDialog onClose={() => setPwOpen(false)} />}

          {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} onLoggedIn={() => { setLoginOpen(false); loadMe(); loadPets(); }} />}

          {tab === 'addr' && <AddressTab />}

          {tab === 'benefits' && <BenefitsTab me={me} onLogin={() => setLoginOpen(true)} />}
        </div>
      </section>
    </>
  );
}

// 会员权益：Pawly Club 免费会员（手机号登录即享）。付费会员等真实支付接入后再分层。
function BenefitsTab({ me, onLogin }) {
  const isMember = me && !me.guest;
  const benefits = [
    { emoji: '🐾', title: 'AI 助手高用量', desc: '宝狸助手每日可用量大幅提升，挑粮、问养护、做方案随便聊', hot: true },
    { emoji: '🏠', title: '数据跨设备同步', desc: '宠物档案、订单、收货地址、社区帖子绑定手机号，换设备登录即恢复' },
    { emoji: '🎁', title: '会员礼盒', desc: '入会礼包与节日惊喜（供应链接入后发放）', soon: true },
    { emoji: '💳', title: '全场 9 折', desc: '会员专享价（真实支付接入后生效）', soon: true },
    { emoji: '🏥', title: '年度免费体检', desc: '合作宠物医院每年一次基础体检（城市开通中）', soon: true },
    { emoji: '🎂', title: '生日福利', desc: '毛孩子生日当月双倍积分 + 生日礼（按宠物档案的生日自动触达）', soon: true },
  ];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 className="h-3" style={{ margin: 0 }}>Pawly Club 会员权益</h3>
          <p className="caption" style={{ margin: '6px 0 0' }}>
            {isMember ? `已是会员（${me.phoneMasked || me.emailMasked}），以下权益已生效` : '注册账号即免费成为会员，立即解锁以下权益'}
          </p>
        </div>
        {!isMember && <button className="btn btn-primary" onClick={onLogin}>登录解锁会员</button>}
      </div>



      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {benefits.map((b) => (
          <div key={b.title} className="card" style={{ padding: 24, position: 'relative' }}>
            {b.hot && <span className="tag-pill" style={{ top: 16, right: 16 }}>已生效</span>}
            {b.soon && <span className="badge" style={{ position: 'absolute', top: 16, right: 16 }}>敬请期待</span>}
            <Emoji text={b.emoji} size={36} />
            <div style={{ fontSize: 16, fontWeight: 600, margin: '12px 0 6px' }}>{b.title}</div>
            <p className="caption" style={{ margin: 0, lineHeight: 1.6 }}>{b.desc}</p>
          </div>
        ))}
      </div>
      <p className="caption" style={{ marginTop: 20 }}>* 当前为免费会员计划；标注"敬请期待"的权益将随供应链与支付能力上线逐步开放。</p>
    </div>
  );
}

const EMPTY_ADDRESS_FORM = { name: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: false };

function AddressTab() {
  const [addresses, setAddresses] = useState(null); // null=加载中
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // 正在编辑的地址 id；null 表示新增
  const [form, setForm] = useState(EMPTY_ADDRESS_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { const r = await fetch('/api/addresses'); setAddresses(r.ok ? await r.json() : []); } catch { setAddresses([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function startAdd() { setEditing(null); setForm(EMPTY_ADDRESS_FORM); setError(''); setOpen(true); }
  function startEdit(a) {
    setEditing(a.id);
    setForm({ name: a.name, phone: a.phone, province: a.province, city: a.city, district: a.district, detail: a.detail, isDefault: a.isDefault });
    setError('');
    setOpen(true);
  }
  function cancel() { setOpen(false); setEditing(null); setForm(EMPTY_ADDRESS_FORM); setError(''); }

  async function submit() {
    const f = form;
    if (!f.name.trim() || !f.phone.trim() || !f.province.trim() || !f.city.trim() || !f.district.trim() || !f.detail.trim()) {
      setError('请填写完整的收货信息'); return;
    }
    if (!/^1\d{10}$/.test(f.phone.trim())) { setError('手机号格式不正确'); return; }
    setSaving(true); setError('');
    try {
      const r = await fetch('/api/addresses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, id: editing || undefined }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `保存失败（${r.status}）`); }
      cancel();
      load();
    } catch (e) {
      setError(e.message || '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  async function remove(a) {
    if (!window.confirm(`确定删除「${a.name}」的这条地址吗？`)) return;
    await fetch(`/api/addresses?id=${encodeURIComponent(a.id)}`, { method: 'DELETE' });
    if (editing === a.id) cancel();
    load();
  }

  async function setDefault(a) {
    await fetch('/api/addresses/default', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id }),
    });
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 className="h-3" style={{ margin: 0 }}>地址管理</h3>
        <button className="btn btn-primary btn-sm" onClick={() => (open ? cancel() : startAdd())}>{open ? '收起' : '+ 新地址'}</button>
      </div>

      {open && (
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{editing ? '编辑地址' : '添加新地址'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input className="input" placeholder="收货人姓名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="手机号" inputMode="numeric" maxLength={11} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <input className="input" placeholder="省份" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
            <input className="input" placeholder="城市" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input className="input" placeholder="区/县" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
          </div>
          <input className="input" placeholder="详细地址（街道门牌号）" style={{ marginTop: 12 }} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            设为默认地址
          </label>
          {error && <div style={{ color: '#D9826B', fontSize: 13, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Emoji text="⚠️" size={14} /> {error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={submit} disabled={saving}>{saving ? '保存中…' : editing ? '保存修改' : '保存地址'}</button>
            <button className="btn btn-line" onClick={cancel}>取消</button>
          </div>
        </div>
      )}

      {addresses === null && <p className="caption">加载中…</p>}

      {addresses?.length === 0 && !open && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ display: 'grid', placeItems: 'center' }}><Emoji text="🏠" size={56} /></div>
          <p className="body" style={{ marginTop: 12 }}>还没有收货地址，点"新地址"添加一个吧。</p>
        </div>
      )}

      {addresses?.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          {addresses.map((a) => (
            <div key={a.id} className="card m-wrap" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</span>
                  <span className="caption mono">{a.phone}</span>
                  {a.isDefault && <span className="badge">默认</span>}
                </div>
                <div className="caption" style={{ marginTop: 4 }}>{a.province}{a.city}{a.district} {a.detail}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {!a.isDefault && <button className="btn btn-ghost btn-sm" onClick={() => setDefault(a)}>设为默认</button>}
                <button className="btn btn-line btn-sm" onClick={() => startEdit(a)}>编辑</button>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(a)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 手机号登录弹层。短信服务开通前为免验证码直登（仅手机号）；
// 后端配置 SMS_* 后会要求验证码，届时恢复验证码输入框（git 历史里有现成实现）。
function ageToForm(ageMonths) {
  if (ageMonths == null) return { ageValue: '', ageUnit: '岁' };
  if (ageMonths >= 12 && ageMonths % 12 === 0) return { ageValue: String(ageMonths / 12), ageUnit: '岁' };
  if (ageMonths < 12) return { ageValue: String(ageMonths), ageUnit: '月' };
  return { ageValue: String(ageMonths), ageUnit: '月' };
}

function PetsTab({ pets, onChanged }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // 正在编辑的宠物名；null 表示新增
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startAdd() { setEditing(null); setForm(EMPTY_FORM); setError(''); setOpen(true); }
  function startEdit(p) {
    setEditing(p.name);
    setForm({
      name: p.name, species: p.species, breed: p.breed || '', sex: p.sex || '',
      ...ageToForm(p.ageMonths),
      weightKg: p.weightKg != null ? String(p.weightKg) : '', notes: p.notes || '',
    });
    setError('');
    setOpen(true);
  }
  function cancel() { setOpen(false); setEditing(null); setForm(EMPTY_FORM); setError(''); }

  async function submit() {
    if (!form.name.trim()) { setError('请填写名字'); return; }
    setSaving(true); setError('');
    const ageMonths = form.ageValue !== '' ? (form.ageUnit === '岁' ? Math.round(Number(form.ageValue) * 12) : Number(form.ageValue)) : undefined;
    try {
      const r = await fetch('/api/pets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(), species: form.species,
          breed: form.breed || undefined, sex: form.sex || undefined,
          ageMonths: Number.isFinite(ageMonths) ? ageMonths : undefined,
          weightKg: form.weightKg !== '' ? Number(form.weightKg) : undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `保存失败（${r.status}）`); }
      cancel();
      onChanged();
    } catch (e) {
      setError(e.message || '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  async function remove(name) {
    if (!window.confirm(`确定删除「${name}」的档案吗？`)) return;
    await fetch(`/api/pets?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (editing === name) cancel();
    onChanged();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 className="h-3" style={{ margin: 0 }}>我的毛孩子</h3>
        <button className="btn btn-primary btn-sm" onClick={() => (open ? cancel() : startAdd())}>{open ? '收起' : '+ 添加宠物'}</button>
      </div>

      {open && (
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{editing ? `编辑「${editing}」的档案` : '添加新宠物'}</div>
          <div className="m-1col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <input className="input" placeholder="名字 *" value={form.name} disabled={!!editing}
              title={editing ? '名字不可修改（如需改名请删除后重建）' : ''}
              style={{ opacity: editing ? 0.6 : 1 }}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="input" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })}>{PET_SPECIES.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
            <input className="input" placeholder="品种（如 金渐层）" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />

            {/* 年龄：数字 + 岁/月 单位 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" type="number" min="0" placeholder="年龄" value={form.ageValue} onChange={(e) => setForm({ ...form, ageValue: e.target.value })} style={{ flex: 1 }} />
              <select className="input" value={form.ageUnit} onChange={(e) => setForm({ ...form, ageUnit: e.target.value })} style={{ width: 76 }}><option value="岁">岁</option><option value="月">月</option></select>
            </div>
            <input className="input" type="number" min="0" step="0.1" placeholder="体重 kg（如 4.2）" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
            <select className="input" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}><option value="">性别（可选）</option><option value="男">男</option><option value="女">女</option></select>

            <input className="input" placeholder="特点（如 肠胃敏感、爱啃咬）" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ gridColumn: '1 / -1' }} />
          </div>
          {error && <div style={{ color: '#D9826B', fontSize: 13, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Emoji text="⚠️" size={14} /> {error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={submit} disabled={saving || !form.name.trim()}>{saving ? '保存中…' : editing ? '保存修改' : '保存档案'}</button>
            <button className="btn btn-line" onClick={cancel}>取消</button>
          </div>
        </div>
      )}

      {pets.length === 0 && !open && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ display: 'grid', placeItems: 'center' }}><Emoji text="🐾" size={72} /></div>
          <p className="body" style={{ marginTop: 12 }}>还没有宠物档案。点"添加宠物"，或直接告诉右下角的宝狸助手——它会自动帮你建档。</p>
        </div>
      )}

      <div className="m-1col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {pets.map((p) => (
          <div key={p.name} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ background: petBg(p.species), padding: '32px 0', display: 'grid', placeItems: 'center' }}><Emoji text={petEmoji(p.species)} size={104} /></div>
            <div style={{ padding: 24 }}>
              <h4 className="serif" style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>{p.name}</h4>
              <p className="caption" style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                {p.breed || p.species}
                {p.weightStale && <>· <Emoji text="⚠️" size={12} /> 体重待更新</>}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20 }}>
                {[['年龄', p.ageText], ['性别', p.sex || '—'], ['体重', p.weightKg ? p.weightKg + 'kg' : '—']].map(([k, v]) => (
                  <div key={k}><div className="caption">{k}</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{v}</div></div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button className="btn btn-line btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => startEdit(p)}>编辑档案</button>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(p.name)}>删除</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// —— 每日签到条：积分 + 连续天数 + 一键签到 ——
function CheckinBar() {
  const [st, setSt] = useState(null); // {done, streak, points}
  const [busy, setBusy] = useState(false);
  const [justDone, setJustDone] = useState(false);

  const load = useCallback(async () => {
    try { const r = await fetch('/api/checkin'); if (r.ok) setSt(await r.json()); } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  async function doCheckin() {
    if (busy || st?.done) return;
    setBusy(true);
    try {
      const r = await fetch('/api/checkin', { method: 'POST' });
      if (r.ok) {
        const d = await r.json();
        setSt({ done: true, streak: d.streak, points: d.points });
        if (d.ok) setJustDone(true);
      }
    } catch {} finally { setBusy(false); }
  }

  // 低调的签到条：放在概览底部，不抢核心功能的注意力
  return (
    <div className="m-col" style={{ marginTop: 24, padding: '12px 20px', borderRadius: 14, background: 'rgba(79,122,87,.07)', border: '1px dashed rgba(79,122,87,.35)', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <Emoji text="🎯" size={18} />
        <span className="caption" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          每日签到 · 当前 {st ? st.points : '…'} 积分{st && st.streak > 1 ? ` · 已连续 ${st.streak} 天` : ''} · 积分未来可换优惠券
        </span>
      </div>
      <button className="btn btn-sm" disabled={busy || !st || st.done} onClick={doCheckin}
        style={{ borderRadius: 999, minWidth: 88, justifyContent: 'center', border: st?.done ? '1px solid var(--line-2)' : '1px solid var(--accent)', background: 'transparent', color: st?.done ? 'var(--ink-3)' : 'var(--accent)', fontWeight: 600 }}>
        {st?.done ? (justDone ? '签到成功 ✓' : '今日已签') : '签到 +5'}
      </button>
    </div>
  );
}

// —— 健康提醒：按宠物档案生日推算疫苗/驱虫/体检节奏，可勾选完成 ——
function HealthTab() {
  const [items, setItems] = useState(null);

  const load = useCallback(async () => {
    try { const r = await fetch('/api/reminders'); setItems(r.ok ? await r.json() : []); } catch { setItems([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle(it) {
    setItems((prev) => prev.map((x) => (x.key === it.key ? { ...x, done: !x.done } : x)));
    try {
      await fetch('/api/reminders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: it.key }),
      });
    } catch { load(); }
  }

  const typeEmoji = { vaccine: '💉', checkup: '🩺', 'deworm-in': '💊', 'deworm-out': '🧴' };
  const fmtDue = (iso) => {
    const d = new Date(iso);
    const days = Math.ceil((d - new Date()) / 86400000);
    const dateStr = d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    if (days < 0) return `${dateStr} · 已过期`;
    if (days === 0) return `今天`;
    return `${dateStr} · 还有 ${days} 天`;
  };

  if (items === null) return <p className="caption">加载中…</p>;
  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ display: 'grid', placeItems: 'center' }}><Emoji text="🩺" size={56} /></div>
        <p className="body" style={{ marginTop: 12 }}>先去「宠物档案」添加毛孩子（最好填上生日），这里就会自动生成疫苗、驱虫、体检的提醒日历。</p>
      </div>
    );
  }

  const byPet = items.reduce((m, it) => { (m[it.petName] = m[it.petName] || []).push(it); return m; }, {});

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="h-3" style={{ margin: 0 }}>健康提醒</h3>
        <span className="caption">节奏参考 WSAVA / ESCCAP 指南 · 具体以兽医意见为准</span>
      </div>
      <div style={{ display: 'grid', gap: 20 }}>
        {Object.entries(byPet).map(([petName, list]) => (
          <div key={petName} className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Emoji text="🐾" size={16} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>{petName}</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {list.map((it) => (
                <button key={it.key} onClick={() => toggle(it)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
                  border: '1px solid var(--line-2)', background: it.done ? 'var(--surface-2)' : 'var(--surface)',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center',
                    border: it.done ? 0 : '1.5px solid var(--line)', background: it.done ? 'var(--sage)' : 'transparent', color: '#fff',
                  }}>
                    {it.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                  </span>
                  <Emoji text={typeEmoji[it.type] || '🩺'} size={18} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, textDecoration: it.done ? 'line-through' : 'none', color: it.done ? 'var(--ink-3)' : 'var(--ink)' }}>{it.label}</span>
                  <span className="caption" style={{ color: !it.done && new Date(it.due) < new Date() ? 'var(--accent)' : undefined }}>{fmtDue(it.due)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// —— 资料编辑：头像 emoji / 昵称 / 简介 ——
// 修改密码：需要原密码，新密码规则与注册一致
function PasswordDialog({ onClose }) {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const pwIssue = form.newPassword.length === 0 ? null
    : form.newPassword.length < 8 ? '至少 8 位'
    : !/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword) ? '需含字母和数字' : null;
  const canSubmit = form.oldPassword && !pwIssue && form.newPassword.length >= 8 && form.newPassword === form.confirm;

  async function save() {
    if (!canSubmit || busy) return;
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/auth/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || '修改失败');
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (e) { setError(e.message); setBusy(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,42,29,.4)', animation: 'fadeBg .2s ease' }} />
      <div role="dialog" aria-label="修改密码" style={{
        position: 'relative', width: 'min(420px, 100%)', background: 'var(--bg)', borderRadius: 20, padding: 28,
        boxShadow: '0 24px 64px -16px rgba(31,42,29,.35)', animation: 'dialogIn .25s ease both',
      }}>
        <h2 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: '0 0 18px' }}>修改密码</h2>
        {done ? (
          <p className="body" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Emoji text="✅" size={18} /> 密码已更新
          </p>
        ) : (
          <>
            <input className="input" type="password" placeholder="当前密码" autoComplete="current-password" autoFocus
              value={form.oldPassword} onChange={(e) => setForm({ ...form, oldPassword: e.target.value })} />
            <input className="input" type="password" placeholder="新密码（至少 8 位，含字母和数字）" autoComplete="new-password"
              style={{ marginTop: 10 }}
              value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
            {pwIssue && <div className="caption" style={{ color: 'var(--accent)', marginTop: 6 }}>{pwIssue}</div>}
            <input className="input" type="password" placeholder="确认新密码" autoComplete="new-password"
              style={{ marginTop: 10 }}
              value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
            {form.confirm && form.confirm !== form.newPassword && (
              <div className="caption" style={{ color: 'var(--accent)', marginTop: 6 }}>两次输入的新密码不一致</div>
            )}
            {error && <div style={{ color: 'var(--accent)', fontSize: 13, marginTop: 10 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={save} disabled={busy || !canSubmit}>
                {busy ? '保存中…' : '保存'}
              </button>
              <button className="btn btn-line" onClick={onClose}>取消</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProfileEditDialog({ me, onClose, onSaved }) {
  const AVATARS = ['👤', '🐶', '🐱', '🐾', '🦴', '🎾', '🧶', '😺', '🐕', '🍼', '🌿', '⭐'];
  const GENDERS = [{ id: 'female', label: '女生', emoji: '👧' }, { id: 'male', label: '男生', emoji: '👦' }, { id: 'other', label: '不展示', emoji: '🐾' }];
  const [form, setForm] = useState({
    nickname: me?.nickname || '',
    avatarEmoji: me?.avatarEmoji || '👤',
    bio: me?.bio || '',
    gender: me?.gender || '',
    birthday: me?.birthday ? String(me.birthday).slice(0, 10) : '',
    location: me?.location || '',
  });
  // 上传的头像照片：null=未改动，''=清除改回 emoji，dataURL=新照片
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const preview = avatarUrl === null ? me?.avatarUrl : (avatarUrl || null);

  async function pickAvatar(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { setError('请选择图片文件'); return; }
    setError('');
    try {
      const { compressImage } = await import('./PagesCommunity');
      // 头像裁成正方形小图，控制在几十 KB
      setAvatarUrl(await compressImage(file, { max: 320, quality: 0.82, square: true }));
    } catch { setError('图片处理失败，换一张试试'); }
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (avatarUrl !== null) payload.avatarUrl = avatarUrl;
      const r = await fetch('/api/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || '保存失败'); }
      onSaved();
    } catch (e) { setError(e.message); setSaving(false); }
  }

  const label = { fontSize: 12, color: 'var(--ink-3)', marginBottom: 6, marginTop: 14 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,42,29,.4)', animation: 'fadeBg .2s ease' }} />
      <div role="dialog" aria-label="编辑资料" style={{
        position: 'relative', width: 'min(460px, 100%)', maxHeight: 'calc(100vh - 64px)', overflowY: 'auto',
        background: 'var(--bg)', borderRadius: 20, padding: 28,
        boxShadow: '0 24px 64px -16px rgba(31,42,29,.35)', animation: 'dialogIn .25s ease both',
      }}>
        <h2 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: '0 0 18px' }}>编辑资料</h2>

        {/* 头像：上传照片优先，也可退回 emoji 头像 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar url={preview} emoji={form.avatarEmoji} size={72} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
            <button className="btn btn-line btn-sm" onClick={() => fileRef.current?.click()}>上传照片</button>
            {preview && <button className="btn btn-ghost btn-sm" onClick={() => setAvatarUrl('')} style={{ color: 'var(--ink-3)' }}>移除照片</button>}
            <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} style={{ display: 'none' }} />
          </div>
        </div>

        <div style={label}>或选一个表情头像</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {AVATARS.map((a) => (
            <button key={a} onClick={() => { setForm({ ...form, avatarEmoji: a }); setAvatarUrl(''); }} aria-label={`头像 ${a}`}
              style={{ width: 38, height: 38, borderRadius: 999, border: !preview && form.avatarEmoji === a ? '2px solid var(--ink)' : '1px solid var(--line-2)', background: 'var(--surface)', display: 'grid', placeItems: 'center', padding: 0 }}>
              <Emoji text={a} size={20} />
            </button>
          ))}
        </div>

        <div style={label}>昵称</div>
        <input className="input" placeholder="昵称（对外显示）" maxLength={20} value={form.nickname}
          onChange={(e) => setForm({ ...form, nickname: e.target.value })} />

        <div style={label}>简介</div>
        <textarea className="input" placeholder="一句话介绍自己（最多 60 字）" maxLength={60} rows={2} value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          style={{ resize: 'none', height: 'auto', lineHeight: 1.5, paddingTop: 10, borderRadius: 12 }} />

        <div style={label}>性别</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {GENDERS.map((g) => (
            <button key={g.id} onClick={() => setForm({ ...form, gender: form.gender === g.id ? '' : g.id })}
              style={{ height: 36, padding: '0 14px', borderRadius: 999, cursor: 'pointer',
                border: form.gender === g.id ? '1px solid var(--ink)' : '1px solid var(--line-2)',
                background: form.gender === g.id ? 'var(--ink)' : 'var(--surface)',
                color: form.gender === g.id ? 'var(--bg)' : 'var(--ink)', fontSize: 13,
                display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Emoji text={g.emoji} size={14} /> {g.label}
            </button>
          ))}
        </div>

        <div className="m-1col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={label}>生日（主页只显示月日与星座）</div>
            <input className="input" type="date" value={form.birthday} max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
          </div>
          <div>
            <div style={label}>常居地</div>
            <input className="input" placeholder="如 上海" maxLength={20} value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
        </div>

        {error && <div style={{ color: 'var(--accent)', fontSize: 13, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
          <button className="btn btn-line" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
