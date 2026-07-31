// 对外个人主页：头像/昵称/简介 + 关注按钮 + 粉丝关注数 + TA 的帖子瀑布流
// 数据接口：/api/profile /api/follow；帖子卡与详情复用社区组件。
import { useState, useEffect, useCallback } from 'react';
import { Emoji } from './Emoji';
import { PostCard, PostDetail } from './PagesCommunity';

export function ProfilePage({ userId, navigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await fetch(`/api/profile${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`);
      if (!r.ok) throw new Error(`加载失败（${r.status}）`);
      setData(await r.json());
    } catch (e) { setError(e.message); }
  }, [userId]);
  useEffect(() => { setData(null); load(); }, [load]);

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

  async function toggleLike(p) {
    setData((d) => ({
      ...d,
      posts: d.posts.map((x) => x.id === p.id
        ? { ...x, likedByMe: !x.likedByMe, likeCount: x.likeCount + (x.likedByMe ? -1 : 1) }
        : x),
    }));
    try {
      await fetch('/api/posts/like', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: p.id }),
      });
    } catch {}
  }

  async function removePost(p) {
    if (!window.confirm(`确定删除「${p.title}」吗？`)) return;
    await fetch(`/api/posts?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
    setDetailId(null);
    load();
  }

  const detailPost = detailId && data ? data.posts.find((p) => p.id === detailId) : null;

  if (error) {
    return (
      <section><div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <p className="body">{error}</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={load}>重试</button>
      </div></section>
    );
  }
  if (!data) return <section><p className="caption" style={{ textAlign: 'center', padding: '96px 0' }}>加载中…</p></section>;

  return (
    <>
      <section style={{ paddingTop: 56, paddingBottom: 32 }}>
        <div className="container">
          <button onClick={() => navigate({ page: 'community' })} className="btn btn-ghost btn-sm" style={{ paddingLeft: 6, marginBottom: 24 }}>← 返回社区</button>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* 顶部 sage 封面带：填补个人卡右侧的大片空白，头像叠压其上 */}
            <div style={{ height: 96, background: 'linear-gradient(120deg, rgba(79,122,87,.22), rgba(222,116,41,.14))', position: 'relative' }}>
              <span aria-hidden style={{ position: 'absolute', right: 28, bottom: -10, opacity: .4, transform: 'rotate(-10deg)' }}><Emoji text="🐾" size={72} /></span>
            </div>
            <div className="m-col" style={{ padding: '0 32px 28px', display: 'flex', alignItems: 'flex-end', gap: 28 }}>
              <div style={{ width: 96, height: 96, borderRadius: 999, background: 'var(--surface-2)', border: '4px solid var(--surface)', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: -36 }}>
                <Emoji text={data.avatarEmoji || '🐱'} size={52} />
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h1 className="serif" style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>{data.nickname}</h1>
                  {data.isSelf ? (
                    <button className="btn btn-line btn-sm" onClick={() => navigate({ page: 'member' })}>编辑资料</button>
                  ) : (
                    <button onClick={toggleFollow} className="btn btn-sm" style={{
                      background: data.isFollowing ? 'var(--surface-2)' : 'var(--ink)',
                      color: data.isFollowing ? 'var(--ink-2)' : 'var(--bg)', borderRadius: 999,
                    }}>
                      {data.isFollowing ? '已关注' : '+ 关注'}
                    </button>
                  )}
                </div>
                <p className="body" style={{ margin: '8px 0 0', fontSize: 14 }}>{data.bio || '这位铲屎官还没写简介'}</p>
              </div>
              {/* 统计块右置：数字上标签下，竖线分隔 */}
              <div style={{ display: 'flex', paddingTop: 16, flexShrink: 0 }}>
                {[{ n: data.postCount, l: '帖子' }, { n: data.followers, l: '粉丝' }, { n: data.following, l: '关注' }].map((s, i) => (
                  <div key={s.l} style={{ textAlign: 'center', padding: '0 24px', borderLeft: i > 0 ? '1px solid var(--line-2)' : 0 }}>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{s.n}</div>
                    <div className="caption" style={{ marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="tint-band" style={{ padding: '40px 0 96px', borderRadius: '36px 36px 0 0' }}>
        <div className="container">
          <div className="eyebrow eyebrow-rule" style={{ marginBottom: 20 }}>{data.isSelf ? '我的帖子' : 'TA 的帖子'}</div>
          {data.posts.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: 12 }}><Emoji text="🐾" size={56} /></div>
              <p className="caption" style={{ margin: 0 }}>还没有发布过帖子</p>
            </div>
          ) : (
            <div className="masonry" style={{ columns: '4 240px', columnGap: 20 }}>
              {data.posts.map((p) => (
                <PostCard key={p.id} p={p}
                  onOpen={() => setDetailId(p.id)}
                  onLike={() => toggleLike(p)}
                  onAuthor={() => {}} />
              ))}
            </div>
          )}
        </div>
      </section>

      {detailPost && (
        <PostDetail p={detailPost} onClose={() => setDetailId(null)} navigate={navigate}
          onLike={() => toggleLike(detailPost)} onDelete={() => removePost(detailPost)}
          onTag={() => { setDetailId(null); navigate({ page: 'community' }); }} />
      )}
    </>
  );
}
