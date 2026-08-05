// 个人主页（小红书式）：大头像 + 宝莉号 + 资料标签（性别/星座/常居地）
// + 关注/粉丝/获赞与收藏统计 + 笔记/收藏/赞过三个页签 + 粉丝关注名单弹窗。
// 数据接口：/api/profile /api/profile/follows /api/profile/collection /api/follow
import { useState, useEffect, useCallback } from 'react';
import { Emoji } from './Emoji';
import { Avatar } from './ui';
import { PostCard, PostDetail } from './PagesCommunity';

const GENDER_LABEL = { female: { emoji: '👧', text: '女生' }, male: { emoji: '👦', text: '男生' } };

// 星座（只用月日，不暴露出生年份）
const ZODIAC = [
  [1, 20, '摩羯座'], [2, 19, '水瓶座'], [3, 21, '双鱼座'], [4, 20, '白羊座'],
  [5, 21, '金牛座'], [6, 22, '双子座'], [7, 23, '巨蟹座'], [8, 23, '狮子座'],
  [9, 23, '处女座'], [10, 24, '天秤座'], [11, 23, '天蝎座'], [12, 22, '射手座'], [13, 0, '摩羯座'],
];
function zodiacOf(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const row = ZODIAC.find(([mm, dd]) => m === mm && day < dd) || ZODIAC.find(([mm]) => mm === m + 1);
  return row ? row[2] : null;
}
function birthdayText(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`;
}

const TABS = [
  { id: 'posts', label: '笔记' },
  { id: 'favorites', label: '收藏', selfOnly: true },
  { id: 'liked', label: '赞过', selfOnly: true },
];

export function ProfilePage({ userId, navigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [tab, setTab] = useState('posts');
  const [collections, setCollections] = useState({}); // { favorites: [...], liked: [...] }
  const [listKind, setListKind] = useState(null); // 'followers' | 'following'

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await fetch(`/api/profile${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`);
      if (!r.ok) throw new Error(`加载失败（${r.status}）`);
      setData(await r.json());
    } catch (e) { setError(e.message); }
  }, [userId]);
  useEffect(() => { setData(null); setTab('posts'); setCollections({}); load(); }, [load]);

  // 切到收藏/赞过时按需拉取（只有本人能看）
  useEffect(() => {
    if (tab === 'posts' || collections[tab] || !data?.isSelf) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/profile/collection?kind=${tab === 'liked' ? 'liked' : 'favorites'}`);
        if (!r.ok) throw new Error();
        const d = await r.json();
        if (alive) setCollections((c) => ({ ...c, [tab]: d.posts || [] }));
      } catch { if (alive) setCollections((c) => ({ ...c, [tab]: [] })); }
    })();
    return () => { alive = false; };
  }, [tab, collections, data?.isSelf]);

  async function toggleFollow() {
    if (!data || data.isSelf) return;
    setData((d) => ({ ...d, isFollowing: !d.isFollowing, followers: d.followers + (d.isFollowing ? -1 : 1) }));
    try {
      const r = await fetch('/api/follow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.id }),
      });
      if (!r.ok) throw new Error();
    } catch { load(); }
  }

  // 三个页签共用一套乐观更新：命中哪个列表就改哪个
  const patchPost = (id, patch) => {
    setData((d) => (d ? { ...d, posts: d.posts.map((x) => (x.id === id ? { ...x, ...patch(x) } : x)) } : d));
    setCollections((c) => {
      const next = { ...c };
      for (const k of Object.keys(next)) next[k] = next[k].map((x) => (x.id === id ? { ...x, ...patch(x) } : x));
      return next;
    });
  };

  async function toggleLike(p) {
    patchPost(p.id, (x) => ({ likedByMe: !x.likedByMe, likeCount: x.likeCount + (x.likedByMe ? -1 : 1) }));
    try {
      await fetch('/api/posts/like', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: p.id }),
      });
    } catch {}
  }

  async function toggleFavorite(p) {
    patchPost(p.id, (x) => ({ favoritedByMe: !x.favoritedByMe, favoriteCount: (x.favoriteCount || 0) + (x.favoritedByMe ? -1 : 1) }));
    try {
      await fetch('/api/posts/favorite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: p.id }),
      });
      // 取消收藏后从「收藏」列表里移除
      setCollections((c) => (c.favorites ? { ...c, favorites: c.favorites.filter((x) => x.id !== p.id || !p.favoritedByMe) } : c));
    } catch {}
  }

  async function removePost(p) {
    if (!window.confirm(`确定删除「${p.title}」吗？`)) return;
    await fetch(`/api/posts?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
    setDetailId(null);
    load();
  }

  const shownPosts = tab === 'posts' ? (data?.posts || []) : (collections[tab] || null);
  const detailPost = detailId
    ? [...(data?.posts || []), ...Object.values(collections).flat()].find((p) => p.id === detailId)
    : null;

  if (error) {
    return (
      <section><div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <p className="body">{error}</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={load}>重试</button>
      </div></section>
    );
  }
  if (!data) return <section><p className="caption" style={{ textAlign: 'center', padding: '96px 0' }}>加载中…</p></section>;

  const gender = GENDER_LABEL[data.gender];
  const zodiac = data.birthday ? zodiacOf(data.birthday) : null;
  const stats = [
    { k: 'following', n: data.following, l: '关注', click: () => setListKind('following') },
    { k: 'followers', n: data.followers, l: '粉丝', click: () => setListKind('followers') },
    { k: 'likes', n: (data.likesReceived || 0) + (data.favoritesReceived || 0), l: '获赞与收藏' },
  ];

  return (
    <>
      <section style={{ paddingTop: 56, paddingBottom: 24 }}>
        <div className="container">
          <button onClick={() => navigate({ page: 'community' })} className="btn btn-ghost btn-sm" style={{ paddingLeft: 6, marginBottom: 20 }}>← 返回社区</button>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* 顶部封面带 */}
            <div style={{ height: 108, background: 'linear-gradient(120deg, rgba(79,122,87,.22), rgba(222,116,41,.14))', position: 'relative' }}>
              <span aria-hidden className="float-deco" style={{ position: 'absolute', right: 28, bottom: -10, opacity: .4, '--r': '-10deg', '--fd': '9s' }}><Emoji text="🐾" size={72} /></span>
            </div>

            <div className="m-col m-pad" style={{ padding: '0 32px 28px', display: 'flex', alignItems: 'flex-start', gap: 24 }}>
              <div style={{ marginTop: -40, flexShrink: 0 }}>
                <Avatar url={data.avatarUrl} emoji={data.avatarEmoji} size={104} ring={4} />
              </div>

              <div style={{ flex: 1, minWidth: 0, paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h1 className="serif" style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>{data.nickname}</h1>
                  {data.isSelf ? (
                    <button className="btn btn-line btn-sm" onClick={() => navigate({ page: 'member' })}>编辑资料</button>
                  ) : (
                    <button onClick={toggleFollow} className="btn btn-sm" style={{
                      background: data.isFollowing ? 'var(--surface-2)' : 'var(--ink)',
                      color: data.isFollowing ? 'var(--ink-2)' : 'var(--bg)', borderRadius: 999, minWidth: 84, justifyContent: 'center',
                    }}>
                      {data.isFollowing ? '已关注' : '+ 关注'}
                    </button>
                  )}
                </div>

                {/* 宝莉号：稳定可读的对外标识，取用户 id 后 6 位 */}
                <div className="caption mono" style={{ marginTop: 6 }}>宝莉号：{data.id.slice(-6).toUpperCase()}</div>

                <p className="body" style={{ margin: '10px 0 0', fontSize: 14 }}>{data.bio || (data.isSelf ? '还没有简介，去"编辑资料"写一句吧' : '这位铲屎官还没写简介')}</p>

                {/* 资料标签：只展示填了的项 */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  {gender && <span className="badge" style={{ gap: 4 }}><Emoji text={gender.emoji} size={12} />{gender.text}</span>}
                  {zodiac && <span className="badge" style={{ gap: 4 }}><Emoji text="✨" size={12} />{zodiac}</span>}
                  {data.birthday && <span className="badge" style={{ gap: 4 }}><Emoji text="🎁" size={12} />{birthdayText(data.birthday)}</span>}
                  {data.location && <span className="badge" style={{ gap: 4 }}><Emoji text="🏠" size={12} />{data.location}</span>}
                  <span className="badge" style={{ gap: 4 }}><Emoji text="🐾" size={12} />{new Date(data.joinedAt).toLocaleDateString('zh-CN')} 加入</span>
                </div>

                {/* 统计：关注/粉丝可点开名单 */}
                <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
                  {stats.map((s) => (
                    <button key={s.k} onClick={s.click}
                      style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '8px 16px 8px 0', border: 0, background: 'transparent',
                        color: 'var(--ink)', cursor: s.click ? 'pointer' : 'default', pointerEvents: s.click ? 'auto' : 'none' }}>
                      <span className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{s.n}</span>
                      <span className="caption">{s.l}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="tint-band" style={{ padding: '24px 0 96px', borderRadius: '36px 36px 0 0' }}>
        <div className="container">
          {/* 页签：收藏/赞过仅本人可见 */}
          <div className="h-scroll" style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--line-2)' }}>
            {TABS.filter((t) => !t.selfOnly || data.isSelf).map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ height: 44, padding: '0 18px', border: 0, background: 'transparent', color: tab === t.id ? 'var(--ink)' : 'var(--ink-3)', fontSize: 14, fontWeight: tab === t.id ? 600 : 500, borderBottom: tab === t.id ? '2px solid var(--ink)' : '2px solid transparent', marginBottom: -1 }}>
                {t.label}
              </button>
            ))}
          </div>

          {shownPosts === null ? (
            <p className="caption" style={{ textAlign: 'center', padding: '48px 0' }}>加载中…</p>
          ) : shownPosts.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: 12 }}><Emoji text="🐾" size={56} /></div>
              <p className="caption" style={{ margin: 0 }}>
                {tab === 'posts' ? '还没有发布过笔记' : tab === 'favorites' ? '还没有收藏过笔记' : '还没有赞过笔记'}
              </p>
            </div>
          ) : (
            // 直接复用社区页同一套瀑布流参数，保证卡片尺寸与窄屏列数一致
            <div className="masonry">
              {shownPosts.map((p) => (
                <PostCard key={p.id} p={p}
                  onOpen={() => setDetailId(p.id)}
                  onLike={() => toggleLike(p)}
                  onAuthor={() => { if (p.authorId !== data.id) navigate({ page: 'profile', userId: p.authorId }); }} />
              ))}
            </div>
          )}
        </div>
      </section>

      {detailPost && (
        <PostDetail p={detailPost} onClose={() => setDetailId(null)} navigate={navigate}
          onLike={() => toggleLike(detailPost)}
          onFavorite={() => toggleFavorite(detailPost)}
          onDelete={() => removePost(detailPost)}
          onTag={() => { setDetailId(null); navigate({ page: 'community' }); }} />
      )}

      {listKind && (
        <FollowListDialog userId={data.id} kind={listKind} title={listKind === 'followers' ? '粉丝' : '关注'}
          onClose={() => setListKind(null)}
          onOpenUser={(u) => { setListKind(null); navigate({ page: 'profile', userId: u.id }); }}
          onChanged={load} />
      )}
    </>
  );
}

// 粉丝 / 关注 名单弹窗：可直接在名单里关注、取关，点头像进对方主页
function FollowListDialog({ userId, kind, title, onClose, onOpenUser, onChanged }) {
  const [users, setUsers] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/profile/follows?userId=${encodeURIComponent(userId)}&kind=${kind}`);
        if (!r.ok) throw new Error();
        const d = await r.json();
        if (alive) setUsers(d.users || []);
      } catch { if (alive) setUsers([]); }
    })();
    return () => { alive = false; };
  }, [userId, kind]);

  async function toggle(u) {
    setBusy(u.id);
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, isFollowing: !x.isFollowing } : x)));
    try {
      await fetch('/api/follow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id }),
      });
      onChanged?.();
    } catch {} finally { setBusy(''); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,42,29,.4)', animation: 'fadeBg .2s ease' }} />
      <div role="dialog" aria-label={title} style={{
        position: 'relative', width: 'min(420px, 100%)', maxHeight: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column',
        background: 'var(--bg)', borderRadius: 20, boxShadow: '0 24px 64px -16px rgba(31,42,29,.35)', animation: 'dialogIn .25s ease both',
      }}>
        <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="serif" style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="关闭" style={{ width: 32, padding: 0, justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 12px 16px' }}>
          {users === null && <p className="caption" style={{ textAlign: 'center', padding: '32px 0' }}>加载中…</p>}
          {users && users.length === 0 && (
            <p className="caption" style={{ textAlign: 'center', padding: '32px 0' }}>
              {kind === 'followers' ? '还没有粉丝，多发几篇笔记吧～' : '还没有关注任何人'}
            </p>
          )}
          {users?.map((u) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12 }}>
              <button onClick={() => onOpenUser(u)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, border: 0, background: 'transparent', padding: 0, textAlign: 'left' }}>
                <Avatar url={u.avatarUrl} emoji={u.avatarEmoji} size={40} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nickname}</span>
                  <span className="caption" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.bio || '这位铲屎官还没写简介'}</span>
                </span>
              </button>
              {!u.isSelf && (
                <button onClick={() => toggle(u)} disabled={busy === u.id} className="btn btn-sm"
                  style={{ flexShrink: 0, borderRadius: 999, minWidth: 72, justifyContent: 'center',
                    background: u.isFollowing ? 'var(--surface-2)' : 'var(--ink)', color: u.isFollowing ? 'var(--ink-2)' : 'var(--bg)' }}>
                  {u.isFollowing ? '已关注' : '关注'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
