// 视频位：把 AI 生成的视频放到 public/videos/<name>.mp4 即自动铺满播放（静音循环）；
// 素材缺失或加载失败时，回退到会流动的"光流"渐变占位（aurora，样式见 globals.css）。
// overlay 用于压一层渐变保证文字可读性。提示词清单见 docs/视频素材清单与生成提示词.md
import { useState } from 'react';

export function VideoSlot({ name, overlay, style }) {
  const [hasVideo, setHasVideo] = useState(true);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="video-slot" aria-hidden style={style}>
      {/* 光流占位：视频未就绪时始终在动 */}
      {!loaded && (
        <div className="aurora">
          <span className="a a1" /><span className="a a2" /><span className="a a3" /><span className="a a4" />
        </div>
      )}
      {hasVideo && (
        <video
          src={`/videos/${name}.mp4`}
          autoPlay muted loop playsInline preload="metadata"
          onError={() => setHasVideo(false)}
          onLoadedData={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity .9s ease' }}
        />
      )}
      {overlay && <div style={{ position: 'absolute', inset: 0, background: overlay }} />}
    </div>
  );
}
