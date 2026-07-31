// 用静态图片渲染 emoji，替代依赖操作系统/浏览器字体的原生 emoji 渲染。
// 原生 emoji 在 Windows/安卓/微信内置浏览器上样式互不相同（甚至缺字变方框），
// 图片版本在所有平台、所有设备上像素级一致。
// 图集来自 Microsoft Fluent Emoji 3D 版（MIT 协议，可商用，许可证见
// /public/emoji/LICENSE.txt），立体光泽质感接近 Apple 风格。
// 已按需导出到 /public/emoji/，前端直接引用静态文件，不经过任何接口。
import EMOJI_MAP from '@/lib/emoji-map.json';

export function Emoji({ text, size = 20, style, className }) {
  const file = EMOJI_MAP[text];
  // 未导出过的新 emoji：先原样渲染文字兜底，导出对应图片后自动切换，不会报错
  if (!file) return <span style={{ fontSize: size, lineHeight: 1, ...style }}>{text}</span>;
  return (
    <img
      src={`/emoji/${file}.png`}
      alt={text}
      draggable={false}
      className={className}
      style={{ width: size, height: size, verticalAlign: '-15%', display: 'inline-block', objectFit: 'contain', ...style }}
    />
  );
}
