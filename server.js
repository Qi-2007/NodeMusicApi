// 项目文件结构:
// /your-project
// ├── server.js               <-- 主服务器入口文件
// ├── package.json            <-- 项目依赖和脚本
// ├── routes/
// │   └── music.js            <-- 音乐API路由文件
// └── services/
//     ├── qqMusic.js          <-- QQ音乐服务模块
//     ├── neteaseMusic.js     <-- 网易云音乐服务模块
//     └── kuwoMusic.js        <-- 酷我音乐服务模块

// --- 文件 1: server.js (主服务器入口文件) ---
const express = require('express');
const cookieParser = require('cookie-parser'); // 新增：用于解析 Cookie
const bodyParser = require('body-parser'); // 新增：用于解析 POST 请求体
const app = express();
const port = 3000;

// 导入音乐 API 路由
const musicRoutes = require('./routes/music');

// 中间件:
// CORS 跨域处理
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers.Origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // 预检请求直接通过
  }
  next();
});

// 使用 body-parser 中间件来解析请求体，以支持 POST 请求
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// 新增：使用 cookie-parser 中间件
app.use(cookieParser());

// 挂载音乐路由，所有以 /api 开头的请求都将由 musicRoutes 处理
app.use('/api', musicRoutes);

// 启动服务器
app.listen(port, () => {
  console.log(`音乐聚合API服务器正在运行，端口: ${port}`);
  console.log(`测试API:`);
  console.log(`- 搜索: GET http://localhost:3000/api/search?source=qq&keyword=周杰伦`);
  console.log(`- 歌词: GET http://localhost:3000/api/lyric?source=netease&id=12345`);
});

