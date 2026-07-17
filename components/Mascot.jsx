// 宝莉助手吉祥物：原创狸花猫（SVG + CSS 动画，动画定义在 globals.css）
// 状态：idle（眨眼/耳朵抖/尾巴摇/轻微点头）、thinking（歪头）、wave（挥爪，悬停或问候时）
// 全部为原创绘制，无第三方素材版权问题；后续若有设计稿 Lottie，可直接替换本组件。

const C = {
  fur: '#C89B6B',      // 底毛：暖棕
  furDark: '#7E5A3C',  // 虎斑纹
  cream: '#F6E9D4',    // 口鼻/胸口奶油色
  earIn: '#E8A79E',    // 耳内粉
  nose: '#D9857A',
  eye: '#33261B',
};

export function CatMascot({ size = 60, thinking = false, wave = false }) {
  return (
    <svg
      className={`cat-mascot${thinking ? ' thinking' : ''}${wave ? ' wave' : ''}`}
      width={size} height={size} viewBox="0 0 72 72" fill="none" aria-hidden="true"
      style={{ overflow: 'visible', display: 'block' }}
    >
      {/* 尾巴：从身后靠下的位置探出来，左右慢摇 */}
      <path className="cat-tail" d="M52 61 C65 61 70 53 67 44 C73 54 68 66 52 66 Z" fill={C.fur} />
      <path className="cat-tail" d="M65 48 l4.5 -1.5 M66.5 54 l4.5 -0.5" stroke={C.furDark} strokeWidth="2" strokeLinecap="round" />

      <g className="cat-head">
        {/* 耳朵 */}
        <g>
          <path d="M13 22 L18 4 L31 13 Z" fill={C.fur} />
          <path d="M16.5 18 L19.5 8.5 L26.5 13.5 Z" fill={C.earIn} />
        </g>
        <g className="cat-ear-r">
          <path d="M59 22 L54 4 L41 13 Z" fill={C.fur} />
          <path d="M55.5 18 L52.5 8.5 L45.5 13.5 Z" fill={C.earIn} />
        </g>

        {/* 脸 */}
        <ellipse cx="36" cy="40" rx="24" ry="21" fill={C.fur} />

        {/* 额头 M 字虎斑（狸花猫标志） */}
        <path d="M27 21 Q26 27 27.5 31" stroke={C.furDark} strokeWidth="3" strokeLinecap="round" />
        <path d="M36 19 Q36 26 36 31" stroke={C.furDark} strokeWidth="3" strokeLinecap="round" />
        <path d="M45 21 Q46 27 44.5 31" stroke={C.furDark} strokeWidth="3" strokeLinecap="round" />

        {/* 脸颊虎斑 */}
        <path d="M13.5 38 h6" stroke={C.furDark} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M14.5 44 h5" stroke={C.furDark} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M58.5 38 h-6" stroke={C.furDark} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M57.5 44 h-5" stroke={C.furDark} strokeWidth="2.4" strokeLinecap="round" />

        {/* 口鼻 */}
        <ellipse cx="36" cy="50" rx="11.5" ry="8" fill={C.cream} />

        {/* 眼睛（整组做眨眼缩放） */}
        <g className="cat-eyes">
          <ellipse cx="27" cy="40" rx="3.4" ry="4.2" fill={C.eye} />
          <circle cx="28.1" cy="38.6" r="1.1" fill="#fff" />
          <ellipse cx="45" cy="40" rx="3.4" ry="4.2" fill={C.eye} />
          <circle cx="46.1" cy="38.6" r="1.1" fill="#fff" />
        </g>

        {/* 鼻子 + ω 嘴 */}
        <path d="M33.6 46.5 h4.8 L36 49.6 Z" fill={C.nose} />
        <path d="M36 49.6 q-1.4 3 -4.2 2.4 M36 49.6 q1.4 3 4.2 2.4" stroke={C.furDark} strokeWidth="1.6" strokeLinecap="round" />

        {/* 胡须 */}
        <path d="M9 46 l9 1.6 M10 52 l8 -0.6" stroke="rgba(255,255,255,.85)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M63 46 l-9 1.6 M62 52 l-8 -0.6" stroke="rgba(255,255,255,.85)" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* 挥手的小爪子：默认藏起来，悬停/问候时举起来摇 */}
      <g className="cat-paw">
        <ellipse cx="60" cy="55" rx="6.5" ry="7.5" fill={C.fur} />
        <path d="M56 51 v5 M60 50 v6 M64 51 v5" stroke={C.furDark} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
