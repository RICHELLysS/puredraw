# 纯画 · PureDraw

> 🐱 专注原创，拒绝 AI —— 让每一笔都有温度

纯画是一个面向插画师与约稿人的**原创约稿平台**，主打「无 AI 生成」的纯洁理念。无论你是想找到心仪画风的画师，还是希望展示自己作品、接受约稿的创作者，纯画都是你的家。

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🎨 画师认证 | 提交作品集，通过人工审核后获得认证徽章 |
| 📋 约稿工作流 | 完整流程：发起 → 沟通 → 支付定金 → 草稿 → 交付 |
| 🖼️ 作品广场 | Pinterest 风格瀑布流，展示原创作品，无需登录即可浏览 |
| 💬 实时聊天 | 画师与约稿人之间的专属对话频道 |
| 🏘️ 社区 | 登录后可访问，分享绘画心得、经验与灵感 |
| 🚫 禁 AI 机制 | 举报 + 人工审核双重保障，一经发现 AI 图立即下架并标记画师 |
| 🌗 双主题 | 粉色（白天）/ 绿色（夜间）主题随心切换 |

---

## 💰 定价规则

- 起步价 **不低于 ¥70**，保障画师劳动价值
- 定金固定 **¥30**，提前终止约稿退还 ¥25
- 价格透明公开，保障双方权益

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| UI 组件库 | shadcn/ui + Tailwind CSS |
| 后端 & 数据库 | Supabase（PostgreSQL + Auth + Storage + Realtime） |
| 路由 | React Router v6 |
| 状态管理 | React Context API |
| 表单处理 | React Hook Form + Zod |

---

## 📁 项目结构

```
src/
├── components/layout/       # Header 等布局组件
├── components/common/       # RouteGuard 等公共组件
├── components/ui/           # shadcn/ui 基础组件
├── contexts/                # Auth、Theme 全局状态
├── db/                      # Supabase 客户端 & API 层
├── pages/                   # 页面组件（10 个页面）
├── types/                   # TypeScript 类型定义
├── lib/                     # 工具函数（图片压缩等）
├── routes.tsx               # 路由配置
└── index.css                # 全局样式 & 主题变量

vercel.json                  # Vercel 部署配置
vite.config.prod.ts          # 生产构建专用 Vite 配置
```

---

## 🚀 本地开发

### 环境要求

- Node.js >= 18
- pnpm >= 9（推荐）或 npm >= 10

### 快速启动

```bash
# 1. 克隆仓库
git clone https://github.com/RICHELLysS/puredraw.git
cd puredraw

# 2. 安装依赖
pnpm install

# 3. 配置环境变量（见下方说明）

# 4. 启动开发服务器
pnpm dev
```

### 环境变量

在项目根目录创建  文件：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> 在 [Supabase 控制台](https://supabase.com) → Settings → API 中获取以上两个值。

---

## 🌐 部署到 Vercel

项目已包含 ，一键导入即可部署：

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入仓库
3. 添加环境变量  和 
4. 点击 Deploy

---

## 📜 平台原则

- **禁止 AI 生成图**：一经发现立即下架，画师账号标记「疑似使用 AI 作画」
- **尊重创作者**：起步价 ¥70 保障基本报酬
- **透明公正**：违规记录公开可查，申诉渠道畅通

---

## 📄 License

MIT © 2026 纯画 PureDraw
