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
          <div className="card m-col" style={{ padding: 32, display: 'flex', alignItems: 'center', gap: 28 }}>
            <div style={{ width: 88, height: 88, borderRadius: 999, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Emoji text={data.avatarEmoji || '👤'} size={48} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
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
              <div style={{ display: 'flex', gap: 28, marginTop: 14 }}>
                {[{ n: data.postCount, l: '帖子' }, { n: data.followers, l: '粉丝' }, { n: data.following, l: '关注' }].map((s) => (
                  <div key={s.l} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{s.n}</span>
                    <span className="caption">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0, paddingBottom: 96 }}>
        <div className="container">
          <div className="eyebrow eyebrow-rule" style={{ marginBottom: 20 }}>{data.isSelf ? '我的帖子' : 'TA 的帖子'}</div>
          {data.posts.length === 0 ? (
            <p className="caption" style={{ padding: '48px 0', textAlign: 'center' }}>还没有发布过帖子</p>
          ) : (
            <div style={{ columns: '4 240px', columnGap: 20 }}>
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
