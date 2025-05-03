import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';

const __dirname = path.resolve();

dotenv.config();

const app = express();

app.set('trust proxy', process.env.NODE_ENV === 'production' ? 2 : false);

const allowedOrigins = [
    'https://gin.zmal.top',
    'https://deepseek-chat-azure.vercel.app',
    'http://localhost:3000',
    'https://xh2xhkhmme-c.hf.space'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: true }
});

app.use(limiter);


app.post('/api/ask', async (req, res) => {
    try {
        if (!req.body?.question?.trim()) {
            return res.status(400).json({ error: '问题不能为空' });
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

        res.json({
            answer: response.data.choices[0]?.message?.content,
            tokens: response.data.usage?.total_tokens
        });

    } catch (error) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || '服务不可用';

        console.error(`[${new Date().toISOString()}] API Error:`, message);

        res.status(status).json({
            error: message,
            code: status
        });
    }
});

app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Server Error:`, err.stack);

    res.status(500).json({
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'development' ? err.message : '请联系管理员'
    });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`[${new Date().toISOString()}] 服务已启动: http://${HOST}:${PORT}`);
});

export default app;