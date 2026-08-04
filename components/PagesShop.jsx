// 首页 + 商品列表 + 商品详情
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { fmt } from './util';
import { PRODUCTS, CATEGORIES, ARTICLES } from './data';
import { ProductCard, ArticleCard, Reveal, SmartImage, FloatEmoji } from './ui';
import { Emoji } from './Emoji';
import { ChatDemo } from './ChatDemo';
import { VideoSlot } from './VideoSlot';
import { PET_CONTENT_FILTERS, RODENT_ALIASES, getPetSpecies } from '@/lib/pet-species';

// 首页：编辑风编排 —— 开场（衬线大标题 + AI 对话演示）→ 信任三则 → 编号章节
export function HomePage({ navigate, onAdd, onAskAI }) {
  const featured = PRODUCTS.slice(0, 8);
  const newArrivals = PRODUCTS.filter((p) => p.tag === '新品' || p.cat === 'snack').slice(0, 4);
  const marqueeArticles = ARTICLES.slice(0, 10);

  return (
    <>
      {/* —— 开场：全屏视频背景（无素材时光流占位）+ 双色大标题 + 角落内容布局 —— */}
      <section style={{ padding: 0, position: 'relative', overflow: 'hidden', marginTop: -76, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <VideoSlot name="hero" overlay="linear-gradient(180deg, rgba(247,242,229,.72), rgba(247,242,229,.18) 40%, rgba(247,242,229,.05) 64%, rgba(247,242,229,.62))" />
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 84, paddingBottom: 36 }}>
          {/* 居中双色大标题：无标点，深绿+浅绿分层 */}
          <div className="container hero-title" style={{ textAlign: 'center' }}>
            <h1 className="h-display" style={{ margin: 0 }}>
              <span className="word-pop d-1">养宠不懂</span>&nbsp;<span className="word-pop d-2">就问宝莉</span><br />
              <span className="lite word-pop d-3">答案有出处的 AI 管家</span>
            </h1>
            <p className="word-pop d-5" style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--ink-2)', maxWidth: 460, margin: '18px auto 0' }}>
              基于权威兽医指南 先把问题讲明白 再替你把东西挑对
            </p>
          </div>
          {/* 底部两角：贴屏幕两边（不受 1280 容器限制），左下品牌+CTA，右下演示玻璃卡 */}
          <div className="m-col m-gap m-pad" style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32, width: '100%', paddingLeft: 'clamp(24px, 4vw, 72px)', paddingRight: 'clamp(100px, 7vw, 140px)' }}>
            <div className="word-pop d-6" style={{ maxWidth: 380 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--green)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4" /><circle cx="12" cy="12" r="4" /></svg>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em' }}>PAWLY · AI 宠物管家</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)', margin: '0 0 18px' }}>
                喂养 驱虫 训练 挑粮 一句话问到底 需要买什么 才从严选清单里帮你挑
              </p>
              <div className="m-wrap" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button onClick={onAskAI} className="btn btn-primary btn-lg" style={{ borderRadius: 999 }}>让 AI 帮我挑 <span style={{ fontSize: 16 }}>→</span></button>
                <button onClick={() => navigate({ page: 'articles' })} className="btn btn-ghost" style={{ fontWeight: 600 }}>看科普文章</button>
              </div>
            </div>
            <div className="photo-reveal d-6 m-full" style={{ flexShrink: 0 }}>
              <ChatDemo compact onOpenChat={onAskAI} />
            </div>
          </div>
        </div>
      </section>

      {/* —— 信任三则：编号编辑条 —— */}
      <section style={{ paddingTop: 0, paddingBottom: 24 }}>
        <Reveal><div className="container">
          <hr className="hairline" />
          <div className="m-1col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
            {[
              { no: '01', t: '有问题，先问一句', d: '掉毛、软便、挑食、要不要驱虫……随时开口，AI 管家马上接住。' },
              { no: '02', t: '答案有出处', d: '回答基于站内循证科普与 WSAVA、ESCCAP 等权威兽医指南，文末标注来源。' },
              { no: '03', t: '需要买，才推荐', d: '确实需要用到什么，AI 才会从严选清单里帮你挑，一键加购。' },
            ].map((it, i) => (
              <div key={it.no} style={{ padding: '28px 32px 28px 0', marginLeft: i > 0 ? 32 : 0, borderLeft: i > 0 ? '1px solid var(--line-2)' : 'none', paddingLeft: i > 0 ? 32 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                  <span className="serif" style={{ fontSize: 15, color: 'var(--accent)' }}>{it.no}</span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{it.t}</span>
                </div>
                <p className="caption" style={{ margin: 0, lineHeight: 1.65 }}>{it.d}</p>
              </div>
            ))}
          </div>
          <hr className="hairline" />
        </div></Reveal>
      </section>

      {/* —— 章节 01 · 宠物科普（无缝滚动） —— */}
      <section style={{ paddingTop: 40, paddingBottom: 40 }}>
        <Reveal>
          <div className="container">
            <div className="m-col m-gap" style={{ display: 'flex', alignItems: 'flex-end', gap: 32 }}>
              <div style={{ flex: 1 }}>
                <SectionHead no="01" en="Pawly Journal" title={<>养宠物这件事<br />没人天生就会</>}
                  actionLabel="所有文章" onAction={() => navigate({ page: 'articles' })} />
              </div>
              {/* 科普氛围视频位：public/videos/journal.mp4 */}
              <div className="m-full" style={{ position: 'relative', width: 300, height: 150, borderRadius: 18, overflow: 'hidden', flexShrink: 0, marginBottom: 40 }}>
                <VideoSlot name="journal" overlay="linear-gradient(180deg, transparent 55%, rgba(31,42,29,.35))" />
                <span style={{ position: 'absolute', left: 14, bottom: 12, fontSize: 12, fontWeight: 600, color: '#fff', textShadow: '0 1px 4px rgba(31,42,29,.5)' }}>和它一起慢慢学</span>
              </div>
            </div>
          </div>
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

      {/* —— 分类索引：编辑风细条 —— */}
      <section style={{ paddingTop: 24, paddingBottom: 24 }}>
        <Reveal><div className="container">
          <div className="m-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 14 }}>
            {CATEGORIES.slice(1).map((c) => (
              <button key={c.id} onClick={() => navigate({ page: 'shop', cat: c.id })} className="card-hot"
                style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 14, padding: '22px 8px', textAlign: 'center', transition: 'transform .18s ease, box-shadow .22s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Emoji text={c.icon} size={26} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
              </button>
            ))}
          </div>
        </div></Reveal>
      </section>

      {/* —— 章节 02 · 人气好物（反向滚动） —— */}
      <section style={{ paddingTop: 48, paddingBottom: 48 }}>
        <Reveal>
          <div className="container">
            <SectionHead no="02" en="Editor's Picks" title="本周人气好物"
              actionLabel="查看全部" onAction={() => navigate({ page: 'shop' })} />
          </div>
          <div className="marquee">
            <div className="marquee-track marquee-track-rev">
              {[...featured, ...featured].map((p, i) => (
                <div key={`${p.id}-${i}`} style={{ width: 300, flexShrink: 0 }} aria-hidden={i >= featured.length || undefined}>
                  <ProductCard p={p} onOpen={(x) => navigate({ page: 'product', id: x.id })} onAdd={onAdd} />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* —— 会员 —— */}
      <section style={{ paddingTop: 24, paddingBottom: 24 }}>
        <Reveal><div className="container">
          <div className="m-1col m-pad" style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 22, padding: '60px 60px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 40, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* 0.75 倍速：节奏更缓、单次循环更长，衬托会员区的沉稳调性 */}
            <VideoSlot name="member" rate={0.75} overlay="linear-gradient(90deg, rgba(31,42,29,.94) 22%, rgba(31,42,29,.62))" />
            <div style={{ position: 'absolute', right: -40, bottom: -60, opacity: .07 }}><Emoji text="🐾" size={280} /></div>
            <div style={{ position: 'relative' }}>
              <div className="eyebrow" style={{ color: 'rgba(244,248,242,.5)', marginBottom: 16 }}>Pawly Club · 会员计划</div>
              <h2 className="serif" style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 600, lineHeight: 1.15, margin: 0, color: '#F5F9F2' }}>把日常开销<br />变成会员福利</h2>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(244,248,242,.72)', marginTop: 16, maxWidth: 480 }}>
                ¥29/月 解锁全场 9 折、更多 AI 管家额度、生日礼盒，以及每年一次免费宠物体检。日常买粮买罐头省下的钱，往往就够回本。
              </p>
              <button onClick={() => navigate({ page: 'member', tab: 'benefits' })} className="btn btn-accent btn-lg" style={{ marginTop: 28 }}>了解会员 →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, position: 'relative', zIndex: 1 }}>
              {[{ e: '🤖', t: 'AI 额度升级' }, { e: '💳', t: '全场 9 折' }, { e: '🏥', t: '年度体检' }, { e: '🎂', t: '生日福利' }].map((it) => (
                <div key={it.t} style={{ background: 'rgba(244,248,242,.08)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '20px 16px', border: '1px solid rgba(244,248,242,.12)', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Emoji text={it.e} size={18} />{it.t}
                </div>
              ))}
            </div>
          </div>
        </div></Reveal>
      </section>

      {/* —— 章节 03 · 新到货 —— */}
      <section style={{ paddingTop: 48, paddingBottom: 96 }}>
        <Reveal><div className="container">
          <SectionHead no="03" en="New Arrivals" title="新到货"
            actionLabel="查看全部" onAction={() => navigate({ page: 'shop' })} />
          <div className="m-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {newArrivals.map((p) => <ProductCard key={p.id} p={p} onOpen={(p) => navigate({ page: 'product', id: p.id })} onAdd={onAdd} />)}
          </div>
        </div></Reveal>
      </section>
    </>
  );
}

// 编号章节标题：发丝线 + 「01 — EN」眉题 + 衬线大标题（编辑风的目录感）
function SectionHead({ no, en, title, actionLabel, onAction }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <hr className="hairline" style={{ marginBottom: 30 }} />
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}><span className="mono">{no}</span><span style={{ opacity: .5 }}>—</span>{en}</div>
          <h2 className="h-1" style={{ margin: 0 }}>{title}</h2>
        </div>
        {actionLabel && <button onClick={onAction} className="btn btn-ghost" style={{ flexShrink: 0 }}>{actionLabel} →</button>}
      </div>
    </div>
  );
}

export function ShopPage({ initialCat, navigate, onAdd }) {
  const [cat, setCat] = useState(initialCat || 'all');
  const [pet, setPet] = useState('all');
  const [sort, setSort] = useState('热度');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const petFilter = PET_CONTENT_FILTERS.find((item) => item.id === pet);
    const kw = q.trim();
    // 关键词命中：名称/规格/简介/标签/卖点任一包含即可
    const hitKeyword = (p) => kw === ''
      || p.name.includes(kw) || (p.sub || '').includes(kw) || (p.desc || '').includes(kw)
      || (p.tag || '').includes(kw) || (p.badges || []).some((b) => b.includes(kw));
    // 宠物类目命中：'鼠'为聚合分类，按别名匹配商品适用宠物
    const hitPet = (p) => {
      if (!petFilter || petFilter.id === 'all') return true;
      const normalizedPet = String(p.pet || '').toLowerCase();
      const isRodent = petFilter.id === 'rodent' && RODENT_ALIASES.some((alias) => normalizedPet.includes(alias.toLowerCase()));
      return isRodent || petFilter.speciesIds.some((id) => id === getPetSpecies(p.pet).id);
    };
    let list = PRODUCTS.filter((p) => (cat === 'all' || p.cat === cat) && hitPet(p) && hitKeyword(p));
    if (sort === '价格升序') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === '价格降序') list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === '评分') list = [...list].sort((a, b) => b.rating - a.rating);
    else list = [...list].sort((a, b) => b.sold - a.sold);
    return list;
  }, [cat, pet, sort, q]);

  return (
    <>
      <section style={{ paddingTop: 56, paddingBottom: 32 }}>
        <div className="container m-col m-gap" style={{ display: 'flex', alignItems: 'flex-end', gap: 48 }}>
          <div style={{ flex: 1 }}>
            <div className="eyebrow eyebrow-rule" style={{ marginBottom: 16 }}>商品 / Shop all</div>
            <h1 className="h-1" style={{ margin: 0, maxWidth: 720 }}>给毛孩子挑点好的<br /><span style={{ color: 'var(--green-soft)' }}>每一件都实测把关</span></h1>
            <div style={{ marginTop: 28, position: 'relative', maxWidth: 480 }}>
              <input className="input" placeholder="搜索：冻干、猫砂、磨牙棒、主粮..." value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 44 }} />
              <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="caption">大家在搜</span>
              {['冻干', '猫砂', '磨牙', '主食粮'].map((k) => (
                <button key={k} onClick={() => setQ(k)} style={{ height: 28, padding: '0 12px', borderRadius: 999, border: '1px solid rgba(31,42,29,.14)', background: 'rgba(255,253,246,.7)', color: 'var(--ink-2)', fontSize: 12, cursor: 'pointer' }}>{k}</button>
              ))}
            </div>
          </div>
          {/* 栏目氛围视频（public/videos/products.mp4）+ 周边漂浮贴纸 */}
          <div className="m-full" style={{ position: 'relative', flexShrink: 0 }}>
            <FloatEmoji e="🎾" size={46} style={{ left: -30, top: -24 }} r={-12} dur={7.5} />
            <FloatEmoji e="🦴" size={38} style={{ right: -20, bottom: -14 }} r={12} rd={-4} dur={6.4} delay={0.8} />
            <div className="m-full" style={{ position: 'relative', width: 340, height: 190, borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
              <VideoSlot name="products" overlay="linear-gradient(180deg, transparent 55%, rgba(31,42,29,.35))" />
              <span style={{ position: 'absolute', left: 16, bottom: 12, fontSize: 12.5, fontWeight: 600, color: '#fff', textShadow: '0 1px 4px rgba(31,42,29,.5)' }}>被毛孩子亲测过的好东西</span>
            </div>
          </div>
        </div>
      </section>

      <div className="m-static" style={{ position: 'sticky', top: 76, zIndex: 30, background: 'rgba(247,242,229,.82)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--line-2)', borderBottom: '1px solid var(--line-2)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', gap: 16, flexWrap: 'wrap' }}>
          <div className="h-scroll" style={{ display: 'flex', gap: 24 }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)}
                style={{ height: 40, padding: '0 2px', border: 0, background: 'transparent', boxShadow: cat === c.id ? 'inset 0 -2px 0 var(--ink)' : 'none', color: cat === c.id ? 'var(--ink)' : 'var(--ink-2)', fontSize: 13, fontWeight: cat === c.id ? 600 : 500, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'color .15s, box-shadow .15s' }}>
                <Emoji text={c.icon} size={15} />{c.name}
              </button>
            ))}
          </div>
          <div className="m-full" style={{ display: 'flex', gap: 12, alignItems: 'center', maxWidth: '100%', minWidth: 0 }}>
            <div className="h-scroll" style={{ display: 'inline-flex', borderRadius: 8, padding: 3, background: 'var(--surface-2)', border: '1px solid var(--line-2)', maxWidth: '100%', flexShrink: 1 }}>
              {PET_CONTENT_FILTERS.map((filter) => (
                <button key={filter.id} onClick={() => setPet(filter.id)}
                  style={{ height: 28, padding: '0 14px', borderRadius: 6, border: 0, background: pet === filter.id ? 'var(--surface)' : 'transparent', boxShadow: pet === filter.id ? 'var(--shadow-sm)' : 'none', color: 'var(--ink)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Emoji text={filter.emoji} size={13} /> {filter.label}
                </button>
              ))}
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              style={{ height: 34, padding: '0 12px', borderRadius: 999, border: '1px solid var(--line-2)', background: 'var(--surface)', fontSize: 12, color: 'var(--ink)', fontFamily: 'inherit', flexShrink: 0 }}>
              <option>热度</option><option>评分</option><option>价格升序</option><option>价格降序</option>
            </select>
          </div>
        </div>
      </div>

      {/* 浏览全部时按类目分组：分区标题 + 交替底色，打破一铺到底的均一长网格 */}
      {cat === 'all' && q.trim() === '' && filtered.length > 0 ? (
        <div style={{ paddingTop: 8, paddingBottom: 64 }}>
          {CATEGORIES.filter((c) => c.id !== 'all')
            .map((c) => ({ ...c, items: filtered.filter((p) => p.cat === c.id) }))
            .filter((g) => g.items.length > 0)
            .map((g, gi) => (
              <section key={g.id} className={gi % 2 === 1 ? 'tint-band' : undefined}
                style={{ padding: '40px 0 48px', borderRadius: gi % 2 === 1 ? 36 : 0 }}>
                <div className="container">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                    <Emoji text={g.icon} size={24} style={{ alignSelf: 'center' }} />
                    <h2 className="h-3" style={{ margin: 0 }}>{g.name}</h2>
                    <span className="caption">{g.items.length} 件</span>
                    <span style={{ flex: 1 }} />
                    <button className="btn btn-ghost btn-sm" onClick={() => setCat(g.id)}>只看{g.name} →</button>
                  </div>
                  <div className="m-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                    {g.items.map((p) => <ProductCard key={p.id} p={p} onOpen={(p) => navigate({ page: 'product', id: p.id })} onAdd={onAdd} />)}
                  </div>
                </div>
              </section>
            ))}
        </div>
      ) : (
        <section style={{ paddingTop: 32, paddingBottom: 96 }}>
          <div className="container">
            <div className="caption" style={{ marginBottom: 24 }}>共 {filtered.length} 件商品{q.trim() && ` · 关键词「${q.trim()}」`}</div>
            <div className="m-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              {filtered.map((p) => <ProductCard key={p.id} p={p} onOpen={(p) => navigate({ page: 'product', id: p.id })} onAdd={onAdd} />)}
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: '96px 0', textAlign: 'center' }}>
                <div style={{ display: 'grid', placeItems: 'center', marginBottom: 16 }}><Emoji text="🥹" size={64} /></div>
                <p className="body">没有找到合适的商品，换个关键词或分类试试？</p>
              </div>
            )}
          </div>
        </section>
      )}
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
              <div className="prod-img" style={{ background: p.bg, aspectRatio: '1/1', borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
                <SmartImage src={`/images/products/${p.id}.jpg`} alt={p.name} />
                <span className="pet-pill"><Emoji text={getPetSpecies(p.pet).emoji} size={14} /> {getPetSpecies(p.pet).label}</span>
                {p.tag && <span className="tag-pill">{p.tag}</span>}
                <Emoji text={p.emoji} size={220} />
              </div>
              {/* 卖点小贴条：替代原先的假缩略图占位 */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {(p.badges || []).map((b) => (
                  <span key={b} style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)', background: 'rgba(79,122,87,.10)', padding: '6px 12px', borderRadius: 999 }}>✓ {b}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
                <span className="badge" style={{ background: 'var(--bg)' }}>★ {p.rating} · {p.sold.toLocaleString()} 已售</span>
                {p.tag && <span className="badge" style={{ background: 'var(--ink)', color: 'var(--bg)', borderColor: 'transparent' }}>{p.tag}</span>}
              </div>
              <h1 className="h-1" style={{ margin: 0 }}>{p.name}</h1>
              <p className="body-lg" style={{ marginTop: 16 }}>{p.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
                {p.badges.map((b) => <span key={b} className="badge">✓ {b}</span>)}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--line-2)' }}>
                <span className="mono" style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em' }}>{fmt(p.price)}</span>
                {p.was && <span className="mono caption" style={{ textDecoration: 'line-through', fontSize: 16 }}>{fmt(p.was)}</span>}
                {p.was && <span className="badge" style={{ background: 'var(--accent)', color: '#FFF9F2', borderColor: 'transparent', fontWeight: 600 }}>省 {fmt(p.was - p.price)}</span>}
              </div>
              <div style={{ marginTop: 32 }}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>规格</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {variants.map((v, i) => (
                    <button key={v} onClick={() => setVariant(i)} style={{ height: 44, padding: '0 22px', borderRadius: 8, border: variant === i ? '1px solid var(--ink)' : '1px solid var(--line)', background: variant === i ? 'var(--ink)' : 'var(--surface)', color: variant === i ? 'var(--bg)' : 'var(--ink)', fontSize: 14, fontWeight: 500, transition: 'background .15s, color .15s, border-color .15s' }}>{v}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 32, alignItems: 'stretch' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 10, border: '1px solid var(--line)', overflow: 'hidden', height: 52, background: 'var(--surface)' }}>
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

      {/* 商品介绍 + 规格参数：sage 染色带分区，替代发丝线分隔 */}
      <section className="tint-band" style={{ padding: '56px 0', borderRadius: 36 }}>
        <div className="container">
          <div className="m-1col m-gap" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 48 }}>
            <div>
              <div className="eyebrow eyebrow-rule" style={{ marginBottom: 12 }}>商品介绍</div>
              <h2 className="h-2" style={{ margin: '0 0 16px' }}>关于这款{CATEGORIES.find((c) => c.id === p.cat)?.name || '商品'}</h2>
              <p className="body-lg" style={{ marginTop: 0 }}>{p.detail || p.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
                {p.badges.map((b) => <span key={b} className="badge">✓ {b}</span>)}
              </div>
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: 18, padding: 28, border: '1px solid var(--line-2)', alignSelf: 'start' }}>
              <div className="eyebrow" style={{ marginBottom: 16 }}>规格参数</div>
              <dl style={{ margin: 0 }}>
                {[
                  ['适用宠物', <span key="pet" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Emoji text={getPetSpecies(p.pet).emoji} size={14} /> {getPetSpecies(p.pet).label}</span>],
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

      <ReviewsSection product={p} navigate={navigate} />

      <section style={{ paddingTop: 32, paddingBottom: 96 }}>
        <div className="container">
          <hr className="hairline" style={{ marginBottom: 40 }} />
          <div className="eyebrow eyebrow-rule" style={{ marginBottom: 14 }}>Related · 相关推荐</div>
          <h2 className="h-2" style={{ margin: '0 0 32px' }}>顺手再看看</h2>
          <div className="m-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {related.map((rp) => <ProductCard key={rp.id} p={rp} onOpen={(p) => { navigate({ page: 'product', id: p.id }); window.scrollTo(0, 0); }} onAdd={onAdd} />)}
          </div>
        </div>
      </section>
    </>
  );
}

// —— 商品评价/晒单：星级 + 文字 + 图片，可勾选同步为社区 #晒单 帖 ——
function Stars({ n, size = 14, onPick }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} onClick={onPick ? () => onPick(i) : undefined} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= n ? 'var(--accent)' : 'none'} stroke={i <= n ? 'var(--accent)' : 'var(--ink-3)'} strokeWidth="2"
          style={onPick ? { cursor: 'pointer' } : undefined}>
          <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

function ReviewsSection({ product, navigate }) {
  const [list, setList] = useState(null);
  const [writing, setWriting] = useState(false);
  const [lightImg, setLightImg] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}`);
      setList(r.ok ? await r.json() : []);
    } catch { setList([]); }
  }, [product.id]);
  useEffect(() => { load(); }, [load]);

  const avg = list?.length ? (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1) : null;

  return (
    <section style={{ paddingTop: 0, paddingBottom: 32 }}>
      <div className="container">
        <hr className="hairline" style={{ marginBottom: 40 }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="eyebrow eyebrow-rule" style={{ marginBottom: 14 }}>Reviews · 买家评价</div>
            <h2 className="h-2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              评价 {list ? `· ${list.length}` : ''}
              {avg && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15 }}><Stars n={Math.round(avg)} /> <span className="mono">{avg}</span></span>}
            </h2>
          </div>
          <button className="btn btn-primary" onClick={() => setWriting(true)}>写评价 · 晒一单</button>
        </div>

        {list === null && <p className="caption">加载中…</p>}
        {list && list.length === 0 && (
          <div className="card" style={{ padding: '40px 32px', textAlign: 'center', background: 'rgba(79,122,87,.05)' }}>
            <div style={{ display: 'grid', placeItems: 'center', marginBottom: 12 }}><Emoji text="📷" size={56} /></div>
            <p className="body" style={{ margin: '0 0 16px' }}>还没有评价 买过的铲屎官快来晒一单~</p>
            <button className="btn btn-line btn-sm" onClick={() => setWriting(true)}>写下第一条评价</button>
          </div>
        )}
        <div style={{ display: 'grid', gap: 14 }}>
          {(list || []).map((r) => (
            <div key={r.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}><Emoji text={r.authorAvatar || '🐾'} size={16} /></span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.author}</span>
                <Stars n={r.rating} />
                <span className="caption" style={{ marginLeft: 'auto' }}>{new Date(r.createdAt).toLocaleDateString('zh-CN')}</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>{r.content}</p>
              {r.images?.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {r.images.map((src, i) => (
                    <img key={i} src={src} alt={`评价图 ${i + 1}`} onClick={() => setLightImg(src)}
                      style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 10, cursor: 'zoom-in' }} />
                  ))}
                </div>
              )}
              {r.postId && (
                <button onClick={() => navigate({ page: 'community' })} style={{ border: 0, background: 'transparent', color: 'var(--sage)', fontSize: 12.5, fontWeight: 600, padding: 0, marginTop: 10, cursor: 'pointer' }}>
                  已同步到社区 #晒单 →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {writing && <ReviewComposer product={product} onClose={() => setWriting(false)} onPosted={() => { setWriting(false); load(); }} />}
      {lightImg && (
        <div onClick={() => setLightImg(null)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(10,14,10,.9)', display: 'grid', placeItems: 'center', cursor: 'zoom-out' }}>
          <img src={lightImg} alt="评价大图" style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </section>
  );
}

function ReviewComposer({ product, onClose, onPosted }) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [sync, setSync] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  async function pick(e) {
    const files = Array.from(e.target.files || []).slice(0, 9 - images.length);
    e.target.value = '';
    if (!files.length) return;
    try {
      const { compressImage } = await import('./PagesCommunity');
      const out = await Promise.all(files.map(compressImage));
      setImages((prev) => [...prev, ...out.filter((d) => d.length <= 600_000)].slice(0, 9));
    } catch { setError('图片读取失败'); }
  }

  async function submit() {
    if (!content.trim()) { setError('写两句使用感受吧'); return; }
    setSaving(true); setError('');
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, rating, content: content.trim(), images, syncPost: sync }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || '发布失败'); }
      onPosted();
    } catch (e) { setError(e.message); setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,42,29,.4)', animation: 'fadeBg .2s ease' }} />
      <div role="dialog" aria-label="写评价" style={{
        position: 'relative', width: 'min(520px, 100%)', maxHeight: 'calc(100vh - 64px)', overflowY: 'auto',
        background: 'var(--bg)', borderRadius: 20, padding: 28, boxShadow: '0 24px 64px -16px rgba(31,42,29,.35)',
        animation: 'dialogIn .25s ease both',
      }}>
        <h2 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: '0 0 6px' }}>评价 · {product.name}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 14px' }}>
          <span className="caption">打分</span>
          <Stars n={rating} size={22} onPick={setRating} />
        </div>
        <textarea className="input" placeholder="它家毛孩子吃/用得怎么样？真实感受帮助其他铲屎官～（最多 500 字）" maxLength={500} rows={4}
          value={content} onChange={(e) => setContent(e.target.value)}
          style={{ resize: 'vertical', minHeight: 100, height: 'auto', lineHeight: 1.6, paddingTop: 10, borderRadius: 12 }} />
        <div style={{ marginTop: 12 }}>
          <div className="caption" style={{ marginBottom: 8 }}>晒图（{images.length}/9 · 选填）</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {images.map((src, i) => (
              <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 10, overflow: 'hidden' }}>
                <img src={src} alt={`图 ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setImages(images.filter((_, j) => j !== i))} aria-label="移除"
                  style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 999, border: 0, background: 'rgba(31,42,29,.65)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>×</button>
              </div>
            ))}
            {images.length < 9 && (
              <button onClick={() => fileRef.current?.click()} aria-label="添加图片"
                style={{ width: 72, height: 72, borderRadius: 10, border: '1.5px dashed var(--line)', background: 'var(--surface)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={pick} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 13.5, cursor: 'pointer' }}>
          <input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} />
          同步发布到社区（生成一条 #晒单 帖子）
        </label>
        {error && <div style={{ color: 'var(--accent)', fontSize: 13, marginTop: 10 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={submit} disabled={saving || !content.trim()}>{saving ? '发布中…' : '发布评价'}</button>
          <button className="btn btn-line" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
