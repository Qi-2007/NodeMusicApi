// --- 文件 5: services/neteaseMusic.js (网易云音乐服务模块) ---
const axios = require('axios');
const crypto = require('crypto'); // 导入 Node.js 内置的 crypto 模块

/**
 * 根据网易云音乐的 pic_id 生成图片链接。
 * 此函数是将易语言代码逻辑转换为 JavaScript 实现。
 * @param {string|number} id 网易云音乐的图片ID。
 * @returns {string} 格式化的图片URL。
 */
const wy_pic = (id) => {
  // 1. 处理输入ID，确保是字符串且无首尾空格
  const picId = String(id).trim();

  // 2. 固定密钥
  const key = '3go8&$8*3*3h0k(2)2';
  const keyLen = key.length;
  const idLen = picId.length;

  // 3. 异或加密（直接生成字节集）
  const xorData = Buffer.alloc(idLen);
  for (let i = 0; i < idLen; i++) {
    const idCharCode = picId.charCodeAt(i);
    const keyCharCode = key.charCodeAt(i % keyLen);
    xorData[i] = idCharCode ^ keyCharCode;
  }

  // 4. 获取MD5的16进制文本，并还原为二进制
  const md5Hex = crypto.createHash('md5').update(xorData).digest('hex');

  // 5. Base64编码（对原始二进制编码）
  // 易语言中是先转HEX再转字节集，Node.js 可以直接从HEX字符串生成Buffer
  let base64 = Buffer.from(md5Hex, 'hex').toString('base64');
  base64 = base64.replace(/\//g, '_').replace(/\+/g, '-');

  // 6. 生成最终URL
  return `http://p1.music.126.net/${base64}/${picId}.jpg?param=320y320`;
};

// 实现你提供的网易云音乐搜索逻辑
const search = async (keyword) => {
  const url = `https://music-api.gdstudio.xyz/api.php?types=search&count=10&pages=1&source=netease&name=${encodeURIComponent(keyword)}`;
  try {
    const response = await axios.get(url);
    const apiData = response.data;

    if (!Array.isArray(apiData)) {
      throw new Error('API 返回数据格式不正确');
    }

    const formattedResult = apiData.map(item => {
      const artist = item.artist.join(' & ');
      return {
        id: item.id,
        name: item.name,
        artist: artist,
        // 使用新的 wy_pic 函数来生成封面图 URL
        cover_url: wy_pic(item.pic_id)
      };
    });

    return {
      source: 'netease',
      keyword: keyword,
      result: formattedResult
    };

  } catch (error) {
    console.error(`网易云音乐搜索 API 请求失败: ${error.message}`);
    throw error;
  }
};

// 实现你提供的网易云音乐获取链接逻辑
const getlink = async (id, br) => {
  let bitrate = br || '999';
  bitrate = bitrate.replace('kmp3', '').replace('2000kflac', '999');

  const url = `https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=${id}&br=${bitrate}`;

  try {
    const response = await axios.get(url);
    const apiData = response.data;
    const songUrl = apiData.url;

    if (!songUrl) {
      throw new Error('API 返回的链接为空');
    }
    
    return songUrl;
  } catch (error) {
    console.error(`网易云音乐获取链接 API 请求失败: ${error.message}`);
    throw error;
  }
};

// 实现你提供的网易云音乐获取歌词逻辑
const getlyric = async (id) => {
  // 根据你的 URL 构建请求
  const url = `https://music.163.com/api/song/lyric?_nmclfl=1&tv=-1&lv=-1&rv=-1&kv=-1&id=${id}`;

  try {
    const response = await axios.get(url);
    const apiData = response.data;
    
    // 检查返回数据是否有效
    if (!apiData?.lrc?.lyric) {
      throw new Error('API 返回数据格式不正确或无歌词');
    }
    
    // 返回 JSON 对象，包含歌词文本
    return {
      source: 'netease',
      id: id,
      lyric: apiData.lrc.lyric
    };
  } catch (error) {
    console.error(`网易云音乐获取歌词 API 请求失败: ${error.message}`);
    throw error;
  }
};

module.exports = { search, getlink, getlyric };