'use client';
// 整站外壳：前端路由 + 购物车 + 浮窗 AI 客服（沿用原型结构，接后端 API）
import { useState, useRef } from 'react';
import { Header, Footer, CartDrawer } from './ui';
import { HomePage, ShopPage, ProductPage } from './PagesShop';
import { ArticlesPage, ArticlePage, CheckoutPage, MemberPage } from './PagesOther';
import { CommunityPage } from './PagesCommunity';
import ChatWidget from './ChatWidget';

export default function App() {
  const [route, setRoute] = useState({ page: 'home' });
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const navigate = (next) => { setRoute(next); window.scrollTo({ top: 0, behavior: 'instant' }); };

  const addToCart = (p, qty = 1) => {
    setCartItems((prev) => {
      const found = prev.find((x) => x.id === p.id);
      if (found) return prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty + qty } : x));
      return [...prev, { ...p, qty }];
    });
    // 加入购物车确认动效：升起一个 Toast，1.8s 后消失
    setToast({ name: p.name, qty, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };
  const setQty = (id, qty) => {
    if (qty <= 0) setCartItems((prev) => prev.filter((x) => x.id !== id));
    else setCartItems((prev) => prev.map((x) => (x.id === id ? { ...x, qty } : x)));
  };
  const removeItem = (id) => setCartItems((prev) => prev.filter((x) => x.id !== id));
  const clearCart = () => setCartItems([]);
  const cartCount = cartItems.reduce((s, it) => s + it.qty, 0);
  const goCheckout = () => { setCartOpen(false); navigate({ page: 'checkout' }); };

  let page;
  switch (route.page) {
    case 'shop': page = <ShopPage initialCat={route.cat} navigate={navigate} onAdd={addToCart} />; break;
    case 'product': page = <ProductPage id={route.id} navigate={navigate} onAdd={addToCart} onCartOpen={() => setCartOpen(true)} />; break;
    case 'articles': page = <ArticlesPage navigate={navigate} />; break;
    case 'community': page = <CommunityPage />; break;
    case 'article': page = <ArticlePage id={route.id} navigate={navigate} />; break;
    case 'checkout': page = <CheckoutPage items={cartItems} navigate={navigate} clearCart={clearCart} />; break;
    case 'member': page = <MemberPage navigate={navigate} initialTab={route.tab} key={route.tab || 'overview'} />; break;
    default: page = <HomePage navigate={navigate} onAdd={addToCart} onCartOpen={() => setCartOpen(true)} />;
  }

  return (
    <>
      <Header route={route} navigate={navigate} cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
      <main key={route.page + (route.id || '') + (route.cat || '') + (route.tab || '')}>{page}</main>
      <Footer navigate={navigate} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cartItems} setQty={setQty} removeItem={removeItem} onCheckout={goCheckout} />
      <ChatWidget onAdd={addToCart} navigate={navigate} onCartOpen={() => setCartOpen(true)} />
      {toast && <CartToast key={toast.id} name={toast.name} qty={toast.qty} onClick={() => setCartOpen(true)} />}
    </>
  );
}

function CartToast({ name, qty, onClick }) {
  return (
    <div onClick={onClick} role="status" style={{
      position: 'fixed', left: '50%', bottom: 32, zIndex: 90, cursor: 'pointer',
      background: 'var(--ink)', color: 'var(--bg)', padding: '12px 18px', borderRadius: 999,
      boxShadow: '0 16px 36px -10px rgba(38,70,83,.45)', fontSize: 14, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 10, maxWidth: 'min(86vw, 420px)',
      animation: 'toastIn .28s cubic-bezier(.22,.61,.36,1) both',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 999, background: '#22C55E', color: '#fff',
        display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700,
      }}>✓</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        已加入购物车{qty > 1 ? ` ×${qty}` : ''} · {name}
      </span>
      <span style={{ marginLeft: 4, fontSize: 13, color: 'var(--accent)', whiteSpace: 'nowrap' }}>去结算 →</span>
    </div>
  );
}
