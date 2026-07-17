// 宝莉助手吉祥物：坐姿奶油虎斑猫（按品牌插画稿矢量重绘，SVG + CSS 动画，动画在 globals.css）
// 状态：idle（眨眼/抖耳/尾巴摇/轻微点头）、thinking（歪头）、wave（举爪打招呼）
// 原创矢量绘制，无第三方素材版权问题；后续若有 Lottie 设计稿可直接替换本组件。

const C = {
  body: '#F0E1C4',     // 奶油底色
  stripe: '#A2907B',   // 灰棕虎斑
  earIn: '#B3A28C',    // 耳内
  white: '#FDFCF9',    // 胸口/口鼻/爪尖
  shadow: '#A7AACB',   // 淡紫底影
  eye: '#3B352C',
  nose: '#4A423A',
};

export function CatMascot({ size = 60, thinking = false, wave = false }) {
  return (
    <svg
      className={`cat-mascot${thinking ? ' thinking' : ''}${wave ? ' wave' : ''}`}
      width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true"
      style={{ overflow: 'visible', display: 'block' }}
    >
      {/* 底影 */}
      <ellipse cx="40" cy="71.5" rx="27" ry="4.5" fill={C.shadow} opacity=".5" />

      {/* 条纹尾巴：绕到身前，缓慢摆动 */}
      <g className="cat-tail">
        <path d="M52 69 C64 70 71 63 69 52 C75 63 70 74 50 74 Z" fill={C.body} />
        <path d="M66 56 l4.5 -2 M66.5 61.5 l5 -0.8 M64 66.5 l4.5 0.6" stroke={C.stripe} strokeWidth="2.6" strokeLinecap="round" />
      </g>

      {/* 身体 */}
      <g>
        <path d="M28 32 C18 42 16 59 21.5 69.5 C30 71.5 51 71.5 58.5 69.5 C62.5 54 56 40 45 33 Z" fill={C.body} />
        {/* 背部虎斑（保持在身体轮廓内） */}
        <path d="M44 42.5 l8 -4.5" stroke={C.stripe} strokeWidth="3" strokeLinecap="round" />
        <path d="M46.5 50.5 l8.5 -3.5" stroke={C.stripe} strokeWidth="3" strokeLinecap="round" />
        <path d="M47.5 58.5 l8.5 -2" stroke={C.stripe} strokeWidth="3" strokeLinecap="round" />
        {/* 白胸口，一直延伸到前爪 */}
        <path d="M27 33 C22.5 45 23.5 60 29 68.5 C36 66 39.5 51 36.5 39 Z" fill={C.white} />
        {/* 前爪 */}
        <ellipse cx="30" cy="68" rx="5.6" ry="4.2" fill={C.white} />
        <ellipse cx="41" cy="68.5" rx="5.2" ry="3.9" fill={C.white} />
      </g>

      {/* 头（点头 / 思考时歪头） */}
      <g className="cat-head">
        {/* 耳朵：高高的三角耳，尖端深色 */}
        <g>
          <path d="M21 15 L23.5 1 L34 8.5 Z" fill={C.body} />
          <path d="M22.2 10.5 L23.5 3.5 L28.8 7.3 Z" fill={C.earIn} />
        </g>
        <g className="cat-ear-r">
          <path d="M47 15 L44.5 1 L34 8.5 Z" fill={C.body} />
          <path d="M45.8 10.5 L44.5 3.5 L39.2 7.3 Z" fill={C.earIn} />
        </g>

        {/* 脸 */}
        <ellipse cx="34" cy="20.5" rx="15.5" ry="13" fill={C.body} />

        {/* 额头虎斑 */}
        <path d="M28.5 9.5 L27 16" stroke={C.stripe} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M34 8.5 L34 15.5" stroke={C.stripe} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M39.5 9.5 L41 16" stroke={C.stripe} strokeWidth="2.6" strokeLinecap="round" />

        {/* 白口鼻（与胸口相连的感觉） */}
        <path d="M21 24 C23 31.5 31 34 38 33 C44 32 47.5 28.5 48.5 24.5 C44 30 25 31 21 24 Z" fill={C.white} />
        <ellipse cx="33" cy="27.5" rx="10.5" ry="5.8" fill={C.white} />

        {/* 眼睛（整组眨眼） */}
        <g className="cat-eyes">
          <ellipse cx="27" cy="20.5" rx="2" ry="2.9" fill={C.eye} />
          <ellipse cx="41" cy="20.5" rx="2" ry="2.9" fill={C.eye} />
        </g>

        {/* 鼻子 */}
        <path d="M31.9 25 h4.2 L34 27.4 Z" fill={C.nose} />
      </g>

      {/* 挥手的小爪：默认藏起，悬停/问候时举起摇动（白爪尖，与前爪呼应） */}
      <g className="cat-paw">
        <path d="M54 44 C54 38 59 34 64 36 C68 38 68 44 64 46 L56 49 Z" fill={C.body} />
        <ellipse cx="62" cy="38.5" rx="4.2" ry="3.4" fill={C.white} transform="rotate(-30 62 38.5)" />
      </g>
    </svg>
  );
}
