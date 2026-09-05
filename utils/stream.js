/**
 * AI 流式对话：走网页端同一个 SSE 接口 /api/chat/stream。
 *
 * 小程序里没有 fetch / ReadableStream，用 wx.request 的 enableChunked
 * （基础库 >= 2.20.2）+ onChunkReceived 拿分片，再自己解 UTF-8 和 SSE。
 * 任何一步走不通都 reject，由调用方回落到非流式的 /api/chat。
 */
const config = require('../config');
const { getUid } = require('../api/request');

/* eslint-disable no-bitwise -- 手写 UTF-8 解码，位运算无法避免 */
/** ArrayBuffer → UTF-8 字符串（小程序没有 TextDecoder） */
function utf8Decode(buffer) {
  const bytes = new Uint8Array(buffer);
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) { out += String.fromCharCode(b); i += 1; }
    else if (b >= 0xc0 && b < 0xe0) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if (b >= 0xe0 && b < 0xf0) {
      out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
      i += 3;
    } else {
      // 四字节（emoji 等）：转成代理对
      const cp = ((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f);
      const v = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff));
      i += 4;
    }
  }
  return out;
}
/* eslint-enable no-bitwise */

/**
 * @param {Array} messages 对话历史
 * @param {{onDelta:Function,onReset:Function}} handlers
 * @returns {Promise<{reply:string,proposals:Array}>}
 */
function chatStream(messages, handlers) {
  return new Promise((resolve, reject) => {
    if (config.useMock) return reject(new Error('mock 模式不走流式'));

    let buffer = '';
    let final = null;
    let errored = '';
    let settled = false;

    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      fn(arg);
    };

    let task;
    try {
      task = wx.request({
        url: `${config.baseUrl}/api/chat/stream`,
        method: 'POST',
        enableChunked: true,
        timeout: config.chatTimeout,
        header: { 'content-type': 'application/json', 'x-pawly-uid': getUid() },
        data: { messages },
        success() {
          if (final) finish(resolve, final);
          else finish(reject, new Error(errored || '回复没收全'));
        },
        fail() {
          finish(reject, new Error(errored || '网络中断'));
        },
      });
    } catch (e) {
      return reject(e);
    }

    if (!task || typeof task.onChunkReceived !== 'function') {
      try { task && task.abort(); } catch (e) { /* 基础库太老，直接回落 */ }
      return reject(new Error('当前基础库不支持流式'));
    }

    task.onChunkReceived((res) => {
      buffer += utf8Decode(res.data);
      let sep = buffer.indexOf('\n\n');
      while (sep >= 0) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const line = raw.split('\n').filter((l) => l.indexOf('data:') === 0)[0];
        if (line) {
          const payload = line.slice(5).trim();
          if (payload && payload !== '[DONE]') {
            let evt = null;
            try { evt = JSON.parse(payload); } catch (e) { evt = null; }
            if (evt) {
              if (evt.type === 'reply.delta' && evt.data && evt.data.chunk) handlers.onDelta(evt.data.chunk);
              else if (evt.type === 'reply.reset') handlers.onReset();
              else if (evt.type === 'run.complete') final = evt.data;
              else if (evt.type === 'run.error') errored = (evt.data && evt.data.message) || 'AI 暂时不可用';
            }
          }
        }
        sep = buffer.indexOf('\n\n');
      }
    });
  });
}

module.exports = { chatStream, utf8Decode };
