// --- 文件 6: services/kuwoMusic.js (酷我音乐服务模块) ---
const axios = require('axios');

// 实现你提供的酷我音乐搜索逻辑
const search = async (keyword) => {
  const url = `http://search.kuwo.cn/r.s?pn=0&rn=10&rformat=json&vipver=1&mobi=1&encoding=utf8&ft=music&all=${encodeURIComponent(keyword)}`;
  try {
    const response = await axios.get(url);
    const apiData = response.data;
    
    if (!apiData || !Array.isArray(apiData.abslist)) {
      throw new Error('API 返回数据格式不正确');
    }

    // 遍历数据并格式化成我们需要的格式
    const formattedResult = apiData.abslist.map(item => {
      // 检查 web_albumpic_short 字段是否存在，如果不存在则返回空字符串
      const albumPic = item['web_albumpic_short'] || '';
      const cover_url = albumPic ? `https://img2.kuwo.cn/star/albumcover/${albumPic}` : '';

      return {
        id: item.DC_TARGETID,
        name: item.NAME,
        artist: item.ARTIST,
        cover_url: cover_url
      };
    });

    return {
      source: 'kuwo',
      keyword: keyword,
      result: formattedResult
    };

  } catch (error) {
    console.error(`酷我音乐搜索 API 请求失败: ${error.message}`);
    throw error;
  }
};

// 实现你提供的酷我音乐获取链接逻辑
const getlink = async (id, br) => {
  const bitrate = br || '20000knone';
  const url = `https://mobi.kuwo.cn/mobi.s?f=web&source=keluze&type=convert_url_with_sign&br=${bitrate}&rid=${id}`;
  const headers = { 'User-Agent': 'okhttp/3.10.0' };

  try {
    const response = await axios.get(url, { headers });
    let apiData;
    // 检查响应数据是否为字符串，如果是，则进行替换和解析
    if (typeof response.data === 'string') {
      let responseBody = response.data;
      responseBody = responseBody.replace(/\.sycdn/g, '-sycdn');
      apiData = JSON.parse(responseBody);
    } else {
      // 如果不是字符串，则认为已经是 JSON 对象
      apiData = response.data;
    }

    let songUrl = apiData.data.url;
    
    if (songUrl) {
      songUrl = songUrl.replace('http://', 'https://');
      songUrl = songUrl.replace(/\.sycdn/g, '-sycdn');
    }
    
    if (!songUrl) {
      throw new Error('API 返回的链接为空');
    }
    
    return songUrl;
  } catch (error) {
    console.error(`酷我音乐获取链接 API 请求失败: ${error.message}`);
    throw error;
  }
};

// 实现你提供的酷我音乐获取歌词逻辑
const getlyric = async (id) => {
  // 歌词格式化辅助函数，将秒数转换为 [mm:ss.xx] 格式
  const formatLrcTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = (timeInSeconds % 60).toFixed(2);
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `[${formattedMinutes}:${formattedSeconds}]`;
  };

  const url = `https://kuwo.cn/openapi/v1/www/lyric/getlyric?musicId=${id}`;

  try {
    const response = await axios.get(url);
    const apiData = response.data;

    if (!apiData || !apiData.data || !Array.isArray(apiData.data.lrclist)) {
      throw new Error('API 返回数据格式不正确或无歌词');
    }

    // 遍历数据并格式化成我们需要的 LRC 文本格式
    const lrcText = apiData.data.lrclist
      .map(item => {
        const time = formatLrcTime(item.time);
        return `${time}${item.lineLyric}`;
      })
      .join('\r\n');
      
    // 返回 JSON 对象，包含歌词文本
    return {
      source: 'kuwo',
      id: id,
      lyric: lrcText
    };
  } catch (error) {
    console.error(`酷我音乐获取歌词 API 请求失败: ${error.message}`);
    throw error;
  }
};

module.exports = { search, getlink, getlyric };