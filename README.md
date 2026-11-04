# dsh-play-store-shots-wan

DeepSeek Harness 插件：在输入框敲 `/playstoreshots 应用名称` 并附上 3 张图，生成一套 Google Play 商店图 —— 4 张 1080×1920 竖图 + 1 张 1024×500 横幅，模型为阿里云百炼 `wan2.7-image-pro`，关闭水印。

## 安装

**Web 插件页（推荐）**：侧边栏 **Plugins → Add plugin**，填 `dsh-play-store-shots-wan` 或 `https://github.com/dygin/dsh-play-store-shots-wan`，安装后在列表里启用。

**手动**：编辑当前 profile 的 `package.json`，把插件加进依赖和 `dsh.profile.bundles`，再 `pnpm install`：

```yaml
# ~/.dsh/profiles/web/package.json
"dependencies": { "dsh-play-store-shots-wan": "^1.0.0" },
"dsh": { "profile": { "bundles": ["...", "dsh-play-store-shots-wan"] } }
```

插件通过自带的 `cordis.patch.yml` 注册 `play-store-shots` 条目，条目 id 同时是配置页的命名空间。

## 配置

侧边栏 **Plugins → Installed plugins → Google Play 商店图**：

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `apiKey` | 空 | 百炼 API Key；留空时读取环境变量 `WAN_API_KEY` |
| `baseUrl` | `https://ws-gpgzmtcnyu9qtdc4.cn-beijing.maas.aliyuncs.com` | 专属网关，末尾不带 `/api/v1` |
| `model` | `wan2.7-image-pro` | 图像模型 |
| `outputDir` | `play-store-shots` | 输出目录，相对路径基于会话工作目录 |

## 使用

```
/playstoreshots 你的应用名        ← 同时附上 3 张图片
```

图片按顺序解释：`1) App logo`、`2) 商店竖图参考（1080×1920，也可以是 2×2 拼图）`、`3) 横幅参考（1024×500）`。

附带的图片数量不是 3 张时不会调用模型，直接返回错误：

```
需要恰好 3 张图片（收到 2 个附件，其中图片 2 张）。
请按顺序附上：1) App logo  2) 商店竖图参考  3) 商店横图参考，然后重新提交 /playstoreshots。
```

生成内容：英文文案（不含数量、排名、无限、商店 CTA 这类表述）、沿用 logo 提取的品牌色、封面只有画面没有任何剧名或角标、`watermark: false` 无水印。

## 输出

```
play-store-shots/<app-slug>/
├── final/01.png … 04.png   1080×1920 RGB
├── final/05.png            1024×500 RGB
├── final/contact-sheet.png 五张拼一张的预览
└── manifest.json           文案、主色、尺寸、字节数
```

横幅先生成 1638×800 再缩到 1024×500：百炼要求单张总像素 ≥ 589824，`1024*500=512000` 会被拒。

## 交付前检查

生成结果需要人工过一遍再上传 Play Console：文字是否拼错、封面是否干净、logo 有没有变形、文案是否和自己的商店页重复。模型偶尔会把与背景同色的图标画成轮廓、或把手机边框画出刘海，重跑一次通常就好。

## 开发

```bash
npm install          # 安装依赖并构建
npm run build        # tsdown：Host ESM + 浏览器 CJS
npm run typecheck
npm test             # 11 个命令/文案单元测试，不访问网络
WAN_API_KEY=... node scripts/smoke.mjs logo.png portrait.jpg banner.jpg
```

`smoke.mjs` 会真调一次接口，生成 5 张图（约 15–90 秒）。

## 许可

MIT
