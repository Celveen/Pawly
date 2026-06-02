// AI 客服助手 — 宝莉助手 v2（可拖拽 + 新配色）

const { useState: useStateAI, useRef: useRefAI, useEffect: useEffectAI } = React;

const ASSISTANT_NAME = '宝莉助手';

// 可爱的爪印 SVG（白色，用于按钮）
const PawIcon = ({ size = 26, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <ellipse cx="9"  cy="11.5" rx="2.8" ry="3.3" fill={color}/>
    <ellipse cx="16" cy="8.5"  rx="2.8" ry="3.3" fill={color}/>
    <ellipse cx="23" cy="11.5" rx="2.8" ry="3.3" fill={color}/>
    <ellipse cx="6"  cy="18.5" rx="2.4" ry="2.8" fill={color}/>
    <ellipse cx="26" cy="18.5" rx="2.4" ry="2.8" fill={color}/>
    <path d="M9 22c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5c0 2.6-2.4 4.5-7 4.5S9 24.6 9 22Z" fill={color}/>
  </svg>
);

// 把完整商品库喂给模型，让它能精准挑货、比价、配套
function buildCatalog() {
  return (window.PRODUCTS || []).map(p =>
    `${p.id} | ${p.name} | ${p.pet} | ¥${p.price}（原价¥${p.was}）| 评分${p.rating} 销量${p.sold} | ${p.sub} | 卖点:${(p.badges || []).join('/')} | ${p.desc}`
  ).join('\n');
}

// 把用户的宠物档案喂给模型，作为"结合自家狗特点"的依据
function buildPetContext() {
  return (window.PETS || []).map(p =>
    `${p.name}（${p.type}，${p.species}，${p.age}，${p.sex}，${p.weight}）— ${p.notes}`
  ).join('\n');
}

function buildSystemPrompt() {
  return `你是 Pawly 宝莉宠物用品店的 AI 导购助手，名叫"宝莉助手"。

【你的人设】
- 语气轻松幽默、亲切自然，会用"铲屎官""毛孩子""主子"等术语
- 像一个懂宠物、热爱动物的朋友，而不是死板的客服
- 在专业医疗问题上会建议咨询兽医，绝不假装是医生

【用户的宠物档案（推荐时必须结合）】
${buildPetContext()}

【完整商品库（只能从这里挑，用 id 引用）】
${buildCatalog()}

【店铺政策】
- 满 ¥99 包邮，否则 ¥12 运费；次日达 ¥18
- 7 天无理由退换，假一赔三；会员 ¥29/月全场 9 折 + 月度免费体检

【输出格式 — 非常重要】
你必须只输出一个 JSON 对象，不要有任何额外文字、不要用 \`\`\` 包裹。结构如下：
{
  "reply": "给用户的简短口语回复（80字内，引导TA看下面的方案；纯咨询类问题就在这里答完）",
  "proposals": [
    {
      "title": "方案名（如：日常续粮·经济之选）",
      "badge": "一句话标签（如：性价比之选 / 最受欢迎 / 全面养护）",
      "productIds": ["从商品库挑选的商品id，可多件组成套餐"],
      "reason": "为什么这个方案适合该用户的宠物，要结合品种/年龄/体重/特点，60字内"
    }
  ]
}

规则：
- 当用户在咨询/想购买商品时，给出 2~3 个方案（如：经济单品 / 套餐组合 / 全面养护），从便宜到周全排列。
- 当用户只是闲聊或问政策、订单、养宠知识时，proposals 留空数组 []，只用 reply 回答。
- productIds 必须是商品库里真实存在的 id；为该宠物挑货要对得上物种（狗买狗的、猫买猫的）。`;
}

const QUICK_PROMPTS = [
  '给糯米补点狗粮',
  '芝麻有点胖，怎么吃',
  '订单怎么查询？',
  '会员有什么权益？',
];

// 持久化位置（默认左下角，避开右下的 Tweaks 面板）
function readPos() {
  try {
    const saved = JSON.parse(localStorage.getItem('pawly.chatPos') || 'null');
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') return saved;
  } catch (e) {}
  return { x: 24, y: 24 }; // distance from LEFT and BOTTOM
}

function ChatWidget({ onAdd, navigate, onCartOpen } = {}) {
  const [open, setOpen] = useStateAI(false);
  const [messages, setMessages] = useStateAI([
    { role: 'assistant',
      text: `你好呀铲屎官~ 我是${ASSISTANT_NAME} 🐾\n告诉我需求（比如"给糯米补点狗粮"），我直接帮你挑好方案，选一个就能下单。` }
  ]);
  const [input, setInput] = useStateAI('');
  const [loading, setLoading] = useStateAI(false);
  const [unread, setUnread] = useStateAI(0);
  const [pos, setPos] = useStateAI(readPos);
  const [dragging, setDragging] = useStateAI(false);
  const dragStateRef = useRefAI({ moved: false });
  const scrollRef = useRefAI(null);
  const inputRef = useRefAI(null);

  useEffectAI(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffectAI(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 200); }
  }, [open]);

  // 持久化位置
  useEffectAI(() => {
    try { localStorage.setItem('pawly.chatPos', JSON.stringify(pos)); } catch (e) {}
  }, [pos]);

  // 视口变化时夹紧
  useEffectAI(() => {
    const clamp = () => {
      setPos(p => ({
        x: Math.max(8, Math.min(window.innerWidth - 76, p.x)),
        y: Math.max(8, Math.min(window.innerHeight - 76, p.y)),
      }));
    };
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, []);

  const sendToAI = async (userText) => {
    const newMsgs = [...messages, { role: 'user', text: userText }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const claudeMessages = newMsgs.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text,
      }));
      const { reply, proposals } = await callAI(claudeMessages);
      setMessages(m => [...m, {
        role: 'assistant',
        text: reply || '抱歉，我刚走神了，再说一次？',
        proposals: proposals && proposals.length ? proposals : undefined,
      }]);
      if (!open) setUnread(u => u + 1);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', text: '哎呀，我这边网络有点问题。试试稍后再问我？' }]);
    } finally {
      setLoading(false);
    }
  };

  // 用户采用某个方案：把方案里的商品全部加入购物车，然后直奔结算
  const adoptProposal = (proposal) => {
    const all = window.PRODUCTS || [];
    const picked = (proposal.productIds || [])
      .map(id => all.find(p => p.id === id))
      .filter(Boolean);
    if (!picked.length) return;
    picked.forEach(p => onAdd && onAdd(p, 1));
    setMessages(m => [...m, {
      role: 'assistant',
      text: `已把【${proposal.title}】的 ${picked.length} 件商品加入购物车，正帮你跳转结算页，确认无误付款就好啦 🐾`,
    }]);
    setOpen(false);
    if (navigate) navigate({ page: 'checkout' });
    else if (onCartOpen) onCartOpen();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    sendToAI(text);
  };
  const handleQuick = (text) => { if (!loading) sendToAI(text); };

  // —— 拖拽逻辑：按下后超过 4px 才算拖动，否则按"点击切换" ——
  const onLauncherDown = (e) => {
    if (e.button !== 0) return;
    const startX = e.clientX, startY = e.clientY;
    const startPos = { ...pos };
    dragStateRef.current = { moved: false };

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragStateRef.current.moved && (Math.abs(dx) + Math.abs(dy) > 4)) {
        dragStateRef.current.moved = true;
        setDragging(true);
      }
      if (dragStateRef.current.moved) {
        setPos({
          x: Math.max(8, Math.min(window.innerWidth - 68, startPos.x + dx)),
          y: Math.max(8, Math.min(window.innerHeight - 68, startPos.y - dy)),
        });
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!dragStateRef.current.moved) {
        // 真正的点击 — 切换开关
        setOpen(o => !o);
      }
      setDragging(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // —— 面板拖拽（拖头部）——
  const onPanelDragDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startPos = { ...pos };
    const move = (ev) => {
      setPos({
        x: Math.max(8, Math.min(window.innerWidth - 68, startPos.x + (ev.clientX - startX))),
        y: Math.max(8, Math.min(window.innerHeight - 68, startPos.y - (ev.clientY - startY))),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDragging(false);
    };
    setDragging(true);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // 决定面板从启动器哪一侧弹出（避免出屏）
  const panelW = 380, panelH = 580;
  const panelLeft = (pos.x + panelW + 16 < window.innerWidth) ? pos.x : Math.max(8, window.innerWidth - panelW - 8);
  const panelBottom = pos.y + 76 + panelH < window.innerHeight ? pos.y + 76 : Math.max(8, pos.y);
  const panelTop = panelBottom + panelH > window.innerHeight - 8 ? Math.max(8, window.innerHeight - panelH - 8 - pos.y) : null;

  return (
    <>
      {/* Chat panel */}
      <div style={{
        position: 'fixed', left: panelLeft, bottom: panelBottom, zIndex: 79,
        width: `min(${panelW}px, calc(100vw - 32px))`,
        height: `min(${panelH}px, calc(100vh - 140px))`,
        background: 'var(--bg)',
        borderRadius: 24,
        boxShadow: '0 24px 64px -16px rgba(38,70,83,.30), 0 8px 16px rgba(0,0,0,.06)',
        border: '1px solid var(--line-2)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transformOrigin: 'bottom left',
        transform: open ? 'scale(1) translateY(0)' : 'scale(.92) translateY(12px)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: dragging ? 'none' : 'transform .25s cubic-bezier(.22,.61,.36,1), opacity .2s, left .25s, bottom .25s',
      }}>
        {/* Header（可拖动） */}
        <div onPointerDown={onPanelDragDown} style={{
          padding: '18px 20px', borderBottom: '1px solid var(--line-2)',
          background: 'var(--surface)',
          display: 'flex', alignItems: 'center', gap: 14,
          cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none',
          position: 'relative',
        }}>
          {/* drag handle hint */}
          <div style={{
            position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
            width: 32, height: 4, borderRadius: 999, background: 'var(--line)',
            opacity: .5,
          }}/>
          <div style={{
            position: 'relative',
            width: 42, height: 42, borderRadius: 12,
            background: 'var(--primary)', display: 'grid', placeItems: 'center',
            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,.08), 0 4px 10px -4px var(--primary)',
            color: 'white',
          }}>
            <PawIcon size={22} color="white" />
            <span style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 12, height: 12, borderRadius: 999,
              background: '#22C55E', border: '2px solid var(--surface)',
            }}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{ASSISTANT_NAME}</div>
            <div className="caption" style={{ fontSize: 11.5, marginTop: 1 }}>
              在线 · AI 驱动 · 拖动头部可移动
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="收起"
            style={{
              width: 32, height: 32, border: 0, borderRadius: 999,
              background: 'transparent', color: 'var(--ink-2)',
              display: 'grid', placeItems: 'center', cursor: 'pointer',
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{
          flex: 1, overflowY: 'auto', padding: '20px 18px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {messages.map((m, i) => (
            <React.Fragment key={i}>
              <Bubble role={m.role} text={m.text} />
              {m.proposals && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 36 }}>
                  {m.proposals.map((pr, j) => (
                    <ProposalCard key={j} proposal={pr} onAdopt={() => adoptProposal(pr)} />
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
          {loading && <TypingBubble />}

          {messages.length <= 1 && !loading && (
            <div style={{ marginTop: 12 }}>
              <div className="caption" style={{ marginBottom: 8, fontSize: 11 }}>试试这些：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_PROMPTS.map(q => (
                  <button key={q} onClick={() => handleQuick(q)}
                    style={{
                      height: 30, padding: '0 12px', borderRadius: 999,
                      border: '1px solid var(--line)',
                      background: 'var(--surface)', color: 'var(--ink)',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      transition: 'background .15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}
                  >{q}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '14px 16px 16px', borderTop: '1px solid var(--line-2)',
          background: 'var(--surface)',
        }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
            background: 'var(--bg)', borderRadius: 22,
            border: '1px solid var(--line)',
            padding: '6px 6px 6px 14px',
          }}>
            <textarea ref={inputRef} value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="问点什么吧... (Enter 发送)"
              rows={1}
              style={{
                flex: 1, resize: 'none', border: 0, outline: 'none',
                background: 'transparent', fontFamily: 'inherit',
                fontSize: 14, lineHeight: 1.4, color: 'var(--ink)',
                padding: '8px 0', maxHeight: 100,
              }}
            />
            <button onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label="发送"
              style={{
                width: 36, height: 36, borderRadius: 999, border: 0,
                background: (input.trim() && !loading) ? 'var(--primary)' : 'var(--surface-2)',
                color: (input.trim() && !loading) ? 'white' : 'var(--ink-3)',
                display: 'grid', placeItems: 'center',
                cursor: (input.trim() && !loading) ? 'pointer' : 'default',
                transition: 'all .15s',
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z"/>
              </svg>
            </button>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 8, fontSize: 11, color: 'var(--ink-3)',
          }}>
            <span>AI 回复仅供参考</span>
            <button style={{ background: 'none', border: 0, color: 'var(--ink-3)',
                             fontSize: 11, cursor: 'pointer', padding: 0 }}>
              联系人工客服 →
            </button>
          </div>
        </div>
      </div>

      {/* Floating launcher (draggable) */}
      <button onPointerDown={onLauncherDown}
        aria-label="打开宝莉助手 (可拖动)"
        title="点击打开 · 长按拖动"
        style={{
          position: 'fixed', left: pos.x, bottom: pos.y, zIndex: 80,
          width: 60, height: 60, borderRadius: 999,
          background: 'linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 70%, var(--accent) 30%))',
          color: 'white',
          border: 0,
          cursor: dragging ? 'grabbing' : 'grab',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 12px 32px -8px color-mix(in oklch, var(--primary) 60%, transparent), 0 4px 8px rgba(0,0,0,.10)',
          transition: dragging ? 'none' : 'transform .2s cubic-bezier(.22,.61,.36,1), left .2s, bottom .2s',
          transform: open ? 'scale(.92)' : 'scale(1)',
          touchAction: 'none',
        }}
        onMouseEnter={(e) => !open && !dragging && (e.currentTarget.style.transform = 'scale(1.06)')}
        onMouseLeave={(e) => !open && !dragging && (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6 18 18 M18 6 6 18"/>
          </svg>
        ) : (
          <PawIcon size={26} color="white" />
        )}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 20, height: 20, padding: '0 6px',
            borderRadius: 999, background: 'var(--accent)', color: '#2a1a0a',
            fontSize: 11, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg)',
          }}>{unread}</span>
        )}
      </button>
    </>
  );
}

function Bubble({ role, text }) {
  const isUser = role === 'user';
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'fadeUp .25s ease both',
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'var(--primary)', display: 'grid', placeItems: 'center',
          marginRight: 8, marginTop: 'auto', color: 'white',
        }}><PawIcon size={16} color="white" /></div>
      )}
      <div style={{
        maxWidth: '78%',
        padding: '10px 14px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? 'var(--ink)' : 'var(--surface)',
        color: isUser ? 'var(--bg)' : 'var(--ink)',
        fontSize: 13.5, lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        border: isUser ? 0 : '1px solid var(--line-2)',
        boxShadow: isUser ? 'none' : 'var(--shadow-sm)',
      }}>{text}</div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: 'var(--primary)', display: 'grid', placeItems: 'center', color: 'white',
      }}><PawIcon size={16} color="white" /></div>
      <div style={{
        padding: '12px 16px', borderRadius: '18px 18px 18px 4px',
        background: 'var(--surface)', border: '1px solid var(--line-2)',
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        <Dot delay={0}/><Dot delay={150}/><Dot delay={300}/>
      </div>
      <style>{`
        @keyframes bounceDot { 0%, 60%, 100%{transform: translateY(0); opacity:.4;} 30%{transform: translateY(-4px); opacity: 1;} }
      `}</style>
    </div>
  );
}
function Dot({ delay }) {
  return <span style={{
    width: 6, height: 6, borderRadius: 999, background: 'var(--ink-3)',
    display: 'inline-block',
    animation: `bounceDot 1.1s ${delay}ms infinite`,
  }}/>;
}

// ============ 商品方案卡 ============
function ProposalCard({ proposal, onAdopt }) {
  const all = window.PRODUCTS || [];
  const items = (proposal.productIds || []).map(id => all.find(p => p.id === id)).filter(Boolean);
  if (!items.length) return null;
  const total = items.reduce((s, p) => s + p.price, 0);
  const was = items.reduce((s, p) => s + (p.was || p.price), 0);

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 16, padding: 14, animation: 'fadeUp .25s ease both',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{proposal.title}</span>
        {proposal.badge && (
          <span style={{
            fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: 'var(--accent)', color: '#2a1a0a', whiteSpace: 'nowrap',
          }}>{proposal.badge}</span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {items.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: p.bg, display: 'grid', placeItems: 'center', fontSize: 18,
            }}>{p.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.sub}</div>
            </div>
            <div className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{fmt(p.price)}</div>
          </div>
        ))}
      </div>

      {proposal.reason && (
        <div style={{
          fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-2)',
          background: 'var(--bg)', borderRadius: 10, padding: '8px 10px', marginBottom: 10,
        }}>💡 {proposal.reason}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{fmt(total)}</span>
          {was > total && (
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textDecoration: 'line-through', marginLeft: 6 }}>{fmt(was)}</span>
          )}
        </div>
        <button onClick={onAdopt} className="btn btn-primary btn-sm">采用此方案 →</button>
      </div>
    </div>
  );
}

// ============ AI 调用层：后端接口 → Claude 运行时 → 本地 mock（三级回退） ============
// 真实 Key 放在后端（见 server.js）。配置好后端后，在 HTML 里设置
//   window.PAWLY_API_ENDPOINT = 'http://localhost:8787/api/chat'
// 即可切换到真 AI；不配置则用下面的演示 mock。
function extractJSON(str) {
  if (!str) return null;
  const cleaned = String(str).replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (e) {}
  const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
  if (s >= 0 && e > s) { try { return JSON.parse(cleaned.slice(s, e + 1)); } catch (_) {} }
  return null;
}

function normalizeAI(obj, rawText) {
  if (obj && typeof obj === 'object') {
    return { reply: obj.reply || rawText || '', proposals: Array.isArray(obj.proposals) ? obj.proposals : [] };
  }
  return { reply: rawText || '', proposals: [] };
}

async function callAI(messages) {
  const system = buildSystemPrompt();

  // 1) 优先走你自己的后端（Key 安全地放在服务端）
  if (window.PAWLY_API_ENDPOINT) {
    try {
      const r = await fetch(window.PAWLY_API_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages }),
      });
      const data = await r.json();
      if (data && (data.reply !== undefined || Array.isArray(data.proposals))) return normalizeAI(data);
      return normalizeAI(extractJSON(data.text), data.text);
    } catch (err) {
      // 后端没启动 / 网络不通：不要直接报错，降级到下面的运行时或本地 mock
      console.warn('[Pawly] 后端不可用，已降级演示模式。请确认已运行 node server.js。', err);
    }
  }

  // 2) Claude 运行时（仅 Anthropic 预览环境注入）
  if (window.claude && typeof window.claude.complete === 'function') {
    const raw = await window.claude.complete({ system, messages });
    return normalizeAI(extractJSON(raw), raw);
  }

  // 3) 本地 mock 演示兜底
  return mockAgent(messages[messages.length - 1]?.content || '');
}

// 演示用 mock：用真实商品库 + 宠物档案造出结构化方案，无需真 AI 即可走通全链路
async function mockAgent(text) {
  await new Promise(r => setTimeout(r, 700 + Math.random() * 700));
  const t = text || '';

  // 给狗补粮
  if ((/粮|吃|补/.test(t) && /(狗|糯米|柴犬)/.test(t)) || /狗粮|续粮/.test(t)) {
    return {
      reply: '懂啦！结合糯米（柴犬 3 岁 12kg、肠胃偏敏感、爱啃）我配了三套方案，从经济到周全，挑一个就能下单 🐶',
      proposals: [
        { title: '日常续粮 · 经济之选', badge: '性价比之选', productIds: ['p1'],
          reason: '冷压鲜粮无谷物、85% 鲜肉不上火，最护柴犬敏感肠胃，1.5kg 够糯米吃约半个月。' },
        { title: '续粮 + 训练零食', badge: '最受欢迎', productIds: ['p1', 'p3'],
          reason: '糯米 3 岁正活泼，加单一原料鸡胸肉条当训练奖励，低脂不怕长肉。' },
        { title: '续粮 + 啃咬护牙套餐', badge: '全面养护', productIds: ['p1', 'p15'],
          reason: '柴犬爱啃，牦牛奶酪磨牙棒既解咬欲又清洁牙齿，长远省一次洗牙钱。' },
      ],
    };
  }

  // 给猫控体重
  if (/芝麻|猫|英短/.test(t) && /(胖|减|控|体重|吃|粮)/.test(t)) {
    return {
      reply: '芝麻 5 岁英短偏胖要控热量~ 给你两套：高蛋白主食，按需加化毛膏，选一个就好 🐱',
      proposals: [
        { title: '高蛋白控脂主食', badge: '控体重之选', productIds: ['p2'],
          reason: '深海鱼冻干生骨肉高蛋白低碳水、带牛磺酸与化毛配方，适合易胖的室内猫。' },
        { title: '主食 + 化毛膏', badge: '全面养护', productIds: ['p2', 'p14'],
          reason: '英短易积毛球，三文鱼味化毛膏温和促排毛，配主食毛色更亮。' },
      ],
    };
  }

  // 纯咨询
  if (/订单/.test(t)) return { reply: '会员中心 > 我的订单 就能看到啦！想催发货把订单号发我，我帮你瞅瞅~', proposals: [] };
  if (/毛球|吐/.test(t)) return { reply: '猫吐毛球每周 1-2 次属正常，可喂化毛膏；但连续呕吐超 24h 一定要就医喔！', proposals: [] };
  if (/会员/.test(t)) return { reply: '¥29/月解锁：全场 9 折、月度免费体检、生日礼盒、专属客服~ 大概每月省一袋狗粮 🦴', proposals: [] };
  return { reply: '收到~ 你可以直接说"给糯米补点狗粮""芝麻有点胖怎么吃"，我马上帮你挑好方案。', proposals: [] };
}

window.ChatWidget = ChatWidget;
