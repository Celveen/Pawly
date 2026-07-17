// 科普列表 + 文章详情 + 结算 + 会员中心（宠物档案接真实 /api/pets）
import { useState, useMemo, useEffect, useCallback } from 'react';
import { fmt } from './util';
import { ARTICLES, ARTICLE_CATS, PRODUCTS } from './data';
import { ArticleCard, ProductCard } from './ui';
import { Emoji } from './Emoji';

const petEmoji = (sp) => (sp === '狗' ? '🐶' : '🐱');
const petBg = (sp) => (sp === '狗' ? '#F4D7B0' : '#D3DEE2');

export function ArticlesPage({ navigate }) {
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => ARTICLES.filter((a) => (cat === 'all' || a.cat === cat) && (q === '' || a.title.includes(q) || a.excerpt.includes(q))),
    [cat, q],
  );
  const [hero, ...rest] = filtered;

  return (
    <>
      <section style={{ paddingTop: 64, paddingBottom: 32 }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 16 }}>Pawly Journal · 宠物科普</div>
          <h1 className="h-1" style={{ margin: 0, maxWidth: 760 }}>养它，从了解它开始。</h1>
          <p className="body-lg" style={{ marginTop: 20, maxWidth: 620 }}>和兽医、训犬师、铲屎官一起写的实用指南。没有专业术语，只有"今晚就能用"的小知识。</p>
          <div style={{ marginTop: 32, position: 'relative', maxWidth: 480 }}>
            <input className="input" placeholder="搜索：幼犬、疫苗、训练、剪指甲..." value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 44 }} />
            <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </div>
        </div>
      </section>
      <div style={{ borderTop: '1px solid var(--line-2)', borderBottom: '1px solid var(--line-2)' }}>
        <div className="container">
          <div className="h-scroll" style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
            {ARTICLE_CATS.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} style={{ height: 40, padding: '0 16px', borderRadius: 999, border: 0, background: cat === c.id ? 'var(--ink)' : 'transparent', color: cat === c.id ? 'var(--bg)' : 'var(--ink)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{c.name}</button>
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
          <div className="eyebrow" style={{ marginBottom: 16 }}>{ARTICLE_CATS.find((c) => c.id === a.cat)?.name} · {a.read}</div>
          <h1 className="h-1 m-h1" style={{ margin: 0, fontSize: 48, letterSpacing: '-0.025em' }}>{a.title}</h1>
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
          <div style={{ background: a.bg, borderRadius: 24, aspectRatio: '21/9', display: 'grid', placeItems: 'center' }}>
            <Emoji text={a.emoji} size={200} style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,.06))' }} />
          </div>
        </div>
        <div className="container" style={{ maxWidth: 720, marginTop: 56 }}>
          {a.body.map((p, i) => (
            <p key={i} style={{ fontSize: 18, lineHeight: 1.75, color: 'var(--ink)', margin: '0 0 24px' }}>
              {i === 0 && <span style={{ float: 'left', fontSize: 64, lineHeight: 1, paddingRight: 12, paddingTop: 6, fontWeight: 600, letterSpacing: '-0.04em' }}>{p[0]}</span>}
              {i === 0 ? p.slice(1) : p}
            </p>
          ))}
          {/* 参考来源：循证文章标注编译出处，点击可跳转权威机构原文 */}
          {a.refs?.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 20, padding: '24px 28px', marginTop: 40 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>参考来源 · References</div>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {a.refs.map((r, i) => (
                  <li key={i} style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.org}</span>
                    {' · '}
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>{r.title}</a>
                  </li>
                ))}
              </ol>
              <p className="caption" style={{ margin: '12px 0 0' }}>本文由 Pawly 编辑团队编译整理自上述公开指南，仅供参考。</p>
            </div>
          )}
          <div style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 20, padding: 32, marginTop: a.refs?.length ? 16 : 40, display: 'flex', gap: 20 }}>
            <Emoji text="💡" size={36} />
            <div>
              <div className="eyebrow" style={{ color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>Pawly 提示</div>
              <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0 }}>{a.refs?.length ? '内容编译自权威兽医指南，但每只宠物都是独特的。' : '这些建议来自我们的合作兽医团队，但每只宠物都是独特的。'}有任何异常情况，第一时间联系你的兽医才是最稳妥的。</p>
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
        <div className="eyebrow" style={{ marginBottom: 16 }}>结算</div>
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
  const TABS = ['overview', 'orders', 'pets', 'addr', 'benefits'];
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : 'overview');
  const [pets, setPets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [me, setMe] = useState(null); // null=加载中；{guest:true} 或 {phoneMasked,...}
  const [loginOpen, setLoginOpen] = useState(false);

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
          <div className="m-1col m-pad" style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 28, padding: '40px 48px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 28, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -20, bottom: -60, opacity: .08 }}><Emoji text="🐾" size={260} /></div>
            <div style={{ width: 88, height: 88, borderRadius: 999, background: 'var(--accent)', display: 'grid', placeItems: 'center' }}><Emoji text="👤" size={44} /></div>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
                  {me && !me.guest ? (me.nickname || me.phoneMasked) : '铲屎官（游客）'}
                </h2>
                {/* 会员徽章与登录/退出按钮统一高度+字号，读起来是同一排"胶囊"而非大小不一 */}
                <span className="member-pill" style={{ background: 'var(--accent)', color: '#2a1a0a' }}><Emoji text="⭐" size={12} /> Pawly Club 会员</span>
                {me && (me.guest
                  ? <button className="member-pill" style={{ background: 'rgba(255,255,255,.9)', color: 'var(--ink)', border: 0, cursor: 'pointer' }} onClick={() => setLoginOpen(true)}>手机号登录</button>
                  : <button className="member-pill" style={{ background: 'rgba(255,255,255,.14)', color: 'var(--bg)', border: 0, cursor: 'pointer' }} onClick={logout}>退出登录</button>
                )}
              </div>
              <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,.65)', fontSize: 14 }}>
                {me && !me.guest && `已绑定 ${me.phoneMasked} · `}
                {pets.length > 0 ? `已添加 ${pets.length} 个毛孩子档案 · ${pets.map((p) => p.name).join('、')}` : '还没有宠物档案，去"宠物档案"添加吧'}
                {me?.guest && ' · 登录后数据可跨设备同步'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 48, position: 'relative' }}>
              {[
                { n: String(pets.length), l: '毛孩子' },
                { n: String(orders.length), l: '订单' },
                { n: me ? `${me.chatUsed ?? 0}/${me.chatLimit ?? '-'}` : '…', l: '今日AI额度' },
              ].map((s) => (
                <div key={s.l} style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em' }}>{s.n}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div style={{ borderBottom: '1px solid var(--line-2)' }}>
        <div className="container">
          <div className="m-tabs" style={{ display: 'flex', gap: 4 }}>
            {[{ id: 'overview', l: '概览' }, { id: 'orders', l: '我的订单' }, { id: 'pets', l: '宠物档案' }, { id: 'addr', l: '地址管理' }, { id: 'benefits', l: '会员权益' }].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ height: 52, padding: '0 16px', border: 0, background: 'transparent', color: 'var(--ink)', fontSize: 14, fontWeight: 500, borderBottom: tab === t.id ? '2px solid var(--ink)' : '2px solid transparent', marginBottom: -1 }}>{t.l}</button>
            ))}
          </div>
        </div>
      </div>

      <section style={{ paddingTop: 48, paddingBottom: 96 }}>
        <div className="container">
          {tab === 'overview' && (
            <div className="m-1col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div className="card" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="h-3" style={{ margin: 0 }}>我的毛孩子</h3>
                  <button onClick={() => setTab('pets')} className="btn btn-ghost btn-sm">查看全部 →</button>
                </div>
                {pets.length === 0 ? (
                  <p className="caption">还没有档案，去"宠物档案"添加，或直接问右下角的宝莉助手。</p>
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
                {orders.length === 0 && <p className="caption" style={{ margin: 0 }}>还没有订单，去商品页逛逛吧~</p>}
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
          )}

          {tab === 'orders' && (
            <div>
              <h3 className="h-3" style={{ margin: '0 0 20px' }}>全部订单</h3>
              {orders.length === 0 && (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ display: 'grid', placeItems: 'center' }}><Emoji text="📦" size={56} /></div>
                  <p className="body" style={{ marginTop: 12 }}>还没有订单。去商品页挑点好东西，或让宝莉助手帮你推荐~</p>
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
    { emoji: '🐾', title: 'AI 助手额度提升', desc: `宝莉助手每日咨询次数：游客 ${me?.guestChatLimit || 5} 次 → 会员 ${me?.memberChatLimit || 30} 次，挑粮、问养护随便聊`, hot: true },
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
            {isMember ? `已是会员（${me.phoneMasked}），以下权益已生效` : '手机号登录即免费成为会员，立即解锁以下权益'}
          </p>
        </div>
        {!isMember && <button className="btn btn-primary" onClick={onLogin}>登录解锁会员</button>}
      </div>

      {/* 今日 AI 额度进度 */}
      {me && (
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>今日 AI 助手额度</span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{me.chatUsed ?? 0} / {me.chatLimit ?? '-'}</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, ((me.chatUsed ?? 0) / (me.chatLimit || 1)) * 100)}%`, background: 'var(--primary)', borderRadius: 999, transition: 'width .4s ease' }} />
          </div>
          {me.guest && <p className="caption" style={{ margin: '10px 0 0' }}>登录后每日额度提升至 {me.memberChatLimit || 30} 次</p>}
        </div>
      )}

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
function LoginDialog({ onClose, onLoggedIn }) {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const phoneOk = /^1\d{10}$/.test(phone);

  async function login() {
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || `登录失败（${r.status}）`);
      onLoggedIn();
    } catch (e) { setError(e.message || '登录失败'); setBusy(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(38,70,83,.35)', animation: 'fadeBg .2s ease' }} />
      <div role="dialog" aria-label="手机号登录" style={{
        position: 'relative', width: 'min(420px, 100%)',
        background: 'var(--bg)', borderRadius: 24, padding: 32, boxShadow: '0 24px 64px -16px rgba(38,70,83,.35)',
        animation: 'dialogIn .28s cubic-bezier(.22,.61,.36,1) both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="eyebrow">Sign In</div>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: '4px 0 0' }}>手机号登录</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ width: 36, padding: 0, justifyContent: 'center' }} aria-label="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6 18 18 M18 6 6 18" /></svg>
          </button>
        </div>

        <input className="input" placeholder="手机号" inputMode="numeric" maxLength={11} autoFocus
          value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter' && phoneOk && !busy) login(); }} />

        {error && <div style={{ color: '#D9826B', fontSize: 13, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Emoji text="⚠️" size={14} /> {error}</div>}

        <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
          onClick={login} disabled={busy || !phoneOk}>
          {busy ? '登录中…' : '登录 / 注册'}
        </button>
        <p className="caption" style={{ margin: '12px 0 0', textAlign: 'center' }}>
          未注册的手机号将自动创建账号<br />当前游客身份下的宠物档案与帖子会自动并入你的账号<br />
          短信验证码将在短信服务开通后启用
        </p>
      </div>
    </div>
  );
}

const EMPTY_FORM = { name: '', species: '狗', breed: '', sex: '', ageValue: '', ageUnit: '岁', weightKg: '', notes: '' };

// 从 ageMonths 反推"数字 + 单位"用于编辑回填
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
            <select className="input" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })}><option value="狗">狗</option><option value="猫">猫</option></select>
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
          <p className="body" style={{ marginTop: 12 }}>还没有宠物档案。点"添加宠物"，或直接告诉右下角的宝莉助手——它会自动帮你建档。</p>
        </div>
      )}

      <div className="m-1col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {pets.map((p) => (
          <div key={p.name} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ background: petBg(p.species), padding: '32px 0', display: 'grid', placeItems: 'center' }}><Emoji text={petEmoji(p.species)} size={104} /></div>
            <div style={{ padding: 24 }}>
              <h4 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{p.name}</h4>
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
