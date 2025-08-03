// --- 文件 3: routes/music.js (音乐 API 路由文件) ---
const express = require('express');
const router = express.Router();

// 导入各个音乐平台的服务模块
const qqMusic = require('../services/qqMusic');
const neteaseMusic = require('../services/neteaseMusic');
const kuwoMusic = require('../services/kuwoMusic');

// 用于存储有效的 token（此为内存存储，重启服务器后会丢失）
const tokenStore = new Set();

// 辅助函数：生成一个随机 token
const generateRandomToken = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 根据你提供的逻辑，实现 token 验证功能
const checkToken = (token) => {
  console.log(`检查 token: ${token}`);
  return token && tokenStore.has(token);
};

// 根据 source 参数获取对应的服务
const getMusicService = (source) => {
  switch (source) {
    case 'qq':
      return qqMusic;
    case 'netease':
      return neteaseMusic;
    case 'kuwo':
      return kuwoMusic;
    default:
      return null;
  }
};

// 定义一个 API 路由，用于搜索音乐
router.get('/search', async (req, res) => {
  const { source, keyword } = req.query;
  const service = getMusicService(source);

  // 检查 token
  if (!checkToken(req.cookies?.token)) {
    return res.status(403).json({ error: '非法 token' });
  }

  if (!service) {
    return res.status(400).json({ error: '无效的音乐来源' });
  }

  try {
    const data = await service.search(keyword);
    // 根据你的要求，这里只返回歌曲列表数组
    res.status(200).json(data.result);
  } catch (error) {
    console.error(`搜索音乐失败: ${error.message}`);
    res.status(500).json({ error: '搜索音乐失败' });
  }
});

// 通用处理函数，用于获取歌曲链接并重定向
const getlinkHandler = async (req, res) => {
  const id = req.params.id || req.query.id;
  const { source, br } = req.query;
  const service = getMusicService(source);

  // 检查 token
  if (!checkToken(req.cookies?.token)) {
    return res.status(403).json({ error: '非法 token' });
  }

  if (!service) {
    return res.status(400).json({ error: '无效的音乐来源' });
  }

  try {
    const url = await service.getlink(id, br);
    console.log(`重定向到 URL: ${url}`);
    res.redirect(url);
  } catch (error) {
    console.error(`获取歌曲链接失败: ${error.message}`);
    res.status(500).json({ error: '获取歌曲链接失败' });
  }
};

// 定义两个 API 路由，都使用 getlinkHandler 函数
// 路由可以同时处理路径参数（/getlink/:id）和查询参数（/getlink?id=...）
router.get('/getlink/:id?', getlinkHandler);
router.get('/download/:id?', getlinkHandler);


// 定义一个 API 路由，用于获取歌词
// 路由现在可以同时处理路径参数（/lyric/:id）和查询参数（/lyric?id=...）
router.get('/lyric/:id?', async (req, res) => {
  // 从路径参数或查询参数中获取 ID
  const id = req.params.id || req.query.id;
  const { source } = req.query;

  const service = getMusicService(source);

  // 检查 token
  if (!checkToken(req.cookies?.token)) {
    return res.status(403).json({ error: '非法 token' });
  }

  if (!service) {
    return res.status(400).json({ error: '无效的音乐来源' });
  }

  try {
    const data = await service.getlyric(id);
    // 根据你的要求，这里只返回歌词文本
    res.status(200).json({lrc: data.lyric});
  } catch (error) {
    console.error(`获取歌词失败: ${error.message}`);
    res.status(500).json({ error: '获取歌词失败' });
  }
});


// 定义一个 API 路由，用于获取链接
// 路由现在可以同时处理路径参数（/lyric/:id）和查询参数（/lyric?id=...）
router.get('/link', async (req, res) => {
  // 从 query 或 body 中获取 password，支持 GET 和 POST
  // 感谢你指出的问题，客户端抓包正常说明请求体格式正确。
  // 此处代码已支持获取不同方式的请求参数。
  const password = req.query.password || req.body.password;
  const token = req.cookies?.token;

  const isValidToken = checkToken(token);
  const isValidPassword = password === 'qi666';

  if (isValidPassword || isValidToken) {
    // 验证成功，生成新 token
    const newToken = generateRandomToken(8);
    // 从旧的 token 列表中删除，并加入新的 token
    if (isValidToken) {
      tokenStore.delete(token);
    }
    tokenStore.add(newToken);

    // 设置 Cookie，有效期一年
    const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
    res.cookie('token', newToken, {
      maxAge: oneYearInMs,
      httpOnly: false
    });

    res.status(200).json({ ok: true , links : [{title : '腾讯云分流',url:'https://music.445533.xyz/musicdownloader/'}]});
  } else {
    // 验证失败，返回 403 错误并清除 token
    if (token) {
      tokenStore.delete(token);
      res.clearCookie('token');
    }
    const errorMessage = token ? 'token无效' : '密码错误';
    res.status(403).json({ error: errorMessage });
  }
});


// 根据你提供的逻辑，实现新的认证路由
const authHandler = (req, res) => {
  // 从 query 或 body 中获取 password，支持 GET 和 POST
  // 感谢你指出的问题，客户端抓包正常说明请求体格式正确。
  // 此处代码已支持获取不同方式的请求参数。
  const password = req.query.password || req.body.password;
  const token = req.cookies?.token;

  const isValidToken = checkToken(token);
  const isValidPassword = password === 'qi666';

  if (isValidPassword || isValidToken) {
    // 验证成功，生成新 token
    const newToken = generateRandomToken(8);
    // 从旧的 token 列表中删除，并加入新的 token
    if (isValidToken) {
      tokenStore.delete(token);
    }
    tokenStore.add(newToken);

    // 设置 Cookie，有效期一年
    const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
    res.cookie('token', newToken, {
      maxAge: oneYearInMs,
      httpOnly: false
    });

    res.status(200).json({ token: newToken });
  } else {
    // 验证失败，返回 403 错误并清除 token
    if (token) {
      tokenStore.delete(token);
      res.clearCookie('token');
    }
    const errorMessage = token ? 'token无效' : '密码错误';
    res.status(403).json({ error: errorMessage });
  }
};

router.get('/auth', authHandler);
router.post('/auth', authHandler);

module.exports = router;