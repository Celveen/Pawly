/**
 * 图片选择与压缩：小程序侧的等价实现。
 * 网页端用 canvas 压到最长边 1080 / 质量 0.78 再转 base64，
 * 这里用 wx.compressImage + FileSystemManager.readFile('base64')，
 * 最终同样以 data:image/jpeg;base64,... 的形式发给 /api/posts。
 */
const MAX_BYTES = 600 * 1024; // 与后端一致的单张上限

function toBase64(path) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath: path,
      encoding: 'base64',
      success: (res) => resolve(`data:image/jpeg;base64,${res.data}`),
      fail: reject,
    });
  });
}

function compress(path, quality = 78) {
  return new Promise((resolve) => {
    if (!wx.compressImage) return resolve(path);
    wx.compressImage({
      src: path,
      quality,
      compressedWidth: 1080,
      success: (res) => resolve(res.tempFilePath),
      fail: () => resolve(path), // 压不了就用原图，后端还有一层兜底
    });
  });
}

/**
 * 选图并转成 base64 数组
 * @param {number} count 还能再选几张
 */
function pickImages(count = 9) {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        try {
          const out = [];
          // 串行处理：并发压图在低端机上容易把内存打满
          /* eslint-disable no-restricted-syntax, no-await-in-loop */
          for (const f of res.tempFiles) {
            let path = f.tempFilePath;
            if (f.size > MAX_BYTES) path = await compress(path);
            out.push(await toBase64(path));
          }
          /* eslint-enable no-restricted-syntax, no-await-in-loop */
          resolve(out);
        } catch (e) {
          reject(e);
        }
      },
      fail: (e) => {
        // 用户主动取消不算错误
        if (e && String(e.errMsg || '').indexOf('cancel') >= 0) resolve([]);
        else reject(e);
      },
    });
  });
}

/** 选单张方形图（头像用） */
function pickAvatar() {
  return pickImages(1).then((list) => list[0] || '');
}

module.exports = { pickImages, pickAvatar, toBase64, compress };
