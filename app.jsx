// 主 App：路由 + 主题 + 购物车 + Tweaks
const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "coastal",
  "dark": false
}/*EDITMODE-END*/;

// 主题配色定义 — 4 套 + 各自的深色版本
const THEMES = {
  coastal: {
    name: '海岸',
    light:  { bg: '#EFF4F2', surface: '#FFFFFF', surface2: '#F7F9F8', ink: '#264653', primary: '#7BA7BC', accent: '#F4A261' },
    dark:   { bg: '#1A2530', surface: '#243340', surface2: '#1F2C38', ink: '#E8EFEE', primary: '#8FBCCC', accent: '#F4A261' },
    swatch: ['#7BA7BC', '#F4A261', '#264653'],
  },
  sage: {
    name: '苔藓',
    light:  { bg: '#F3F1EB', surface: '#FFFFFF', surface2: '#F9F8F4', ink: '#3A3D2A', primary: '#A8B5A0', accent: '#D9826B' },
    dark:   { bg: '#1F211A', surface: '#2A2D24', surface2: '#24271E', ink: '#EDEEE6', primary: '#B5C2AD', accent: '#D9826B' },
    swatch: ['#A8B5A0', '#D9826B', '#3A3D2A'],
  },
  rose: {
    name: '玫粉',
    light:  { bg: '#F7F1EE', surface: '#FFFFFF', surface2: '#FBF6F4', ink: '#4A3737', primary: '#C9A0A8', accent: '#7B9BAA' },
    dark:   { bg: '#241B1B', surface: '#312525', surface2: '#2B2020', ink: '#F0E8E7', primary: '#D4ADB5', accent: '#7B9BAA' },
    swatch: ['#C9A0A8', '#7B9BAA', '#4A3737'],
  },
  mono: {
    name: '极简',
    light:  { bg: '#F5F5F4', surface: '#FFFFFF', surface2: '#FAFAF9', ink: '#1A1A1A', primary: '#525252', accent: '#FF6B47' },
    dark:   { bg: '#0F0F0F', surface: '#1C1C1C', surface2: '#171717', ink: '#F5F5F4', primary: '#A3A3A3', accent: '#FF6B47' },
    swatch: ['#1A1A1A', '#FF6B47', '#A3A3A3'],
  },
};

function applyTheme(themeKey, dark) {
  const t = THEMES[themeKey] || THEMES.coastal;
  const v = dark ? t.dark : t.light;
  const r = document.documentElement;
  r.style.setProperty('--bg', v.bg);
  r.style.setProperty('--surface', v.surface);
  r.style.setProperty('--surface-2', v.surface2);
  r.style.setProperty('--ink', v.ink);
  r.style.setProperty('--ink-2', dark ? 'rgba(255,255,255,.7)' : `${v.ink}A8`);
  r.style.setProperty('--ink-3', dark ? 'rgba(255,255,255,.45)' : `${v.ink}73`);
  r.style.setProperty('--primary', v.primary);
  r.style.setProperty('--accent', v.accent);
  r.style.setProperty('--line',   dark ? 'rgba(255,255,255,.12)' : `${v.ink}1A`);
  r.style.setProperty('--line-2', dark ? 'rgba(255,255,255,.06)' : `${v.ink}10`);
  // header bg & sticky filter bg
  r.style.setProperty('color-scheme', dark ? 'dark' : 'light');
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useStateApp({ page: 'home' });
  const [cartItems, setCartItems] = useStateApp([]);
  const [cartOpen, setCartOpen] = useStateApp(false);

  useEffectApp(() => { applyTheme(t.theme, t.dark); }, [t.theme, t.dark]);

  const navigate = (next) => {
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const addToCart = (p, qty = 1) => {
    setCartItems(prev => {
      const found = prev.find(x => x.id === p.id);
      if (found) return prev.map(x => x.id === p.id ? { ...x, qty: x.qty + qty } : x);
      return [...prev, { ...p, qty }];
    });
  };
  const setQty = (id, qty) => {
    if (qty <= 0) setCartItems(prev => prev.filter(x => x.id !== id));
    else setCartItems(prev => prev.map(x => x.id === id ? { ...x, qty } : x));
  };
  const removeItem = (id) => setCartItems(prev => prev.filter(x => x.id !== id));
  const clearCart = () => setCartItems([]);
  const cartCount = cartItems.reduce((s, it) => s + it.qty, 0);

  const goCheckout = () => {
    setCartOpen(false);
    navigate({ page: 'checkout' });
  };

  // Override the header sticky bg & sticky filter bg via injected CSS for current theme
  useEffectApp(() => {
    const style = document.getElementById('theme-runtime') || (() => {
      const s = document.createElement('style');
      s.id = 'theme-runtime';
      document.head.appendChild(s);
      return s;
    })();
    const theme = THEMES[t.theme] || THEMES.coastal;
    const v = t.dark ? theme.dark : theme.light;
    style.textContent = `
      header[data-stk]{background: ${v.bg}cc !important;}
    `;
  }, [t.theme, t.dark]);

  let page;
  switch (route.page) {
    case 'shop':     page = <ShopPage initialCat={route.cat} navigate={navigate} onAdd={addToCart} />; break;
    case 'product':  page = <ProductPage id={route.id} navigate={navigate} onAdd={addToCart} onCartOpen={() => setCartOpen(true)} />; break;
    case 'articles': page = <ArticlesPage navigate={navigate} />; break;
    case 'article':  page = <ArticlePage id={route.id} navigate={navigate} />; break;
    case 'checkout': page = <CheckoutPage items={cartItems} navigate={navigate} clearCart={clearCart} />; break;
    case 'member':   page = <MemberPage navigate={navigate} />; break;
    default:         page = <HomePage navigate={navigate} onAdd={addToCart} onCartOpen={() => setCartOpen(true)} />;
  }

  return (
    <>
      <Header route={route} navigate={navigate}
              cartCount={cartCount}
              onCartOpen={() => setCartOpen(true)} />
      <main key={route.page + (route.id || '') + (route.cat || '')}>
        {page}
      </main>
      <Footer />

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)}
                  items={cartItems} setQty={setQty} removeItem={removeItem}
                  onCheckout={goCheckout} />

      <ChatWidget onAdd={addToCart} navigate={navigate} onCartOpen={() => setCartOpen(true)} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="主题配色">
          <TweakColor label="配色方案" value={THEMES[t.theme].swatch}
            options={Object.values(THEMES).map(th => th.swatch)}
            onChange={(v) => {
              const key = Object.keys(THEMES).find(k => JSON.stringify(THEMES[k].swatch) === JSON.stringify(v));
              if (key) setTweak('theme', key);
            }} />
          <TweakRadio label="主题" value={t.theme}
            options={[
              {value:'coastal', label:'海岸'},
              {value:'sage', label:'苔藓'},
              {value:'rose', label:'玫粉'},
              {value:'mono', label:'极简'},
            ]}
            onChange={(v) => setTweak('theme', v)} />
        </TweakSection>
        <TweakSection label="外观">
          <TweakToggle label="深色模式" value={t.dark}
            onChange={(v) => setTweak('dark', v)} />
        </TweakSection>
        <TweakSection label="跳转">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { id: 'home', l: '首页' },
              { id: 'shop', l: '商品' },
              { id: 'product', l: '详情', extra: { id: 'p1' } },
              { id: 'articles', l: '科普' },
              { id: 'article', l: '文章', extra: { id: 'a1' } },
              { id: 'checkout', l: '结算' },
              { id: 'member', l: '会员' },
            ].map(p => (
              <button key={p.id} onClick={() => navigate({ page: p.id, ...(p.extra || {}) })}
                style={{
                  height: 26, padding: 0, borderRadius: 7, border: 0,
                  background: 'rgba(0,0,0,.06)', color: 'inherit',
                  fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                }}>{p.l}</button>
            ))}
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
