// 科普文章列表 + 详情 + 结算 + 会员

const { useState: useStateA, useMemo: useMemoA } = React;

// —— 文章列表 ——
function ArticlesPage({ navigate }) {
  const [cat, setCat] = useStateA('all');
  const [q, setQ] = useStateA('');

  const filtered = useMemoA(() => {
    return ARTICLES.filter(a =>
      (cat === 'all' || a.cat === cat) &&
      (q === '' || a.title.includes(q) || a.excerpt.includes(q))
    );
  }, [cat, q]);

  const [hero, ...rest] = filtered;

  return (
    <>
      <section style={{ paddingTop: 64, paddingBottom: 32 }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 16 }}>Pawly Journal · 宠物科普</div>
          <h1 className="h-1" style={{ margin: 0, maxWidth: 760 }}>
            养它，从了解它开始。
          </h1>
          <p className="body-lg" style={{ marginTop: 20, maxWidth: 620 }}>
            和兽医、训犬师、铲屎官一起写的实用指南。没有专业术语，
            只有"今晚就能用"的小知识。
          </p>

          <div style={{ marginTop: 32, position: 'relative', maxWidth: 480 }}>
            <input className="input" placeholder="搜索：幼犬、疫苗、训练、剪指甲..."
                   value={q} onChange={(e) => setQ(e.target.value)}
                   style={{ paddingLeft: 44 }} />
            <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}
                 width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
            </svg>
          </div>
        </div>
      </section>

      {/* 分类 tabs */}
      <div style={{ borderTop: '1px solid var(--line-2)', borderBottom: '1px solid var(--line-2)' }}>
        <div className="container">
          <div className="h-scroll" style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
            {ARTICLE_CATS.map(c => (
              <button key={c.id} onClick={() => setCat(c.id)}
                style={{
                  height: 40, padding: '0 16px', borderRadius: 999,
                  border: 0, background: cat === c.id ? 'var(--ink)' : 'transparent',
                  color: cat === c.id ? 'var(--bg)' : 'var(--ink)',
                  fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                }}>{c.name}</button>
            ))}
          </div>
        </div>
      </div>

      <section style={{ paddingTop: 48, paddingBottom: 96 }}>
        <div className="container">
          {hero && (
            <div style={{ marginBottom: 40 }}>
              <ArticleCard a={hero} featured
                onOpen={(a) => navigate({ page: 'article', id: a.id })} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {rest.map(a => (
              <ArticleCard key={a.id} a={a}
                onOpen={(a) => navigate({ page: 'article', id: a.id })} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: '96px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
              <p className="body">没找到匹配的文章，换个关键词试试？</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// —— 文章详情 ——
function ArticlePage({ id, navigate }) {
  const a = ARTICLES.find(x => x.id === id) || ARTICLES[0];
  const more = ARTICLES.filter(x => x.cat === a.cat && x.id !== a.id).slice(0, 3);
  const allMore = more.length > 0 ? more : ARTICLES.filter(x => x.id !== a.id).slice(0, 3);

  return (
    <>
      <section style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div className="container">
          <button onClick={() => navigate({ page: 'articles' })}
                  className="btn btn-ghost btn-sm" style={{ paddingLeft: 6 }}>
            ← 返回文章列表
          </button>
        </div>
      </section>

      <article>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            {ARTICLE_CATS.find(c => c.id === a.cat)?.name} · {a.read}
          </div>
          <h1 className="h-1" style={{ margin: 0, fontSize: 48, letterSpacing: '-0.025em' }}>{a.title}</h1>
          <p style={{ fontSize: 19, lineHeight: 1.65, color: 'var(--ink-2)', marginTop: 24 }}>
            {a.excerpt}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 32, paddingTop: 24,
                        borderTop: '1px solid var(--line-2)' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 999,
              background: 'var(--surface-2)', display: 'grid', placeItems: 'center', fontSize: 20,
            }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{a.author}</div>
              <div className="caption">{a.date} · {a.read}阅读</div>
            </div>
            <button className="btn btn-line btn-sm">收藏</button>
            <button className="btn btn-line btn-sm">分享</button>
          </div>
        </div>

        <div className="container" style={{ maxWidth: 880, marginTop: 48 }}>
          <div style={{
            background: a.bg, borderRadius: 24, aspectRatio: '21/9',
            display: 'grid', placeItems: 'center', fontSize: 200,
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,.06))',
          }}>{a.emoji}</div>
        </div>

        <div className="container" style={{ maxWidth: 720, marginTop: 56 }}>
          {a.body.map((p, i) => (
            <p key={i} style={{
              fontSize: 18, lineHeight: 1.75, color: 'var(--ink)',
              margin: '0 0 24px', textWrap: 'pretty',
            }}>
              {i === 0 && <span style={{
                float: 'left', fontSize: 64, lineHeight: 1, paddingRight: 12, paddingTop: 6,
                fontWeight: 600, letterSpacing: '-0.04em',
              }}>{p[0]}</span>}
              {i === 0 ? p.slice(1) : p}
            </p>
          ))}

          {/* 小贴士 */}
          <div style={{
            background: 'var(--ink)', color: 'var(--bg)',
            borderRadius: 20, padding: 32, marginTop: 40,
            display: 'flex', gap: 20,
          }}>
            <div style={{ fontSize: 36, lineHeight: 1 }}>💡</div>
            <div>
              <div className="eyebrow" style={{ color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>Pawly 提示</div>
              <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0 }}>
                这些建议来自我们的合作兽医团队，但每只宠物都是独特的。
                有任何异常情况，第一时间联系你的兽医才是最稳妥的。
              </p>
            </div>
          </div>
        </div>
      </article>

      <section style={{ paddingTop: 80, paddingBottom: 96 }}>
        <div className="container">
          <h2 className="h-2" style={{ margin: '0 0 32px' }}>继续阅读</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {allMore.map(x => (
              <ArticleCard key={x.id} a={x}
                onOpen={(a) => { navigate({ page: 'article', id: a.id }); window.scrollTo(0,0); }} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// —— 结算页 ——
function CheckoutPage({ items, navigate, clearCart }) {
  const [step, setStep] = useStateA(items.length === 0 ? 'empty' : 'form');
  const [delivery, setDelivery] = useStateA('standard');
  const [pay, setPay] = useStateA('wechat');

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = delivery === 'express' ? 18 : (subtotal >= 99 ? 0 : 12);
  const total = subtotal + shipping;

  if (step === 'empty') {
    return (
      <section style={{ paddingTop: 120, paddingBottom: 120 }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 96 }}>🦴</div>
          <h2 className="h-1" style={{ marginTop: 24 }}>购物车里空空的</h2>
          <p className="body-lg" style={{ marginTop: 12 }}>挑两件给毛孩子吧。</p>
          <button onClick={() => navigate({ page: 'shop' })} className="btn btn-primary btn-lg" style={{ marginTop: 24 }}>
            去逛逛
          </button>
        </div>
      </section>
    );
  }

  if (step === 'done') {
    return (
      <section style={{ paddingTop: 120, paddingBottom: 120 }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 520 }}>
          <div style={{ fontSize: 80 }}>🎉</div>
          <h2 className="h-1" style={{ marginTop: 24 }}>下单成功！</h2>
          <p className="body-lg" style={{ marginTop: 12 }}>
            订单号 PW2026{Math.floor(Math.random() * 10000).toString().padStart(4,'0')}<br/>
            毛孩子在家门口等着了，预计 48 小时送达。
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
            <button onClick={() => { clearCart(); navigate({ page: 'member' }); }} className="btn btn-primary btn-lg">
              查看订单
            </button>
            <button onClick={() => { clearCart(); navigate({ page: 'home' }); }} className="btn btn-line btn-lg">
              继续逛
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ paddingTop: 48, paddingBottom: 96 }}>
      <div className="container">
        <div className="eyebrow" style={{ marginBottom: 16 }}>结算</div>
        <h1 className="h-1" style={{ margin: 0 }}>填一下地址，狗子等不及了。</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 48, marginTop: 48 }}>
          <div>
            {/* 地址 */}
            <div className="card" style={{ padding: 32 }}>
              <h3 className="h-3" style={{ margin: '0 0 20px' }}>1 · 收货信息</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input className="input" placeholder="姓名" defaultValue="和同学" />
                <input className="input" placeholder="手机号" defaultValue="138 0000 0000" />
              </div>
              <input className="input" placeholder="详细地址" defaultValue="上海市徐汇区某某路 88 号"
                     style={{ marginTop: 12 }} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
                <input id="pet-greet" type="checkbox" defaultChecked />
                <label htmlFor="pet-greet" className="caption">收到货时让快递小哥摸摸狗（如果它愿意）</label>
              </div>
            </div>

            {/* 配送 */}
            <div className="card" style={{ padding: 32, marginTop: 16 }}>
              <h3 className="h-3" style={{ margin: '0 0 20px' }}>2 · 配送方式</h3>
              {[
                { id: 'standard', t: '标准配送', sub: '2-3 天到达', price: subtotal >= 99 ? 0 : 12, icon: '🚚' },
                { id: 'express',  t: '次日达',   sub: '今天下单，明天到', price: 18, icon: '⚡' },
              ].map(o => (
                <label key={o.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                  marginBottom: 8, borderRadius: 14, cursor: 'pointer',
                  background: delivery === o.id ? 'var(--surface-2)' : 'transparent',
                  border: delivery === o.id ? '2px solid var(--ink)' : '1px solid var(--line-2)',
                  transition: 'all .15s',
                }}>
                  <input type="radio" name="d" checked={delivery === o.id}
                         onChange={() => setDelivery(o.id)}
                         style={{ display: 'none' }} />
                  <div style={{ fontSize: 28 }}>{o.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{o.t}</div>
                    <div className="caption">{o.sub}</div>
                  </div>
                  <div className="mono" style={{ fontWeight: 600 }}>
                    {o.price === 0 ? '免费' : fmt(o.price)}
                  </div>
                </label>
              ))}
            </div>

            {/* 支付 */}
            <div className="card" style={{ padding: 32, marginTop: 16 }}>
              <h3 className="h-3" style={{ margin: '0 0 20px' }}>3 · 支付方式</h3>
              {[
                { id: 'wechat', t: '微信支付', icon: '💚' },
                { id: 'alipay', t: '支付宝', icon: '💙' },
                { id: 'card',   t: '银行卡', icon: '💳' },
              ].map(o => (
                <label key={o.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                  marginBottom: 8, borderRadius: 14, cursor: 'pointer',
                  background: pay === o.id ? 'var(--surface-2)' : 'transparent',
                  border: pay === o.id ? '2px solid var(--ink)' : '1px solid var(--line-2)',
                  transition: 'all .15s',
                }}>
                  <input type="radio" name="p" checked={pay === o.id}
                         onChange={() => setPay(o.id)}
                         style={{ display: 'none' }} />
                  <div style={{ fontSize: 24 }}>{o.icon}</div>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{o.t}</div>
                  <div style={{
                    width: 18, height: 18, borderRadius: 999,
                    border: '2px solid var(--ink)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    {pay === o.id && <div style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--ink)' }}/>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 订单摘要 */}
          <div>
            <div className="card" style={{ padding: 28, position: 'sticky', top: 96 }}>
              <h3 className="h-3" style={{ margin: '0 0 20px' }}>订单摘要</h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, marginBottom: 16 }}>
                {items.map(it => (
                  <li key={it.id} style={{ display: 'flex', gap: 12, padding: '10px 0',
                                           borderBottom: '1px solid var(--line-2)' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, background: it.bg,
                      display: 'grid', placeItems: 'center', fontSize: 24, flexShrink: 0,
                    }}>{it.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>{it.name}</div>
                      <div className="caption mono" style={{ marginTop: 4 }}>×{it.qty}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{fmt(it.price * it.qty)}</div>
                  </li>
                ))}
              </ul>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input className="input" placeholder="优惠码"
                       style={{ height: 38, fontSize: 13 }} />
                <button className="btn btn-line btn-sm">使用</button>
              </div>

              <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 16 }}>
                {[
                  ['商品小计', fmt(subtotal)],
                  ['运费', shipping === 0 ? '免费' : fmt(shipping)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13,
                                        color: 'var(--ink-2)', marginBottom: 8 }}>
                    <span>{k}</span><span className="mono">{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                              paddingTop: 12, marginTop: 4, borderTop: '1px solid var(--line-2)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>合计</span>
                  <span className="mono" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em' }}>{fmt(total)}</span>
                </div>
              </div>

              <button onClick={() => setStep('done')}
                      className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}>
                确认下单 · {fmt(total)}
              </button>
              <p className="caption" style={{ textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
                提交订单即表示同意《购物条款》
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// —— 会员中心 ——
function MemberPage({ navigate }) {
  const [tab, setTab] = useStateA('overview');

  const orders = [
    { id: 'PW2025-1029', date: '5/8', items: 3, total: 287, status: '已送达', emojis: ['🥣','🦴','🎾'] },
    { id: 'PW2025-0913', date: '4/22', items: 2, total: 158, status: '已送达', emojis: ['🐟','🍤'] },
    { id: 'PW2025-0772', date: '4/3', items: 5, total: 524, status: '已送达', emojis: ['🥣','🦴','🛁','🎾','🦆'] },
  ];

  const pets = window.PETS;

  return (
    <>
      <section style={{ paddingTop: 56, paddingBottom: 32 }}>
        <div className="container">
          <div style={{
            background: 'var(--ink)', color: 'var(--bg)',
            borderRadius: 28, padding: '40px 48px',
            display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 28, alignItems: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: -20, bottom: -60, fontSize: 260, opacity: .08 }}>🐾</div>
            <div style={{
              width: 88, height: 88, borderRadius: 999,
              background: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 44,
            }}>👤</div>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>和同学</h2>
                <span style={{
                  height: 26, padding: '0 12px', borderRadius: 999,
                  background: 'var(--accent)', color: '#2a1a0a',
                  fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4,
                  whiteSpace: 'nowrap',
                }}>
                  ⭐ Pawly Club 会员
                </span>
              </div>
              <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,.65)', fontSize: 14 }}>
                会员有效期至 2026 年 12 月 · 已陪伴糯米和芝麻 287 天
              </p>
            </div>
            <div style={{ display: 'flex', gap: 48, position: 'relative' }}>
              {[
                { n: '12', l: '订单' },
                { n: '2,180', l: '积分' },
                { n: '¥218', l: '已节省' },
              ].map(s => (
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
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { id: 'overview', l: '概览' },
              { id: 'orders', l: '我的订单' },
              { id: 'pets', l: '宠物档案' },
              { id: 'fav', l: '我的收藏' },
              { id: 'addr', l: '地址管理' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  height: 52, padding: '0 16px', border: 0, background: 'transparent',
                  color: 'var(--ink)', fontSize: 14, fontWeight: 500,
                  borderBottom: tab === t.id ? '2px solid var(--ink)' : '2px solid transparent',
                  marginBottom: -1,
                }}>{t.l}</button>
            ))}
          </div>
        </div>
      </div>

      <section style={{ paddingTop: 48, paddingBottom: 96 }}>
        <div className="container">
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* 宠物快速档案 */}
              <div className="card" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="h-3" style={{ margin: 0 }}>我的毛孩子</h3>
                  <button onClick={() => setTab('pets')} className="btn btn-ghost btn-sm">查看全部 →</button>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {pets.map(p => (
                    <div key={p.name} style={{ flex: 1, padding: 20, borderRadius: 16,
                                                background: p.bg, textAlign: 'center' }}>
                      <div style={{ fontSize: 56 }}>{p.emoji}</div>
                      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>{p.name}</div>
                      <div className="caption">{p.type} · {p.age}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 最近订单 */}
              <div className="card" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="h-3" style={{ margin: 0 }}>最近订单</h3>
                  <button onClick={() => setTab('orders')} className="btn btn-ghost btn-sm">全部订单 →</button>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {orders.slice(0, 2).map(o => (
                    <li key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
                                            borderBottom: '1px solid var(--line-2)' }}>
                      <div style={{ display: 'flex' }}>
                        {o.emojis.slice(0, 3).map((e, i) => (
                          <div key={i} style={{
                            width: 36, height: 36, borderRadius: 8, background: 'var(--surface-2)',
                            display: 'grid', placeItems: 'center', fontSize: 18,
                            marginLeft: i > 0 ? -8 : 0,
                            border: '1px solid var(--surface)',
                          }}>{e}</div>
                        ))}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{o.id}</div>
                        <div className="caption">{o.date} · {o.items} 件商品 · {o.status}</div>
                      </div>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{fmt(o.total)}</div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 推荐补货 */}
              <div className="card" style={{ padding: 28, gridColumn: 'span 2' }}>
                <h3 className="h-3" style={{ margin: '0 0 20px' }}>该补货啦 · 根据糯米的消耗量</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {PRODUCTS.slice(0, 4).map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                                              padding: 12, borderRadius: 14, background: 'var(--surface-2)' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 10, background: p.bg,
                                    display: 'grid', placeItems: 'center', fontSize: 22, flexShrink: 0 }}>
                        {p.emoji}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3,
                                       display: '-webkit-box', WebkitLineClamp: 2,
                                       WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {p.name}
                        </div>
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
              <div style={{ display: 'grid', gap: 12 }}>
                {orders.map(o => (
                  <div key={o.id} className="card" style={{
                    padding: 24, display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto auto', gap: 24, alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex' }}>
                      {o.emojis.map((e, i) => (
                        <div key={i} style={{
                          width: 56, height: 56, borderRadius: 12, background: 'var(--surface-2)',
                          display: 'grid', placeItems: 'center', fontSize: 28,
                          marginLeft: i > 0 ? -16 : 0, border: '2px solid var(--surface)',
                        }}>{e}</div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{o.id}</div>
                      <div className="caption" style={{ marginTop: 4 }}>{o.date} 下单 · {o.items} 件商品</div>
                    </div>
                    <span className="badge">{o.status}</span>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{fmt(o.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'pets' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 className="h-3" style={{ margin: 0 }}>我的毛孩子</h3>
                <button className="btn btn-primary btn-sm">+ 添加宠物</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {pets.map(p => (
                  <div key={p.name} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ background: p.bg, padding: '40px 0', textAlign: 'center', fontSize: 88 }}>
                      {p.emoji}
                    </div>
                    <div style={{ padding: 24 }}>
                      <h4 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{p.name}</h4>
                      <p className="caption" style={{ margin: '4px 0 0' }}>{p.type}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20 }}>
                        {[['年龄', p.age], ['性别', p.sex], ['体重', p.weight]].map(([k, v]) => (
                          <div key={k}>
                            <div className="caption">{k}</div>
                            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-line btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}>
                        编辑档案
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'fav' && (
            <div>
              <h3 className="h-3" style={{ margin: '0 0 20px' }}>我的收藏</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                {PRODUCTS.slice(2, 10).map(p => (
                  <ProductCard key={p.id} p={p}
                    onOpen={(p) => navigate({ page: 'product', id: p.id })}
                    onAdd={() => {}} />
                ))}
              </div>
            </div>
          )}

          {tab === 'addr' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 className="h-3" style={{ margin: 0 }}>地址管理</h3>
                <button className="btn btn-primary btn-sm">+ 新地址</button>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { tag: '默认', name: '和同学', phone: '138 0000 0000', addr: '上海市徐汇区某某路 88 号 12 楼' },
                  { tag: '公司', name: '和同学', phone: '138 0000 0000', addr: '上海市浦东新区某某大厦 25 层' },
                ].map((a, i) => (
                  <div key={i} className="card" style={{ padding: 24, display: 'flex', gap: 24, alignItems: 'center' }}>
                    <span className="badge" style={{ background: i === 0 ? 'var(--accent)' : 'var(--surface-2)',
                                                       color: i === 0 ? '#2a1a0a' : 'var(--ink-2)',
                                                       fontWeight: 600 }}>{a.tag}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name} · {a.phone}</div>
                      <div className="caption" style={{ marginTop: 4 }}>{a.addr}</div>
                    </div>
                    <button className="btn btn-line btn-sm">编辑</button>
                    <button className="btn btn-ghost btn-sm">删除</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

Object.assign(window, { ArticlesPage, ArticlePage, CheckoutPage, MemberPage });
