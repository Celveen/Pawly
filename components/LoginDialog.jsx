// 登录 / 注册弹窗：账号为手机号或邮箱 + 密码。
// 顶栏「登录」按钮与会员页共用同一个组件，登录成功后由调用方刷新自身数据。
//
// 必须用 Portal 挂到 body：顶栏有 backdrop-filter 毛玻璃，而带 filter/backdrop-filter
// 的元素会成为固定定位子元素的包含块——直接渲染在顶栏里的话，position:fixed 会相对顶栏
// 那 76px 的盒子定位，弹窗被顶到页面上方且遮罩只盖住顶栏，点空白处关不掉。
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Emoji } from './Emoji';

export function LoginDialog({ onClose, onLoggedIn }) {
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ account: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Esc 关闭，兜底一个键盘出口
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 账号既可以是手机号也可以是邮箱，输入时实时判断类型给出提示
  const accountKind = /^1\d{10}$/.test(form.account.trim()) ? 'phone'
    : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.account.trim()) ? 'email' : null;
  const pwIssue = form.password.length === 0 ? null
    : form.password.length < 8 ? '至少 8 位'
    : form.password.length > 20 ? '最长 20 位'
    : !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password) ? '需含字母和数字' : null;
  const canSubmit = !!accountKind && !pwIssue && form.password.length >= 8
    && (mode === 'login' || form.password === form.confirm);

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true); setError('');
    try {
      const url = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: form.account.trim(), password: form.password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || `${mode === 'register' ? '注册' : '登录'}失败（${r.status}）`);
      onLoggedIn();
    } catch (e) { setError(e.message || '操作失败'); setBusy(false); }
  }

  const switchMode = (m) => { setMode(m); setError(''); setForm((f) => ({ ...f, confirm: '' })); };
  const tabStyle = (active) => ({
    flex: 1, height: 40, border: 0, borderRadius: 10, cursor: 'pointer', fontSize: 14,
    fontWeight: active ? 600 : 500,
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--ink)' : 'var(--ink-3)',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
  });

  const dialog = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,42,29,.35)', animation: 'fadeBg .2s ease' }} />
      <div role="dialog" aria-label={mode === 'register' ? '注册' : '登录'} style={{
        position: 'relative', width: 'min(420px, 100%)', maxHeight: 'calc(100vh - 64px)', overflowY: 'auto',
        background: 'var(--surface)', borderRadius: 20, padding: 32, boxShadow: '0 24px 64px -16px rgba(31,42,29,.35)',
        animation: 'dialogIn .28s cubic-bezier(.22,.61,.36,1) both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div className="eyebrow">{mode === 'register' ? 'Sign Up' : 'Sign In'}</div>
            <h2 className="serif" style={{ fontSize: 24, fontWeight: 500, margin: '4px 0 0' }}>
              {mode === 'register' ? '注册 Pawly 账号' : '登录 Pawly'}
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ width: 36, padding: 0, justifyContent: 'center' }} aria-label="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6 18 18 M18 6 6 18" /></svg>
          </button>
        </div>

        {/* 登录 / 注册 切换 */}
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--surface-2)', marginBottom: 18 }}>
          <button onClick={() => switchMode('login')} style={tabStyle(mode === 'login')}>登录</button>
          <button onClick={() => switchMode('register')} style={tabStyle(mode === 'register')}>注册</button>
        </div>

        <label className="caption" style={{ display: 'block', marginBottom: 6 }}>账号（手机号或邮箱）</label>
        <input className="input" placeholder="手机号 或 邮箱" autoFocus autoComplete="username"
          value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        {form.account.trim() && !accountKind && (
          <div className="caption" style={{ color: 'var(--accent)', marginTop: 6 }}>请输入 11 位手机号或有效邮箱</div>
        )}
        {accountKind && (
          <div className="caption" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Emoji text={accountKind === 'phone' ? '📱' : '✉️'} size={12} />
            已识别为{accountKind === 'phone' ? '手机号' : '邮箱'}账号
          </div>
        )}

        <label className="caption" style={{ display: 'block', margin: '14px 0 6px' }}>密码</label>
        <div style={{ position: 'relative' }}>
          <input className="input" type={showPw ? 'text' : 'password'} placeholder="8-20 位，含字母和数字" maxLength={20}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} style={{ paddingRight: 60 }} />
          <button onClick={() => setShowPw((v) => !v)} type="button"
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer' }}>
            {showPw ? '隐藏' : '显示'}
          </button>
        </div>
        {pwIssue && <div className="caption" style={{ color: 'var(--accent)', marginTop: 6 }}>{pwIssue}</div>}

        {mode === 'register' && (
          <>
            <label className="caption" style={{ display: 'block', margin: '14px 0 6px' }}>确认密码</label>
            <input className="input" type={showPw ? 'text' : 'password'} placeholder="再输入一次" maxLength={20} autoComplete="new-password"
              value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
            {form.confirm && form.confirm !== form.password && (
              <div className="caption" style={{ color: 'var(--accent)', marginTop: 6 }}>两次输入的密码不一致</div>
            )}
          </>
        )}

        {error && <div style={{ color: '#D9826B', fontSize: 13, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Emoji text="⚠️" size={14} /> {error}</div>}

        <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 18, justifyContent: 'center' }}
          onClick={submit} disabled={busy || !canSubmit}>
          {busy ? '处理中…' : mode === 'register' ? '注册并登录' : '登录'}
        </button>

        <p className="caption" style={{ marginTop: 14, marginBottom: 0, lineHeight: 1.6 }}>
          {mode === 'register'
            ? '注册后，你以游客身份浏览时产生的宠物档案、订单与帖子会自动并入新账号。'
            : '还没有账号？点上方「注册」创建一个，手机号或邮箱都可以。'}
        </p>
      </div>
    </div>
  );
  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}
