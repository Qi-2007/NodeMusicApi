// qqMusicService.js

const axios = require('axios'); // 使用 axios 库进行网络请求

// 生成随机的 uin 和 guid，用于请求头部
const UIN = '5858511312'; // 根据用户要求修改为固定值
const GUID = 'AllByQi666114514'; // 固定 GUID

// QQ音乐 API 的基础 URL
const API_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
const LYRIC_API_URL = 'https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg';

/**
 * 创建搜索请求的 JSON 数据
 * @param {string} musicName 歌曲名称
 * @returns {object} JSON 请求对象
 */
const createSearchRequest = (musicName) => ({
    comm: { ct: '19', cv: '1882', uin: UIN },
    searchMusic: {
        method: 'DoSearchForQQMusicDesktop',
        module: 'music.search.SearchCgiService',
        param: { grp: '1', num_per_page: '1', page_num: '1', query: musicName, search_type: '0' },
    },
});

/**
 * 搜索歌曲
 * @param {string} keyword 歌曲关键词
 * @returns {Promise<object>} 包含歌曲列表和元数据的统一格式对象
 */
const search = async (keyword) => {
    console.log(`调用 QQ 音乐搜索 API，关键词: ${keyword}`);
    const searchRequest = createSearchRequest(keyword);
    // 修复：使用 encodeURIComponent 编码整个 JSON 字符串，解决中文搜索失败的问题
    const url = `${API_URL}?data=${encodeURIComponent(JSON.stringify(searchRequest))}`;

    // 使用 axios 进行 GET 请求，axios 自动解析 JSON
    const searchResult = await axios.get(url, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 Safari/537.36',
            'referer': 'https://y.qq.com/',
        },
    });

    const songList = searchResult.data.searchMusic?.data?.body?.song?.list;
    if (!songList || songList.length === 0) {
        throw new Error('未找到歌曲。');
    }
    
    // 遍历数据并模仿酷我模块格式化成我们需要的格式
    const formattedResult = songList.map(item => {
        const pmid = item.album.pmid;
        const cover_url = pmid ? `https://y.gtimg.cn/music/photo_new/T002R500x500M000${pmid}.jpg` : '';
        
        return {
            id: item.id,
            name: item.name,
            artist: item.singer[0]?.name,
            cover_url: cover_url,
            // 保留 mid 和 media_mid，用于后续的 getlink 和 getlyric 请求
            mid: item.mid,
            media_mid: item.file.media_mid
        };
    });

    // 模仿酷我模块返回统一的格式
    return {
        source: 'qq',
        keyword: keyword,
        result: formattedResult
    };
};

/**
 * 根据歌曲ID获取mid和media_mid
 * @param {string} id 歌曲ID
 * @returns {Promise<object>} 包含mid和media_mid的对象
 */
const getMidAndMediaMid = async (id) => {
    console.log(`调用 QQ 音乐获取mid和media_mid API，ID: ${id}`);
    const trackInfoRequest = {
        "request": {
            "module": "music.trackInfo.UniformRuleCtrl", 
            "method": "CgiGetTrackInfo",
            "param": {
                "types": [114514],
                "ids": [parseInt(id, 10)]
            }
        }
    };

    const trackInfoResponse = await axios.post(API_URL, trackInfoRequest);
    const track = trackInfoResponse.data.request?.data?.tracks?.[0];

    if (!track) {
        throw new Error('根据歌曲ID获取信息失败。');
    }

    return {
        mid: track.mid,
        media_mid: track.file.media_mid
    };
};

/**
 * 创建获取 ppurl 的 JSON 数据
 * @param {string} id 歌曲 id
 * @returns {object} JSON 请求对象
 */
const createPpurlRequest = (id) => ({
    comm: { ct: '11', cv: '22060004', tmeAppID: 'ztelite', OpenUDID: '114514', uid: UIN },
    request: {
        module: 'music.qqmusiclite.MtLimitFreeSvr',
        method: 'Obtain',
        param: { songid: [parseInt(id, 10)], need_ppurl: true },
    },
});

/**
 * 创建获取 vkey 的 JSON 数据 (使用 ppurl)
 * @param {string} mid 歌曲 mid
 * @param {string} ppurl ppurl
 * @returns {object} JSON 请求对象
 */
const createVkeyRequest = (mid, ppurl) => ({
    request: {
        module: 'music.vkey.GetVkey',
        method: 'CgiGetTempVkey',
        param: { guid: GUID, songlist: [{ mediamid: 'Yun', tempVkey: ppurl, songMID: mid }] },
    },
});

/**
 * 创建获取 vkey 的 JSON 数据 (使用 filename)
 * @param {string} filename 文件名
 * @param {string} songmid 歌曲 mid
 * @returns {object} JSON 请求对象
 */
const createGetVkeyRequest = (filename, songmid) => ({
    comm: { ct: '11', cv: '22060004', tmeAppID: 'ztelite', OpenUDID: '114514', uid: UIN },
    request: {
        module: 'music.vkey.GetVkey',
        method: 'UrlGetVkey',
        param: { guid: GUID, songmid: [songmid], filename: [`M500${filename}.mp3`] },
    },
});

/**
 * 获取歌曲的播放链接
 * @param {string} id 歌曲 id
 * @returns {Promise<string>} 歌曲的播放 URL
 */
const getlink = async (id) => {
    console.log(`调用 QQ 音乐获取链接 API，ID: ${id}`);
    
    // 内部调用获取mid和media_mid
    const { mid, media_mid } = await getMidAndMediaMid(id);

    const ppurlRequest = createPpurlRequest(id);
    const ppurlResult = await axios.post(API_URL, ppurlRequest);
    const ppurl = ppurlResult.data.request?.data?.tracks?.[0]?.control?.ppurl || '';
    
    let songUrl = '';
    if (ppurl) {
        const vkeyRequest = createVkeyRequest(mid, ppurl);
        const vkeyResult = await axios.post(API_URL, vkeyRequest);
        const purl = vkeyResult.data.request?.data?.data?.Yun?.purl;
        if (purl) {
            songUrl = `https://ws.stream.qqmusic.qq.com/${purl}`;
        }
    } else {
        const getVkeyObj = createGetVkeyRequest(media_mid, mid);
        console.log(JSON.stringify(getVkeyObj))
        const urlGetVkeyObj = await axios.post(API_URL, getVkeyObj);
        const flowUrl = urlGetVkeyObj.data.request?.data?.midurlinfo?.[0]?.flowurl || '';
        if (flowUrl) {
            songUrl = `https://sjy.stream.qqmusic.qq.com/${flowUrl}`;
        }
    }

    if (!songUrl) {
        throw new Error('获取歌曲链接失败, 可能是数字专辑或付费歌曲。');
    }
    return songUrl;
};

/**
 * 获取歌曲的歌词
 * @param {string} id 歌曲 id
 * @returns {Promise<string>} 歌曲歌词
 */
const getlyric = async (id) => {
    console.log(`调用 QQ 音乐获取歌词 API，ID: ${id}`);
    
    // 内部调用获取mid
    const { mid } = await getMidAndMediaMid(id);
    
    const url = `${LYRIC_API_URL}?format=json&nobase64=1&songmid=${mid}`;

    const lyricObj = await axios.get(url, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 Safari/537.36',
            'referer': 'https://y.qq.com/',
        },
    });
    return {
      source: 'kuwo',
      id: id,
      lyric: lyricObj.data.lyric  || '未找到歌词。'
    };
};

module.exports = {
    search,
    getlink,
    getlyric,
    getMidAndMediaMid
};
