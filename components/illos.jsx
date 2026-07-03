// 扁平插画库：替代 emoji 的全站统一视觉（色板与设计系统一致）。
// 用法：<Illo id="dog" size={72} />；id 未收录时回退渲染原字符（兼容旧数据里存的 emoji）。
const INK = '#264653';
const INK_SOFT = 'rgba(38,70,83,.18)';
const ACCENT = '#F4A261';
const BLUE = '#7BA7BC';
const CREAM = '#FFF7EC';
const WHITE = '#FFFFFF';

// 每个插画画在 96×96 画布上，底部统一一个柔和投影椭圆
const Shadow = () => <ellipse cx="48" cy="84" rx="26" ry="5" fill={INK_SOFT} opacity=".5" />;

const ILLOS = {
  dog: (
    <>
      <Shadow />
      {/* 垂耳 */}
      <path d="M22 34c-6 4-8 16-4 24 3 6 10 7 12 2L34 40l-12-6Z" fill={ACCENT} />
      <path d="M74 34c6 4 8 16 4 24-3 6-10 7-12 2L62 40l12-6Z" fill={ACCENT} />
      {/* 头 */}
      <circle cx="48" cy="46" r="26" fill={CREAM} stroke={INK} strokeWidth="2.5" />
      {/* 眼 */}
      <circle cx="39" cy="42" r="3" fill={INK} />
      <circle cx="57" cy="42" r="3" fill={INK} />
      {/* 鼻口 */}
      <ellipse cx="48" cy="55" rx="11" ry="9" fill={WHITE} stroke={INK} strokeWidth="2" />
      <ellipse cx="48" cy="51" rx="4.5" ry="3.5" fill={INK} />
      <path d="M48 55v4" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* 舌头 */}
      <path d="M44 62c0 4 2 6 4 6s4-2 4-6h-8Z" fill={ACCENT} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
  cat: (
    <>
      <Shadow />
      {/* 尖耳 */}
      <path d="M28 34 24 16l16 8-12 10Z" fill={BLUE} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M68 34l4-18-16 8 12 10Z" fill={BLUE} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {/* 头 */}
      <circle cx="48" cy="48" r="25" fill={CREAM} stroke={INK} strokeWidth="2.5" />
      {/* 眼（眯眯眼） */}
      <path d="M36 46c2-2.5 5-2.5 7 0M53 46c2-2.5 5-2.5 7 0" stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* 鼻嘴 */}
      <path d="M45 54h6l-3 4-3-4Z" fill={ACCENT} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M48 58v3m0 0c-1.5 2.5-4 3-6 2m6-2c1.5 2.5 4 3 6 2" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* 胡须 */}
      <path d="M22 52h9M23 58l8-2M74 52h-9M73 58l-8-2" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  paw: (
    <>
      <Shadow />
      {/* 掌垫 */}
      <path d="M48 42c11 0 19 7 19 16 0 8-6 14-19 14S29 66 29 58c0-9 8-16 19-16Z" fill={ACCENT} stroke={INK} strokeWidth="2.5" />
      {/* 趾垫 */}
      <ellipse cx="30" cy="38" rx="6.5" ry="8" fill={BLUE} stroke={INK} strokeWidth="2.5" />
      <ellipse cx="43" cy="29" rx="6.5" ry="8.5" fill={BLUE} stroke={INK} strokeWidth="2.5" />
      <ellipse cx="57" cy="30" rx="6.5" ry="8.5" fill={BLUE} stroke={INK} strokeWidth="2.5" />
      <ellipse cx="68" cy="40" rx="6" ry="7.5" fill={BLUE} stroke={INK} strokeWidth="2.5" />
    </>
  ),
  bone: (
    <>
      <Shadow />
      <path d="M32 40a8 8 0 0 0-8-6 8 8 0 0 0-4 15 8 8 0 0 0 4 15 8 8 0 0 0 8-6l32-8a8 8 0 0 0 8 6 8 8 0 0 0 4-15 8 8 0 0 0-4-15 8 8 0 0 0-8 6l-32 8Z"
        fill={CREAM} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" transform="rotate(-8 48 48)" />
    </>
  ),
  yarn: (
    <>
      <Shadow />
      <circle cx="46" cy="48" r="24" fill={BLUE} stroke={INK} strokeWidth="2.5" />
      <path d="M25 40c14-6 28-6 42 0M24 52c15 7 29 7 44 0M36 26c-6 13-6 30 0 43M56 26c6 13 6 30 0 43"
        stroke={INK} strokeWidth="1.8" fill="none" opacity=".55" />
      {/* 拖出的线头 */}
      <path d="M68 60c8 4 10 10 6 16-3 5-10 5-14 2" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  bath: (
    <>
      <Shadow />
      {/* 浴盆 */}
      <path d="M22 48h52v6c0 12-9 20-26 20S22 66 22 54v-6Z" fill={BLUE} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="18" y="44" width="60" height="7" rx="3.5" fill={WHITE} stroke={INK} strokeWidth="2.5" />
      {/* 泡泡 */}
      <circle cx="34" cy="34" r="6" fill={CREAM} stroke={INK} strokeWidth="2" />
      <circle cx="48" cy="27" r="8" fill={CREAM} stroke={INK} strokeWidth="2" />
      <circle cx="62" cy="35" r="5" fill={CREAM} stroke={INK} strokeWidth="2" />
      <circle cx="50" cy="25" r="2" fill={WHITE} />
    </>
  ),
  food: (
    <>
      <Shadow />
      {/* 碗 */}
      <path d="M22 50h52c0 14-10 24-26 24S22 64 22 50Z" fill={ACCENT} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M30 62h36" stroke={INK} strokeWidth="1.8" opacity=".35" />
      {/* 粮 */}
      <circle cx="38" cy="44" r="5.5" fill={CREAM} stroke={INK} strokeWidth="2" />
      <circle cx="50" cy="40" r="5.5" fill={CREAM} stroke={INK} strokeWidth="2" />
      <circle cx="60" cy="45" r="5" fill={CREAM} stroke={INK} strokeWidth="2" />
      <circle cx="46" cy="48" r="5" fill={CREAM} stroke={INK} strokeWidth="2" />
    </>
  ),
  ball: (
    <>
      <Shadow />
      <circle cx="48" cy="48" r="26" fill={ACCENT} stroke={INK} strokeWidth="2.5" />
      <path d="M27 33c10 9 10 21 0 30M69 33c-10 9-10 21 0 30" stroke={WHITE} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="40" cy="38" r="3" fill={WHITE} opacity=".7" />
    </>
  ),
  vet: (
    <>
      <Shadow />
      {/* 爱心 */}
      <path d="M48 76 26 54c-6-6-6-16 0-21 6-6 15-5 22 3 7-8 16-9 22-3 6 5 6 15 0 21L48 76Z"
        fill={BLUE} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {/* 医疗十字 */}
      <path d="M44 38h8v6h6v8h-6v6h-8v-6h-6v-8h6v-6Z" fill={WHITE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
  camera: (
    <>
      <Shadow />
      <rect x="20" y="34" width="56" height="38" rx="8" fill={BLUE} stroke={INK} strokeWidth="2.5" />
      <path d="M38 34l4-8h12l4 8" fill={BLUE} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="48" cy="52" r="12" fill={CREAM} stroke={INK} strokeWidth="2.5" />
      <circle cx="48" cy="52" r="6" fill={ACCENT} stroke={INK} strokeWidth="2" />
      <circle cx="67" cy="42" r="2.5" fill={CREAM} />
    </>
  ),
  heart: (
    <>
      <Shadow />
      <path d="M48 76 26 54c-6-6-6-16 0-21 6-6 15-5 22 3 7-8 16-9 22-3 6 5 6 15 0 21L48 76Z"
        fill={ACCENT} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {/* 小爪印 */}
      <ellipse cx="43" cy="47" rx="3" ry="4" fill={WHITE} transform="rotate(-15 43 47)" />
      <ellipse cx="53" cy="47" rx="3" ry="4" fill={WHITE} transform="rotate(15 53 47)" />
      <path d="M48 52c4.5 0 7 2.8 7 5.5 0 2.6-2.3 4.5-7 4.5s-7-1.9-7-4.5c0-2.7 2.5-5.5 7-5.5Z" fill={WHITE} />
    </>
  ),
  home: (
    <>
      <Shadow />
      <path d="M24 46 48 24l24 22v26a4 4 0 0 1-4 4H28a4 4 0 0 1-4-4V46Z" fill={CREAM} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18 48 48 20l30 28" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* 拱形门 + 爪印 */}
      <path d="M40 76V60a8 8 0 0 1 16 0v16" fill={BLUE} stroke={INK} strokeWidth="2.5" />
      <ellipse cx="45.5" cy="63" rx="1.6" ry="2.2" fill={WHITE} />
      <ellipse cx="50.5" cy="63" rx="1.6" ry="2.2" fill={WHITE} />
      <path d="M48 66c2.3 0 3.6 1.4 3.6 2.8 0 1.3-1.2 2.2-3.6 2.2s-3.6-.9-3.6-2.2c0-1.4 1.3-2.8 3.6-2.8Z" fill={WHITE} />
    </>
  ),
};

export const ILLO_IDS = Object.keys(ILLOS);

export function Illo({ id, size = 72, style }) {
  const art = ILLOS[id];
  // 未收录的 id（如旧帖存的原始 emoji）直接按字符渲染，向后兼容
  if (!art) return <span style={{ fontSize: size * 0.75, lineHeight: 1, ...style }}>{id}</span>;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true" style={style}>
      {art}
    </svg>
  );
}
