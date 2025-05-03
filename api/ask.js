import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// 加载环境变量
dotenv.config();

const app = express();

// ========================
// 中间件配置
// ========================
const allowedOrigins = [
  'https://gin.zmal.top',
  'https://deepseek-chat-azure.vercel.app',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
]

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['POST', 'OPTIONS'],  // 必须包含OPTIONS方法
  allowedHeaders: ['Content-Type'],
  credentials: true
};

// 速率限制
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});
// 在所有路由之前添加
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://gin.zmal.top');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});




// ========================
// 路由配置
// ========================
app.post('/', limiter, async (req, res) => {
  try {
    if (!req.body?.question?.trim()) {
      return res.status(400).json({ error: '问题内容不能为空' });
    }

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat",
        messages: [{ role: "user", content: req.body.question.substring(0, 1000) }],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json({ answer: response.data.choices[0].message.content });

  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({
      error: error.response?.data?.message || '服务暂时不可用'
    });
  }
});

// 健康检查端点
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

import fs from 'fs';

function logToFile(message) {
  fs.appendFileSync('/tmp/vercel-log.txt',
    `${new Date().toISOString()} - ${message}\n`
  );
}

export default app;