// 宝莉助手吉祥物：坐姿奶油虎斑猫（按品牌插画稿矢量重绘，SVG + CSS 动画，动画在 globals.css）
// 状态：idle（眨眼/抖耳/尾巴摇/轻微点头）、thinking（歪头）、greet（问候/悬停：摇头+双耳摆动）
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

export function CatMascot({ size = 60, thinking = false, greet = false }) {
  return (
    <svg
      className={`cat-mascot${thinking ? ' thinking' : ''}${greet ? ' greet' : ''}`}
      width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true"
      style={{ overflow: 'visible', display: 'block' }}
    >
      {/* 底影 */}
      <ellipse cx="40" cy="71.5" rx="27" ry="4.5" fill={C.shadow} opacity=".5" />

      {/* 条纹尾巴：起点藏在身体后，向上翘起，圆头；条纹用同路径虚线叠加，不会溢出轮廓 */}
      <g className="cat-tail">
        <path d="M52 62 C62 64 68 58 67 48" stroke={C.body} strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M52 62 C62 64 68 58 67 48" stroke={C.stripe} strokeWidth="8" strokeLinecap="butt" fill="none" strokeDasharray="3.5 6.5" strokeDashoffset="-5" />
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

      {/* 头（点头 / 思考歪头 / 问候摇头） */}
      <g className="cat-head">
        {/* 耳朵：高高的三角耳，问候时左右耳交替摆动 */}
        <g className="cat-ear-l">
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

        {/* 白口鼻：居中的小块，避免左脸大面积发白 */}
        <ellipse cx="34" cy="27" rx="8.5" ry="5.2" fill={C.white} />

        {/* 眼睛（整组眨眼） */}
        <g className="cat-eyes">
          <ellipse cx="27" cy="20.5" rx="2" ry="2.9" fill={C.eye} />
          <ellipse cx="41" cy="20.5" rx="2" ry="2.9" fill={C.eye} />
        </g>

        {/* 鼻子 */}
        <path d="M31.9 25 h4.2 L34 27.4 Z" fill={C.nose} />
      </g>
    </svg>
  );
}
