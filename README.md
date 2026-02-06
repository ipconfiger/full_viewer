# Fish-Eye Panorama Embed

一个基于 Canvas 的鱼眼全景图查看器，可以通过 iframe 嵌入到任何网站。

A Canvas-based fish-eye panorama viewer that can be embedded into any website via iframe.

## 特性 / Features

- 🎣 鱼眼全景图渲染 / Fish-eye panorama rendering
- 🖱️ 鼠标拖拽和缩放支持 / Mouse drag and zoom support
- ⌨️ 键盘导航 / Keyboard navigation
- 🏷️ 标签覆盖层支持 / Label overlay support
- 📱 响应式设计 / Responsive design
- 🔧 URL 参数配置 / URL parameter configuration
- 🎨 多种投影模式 / Multiple projection modes

## 快速开始 / Quick Start

### 本地开发 / Local Development

```bash
npm install
npm run dev
```

访问 http://localhost:5173 查看应用

### 构建生产版本 / Build Production Version

```bash
npm run build
```

### 类型检查 / Type Check

```bash
npm run type-check
```

## 部署到 Vercel / Deploy to Vercel

点击按钮一键部署 / Click the button for one-click deployment:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/fisheye-panorama-embed)

## 使用方法 / Usage

### iframe 嵌入 / iframe Embed

```html
<iframe
  src="https://your-domain.vercel.app/?src=https://example.com/panorama.jpg"
  width="800"
  height="400"
  frameborder="0"
  allowfullscreen
></iframe>
```

### URL 参数 / URL Parameters

| 参数 / Parameter | 类型 / Type | 必需 / Required | 默认值 / Default | 描述 / Description |
|-----------------|------------|----------------|----------------|-------------------|
| `src` | string | ✅ Yes | - | 全景图 URL / Panorama image URL |
| `width` | number | ❌ No | 800 | Canvas 宽度 / Canvas width |
| `height` | number | ❌ No | 400 | Canvas 高度 / Canvas height |
| `labels` | string | ❌ No | - | 标签数据 (Base64 编码) / Label data (Base64 encoded) |
| `projection` | string | ❌ No | EQUISOLID | 投影类型 / Projection type |
| `initialYaw` | number | ❌ No | 0 | 初始偏航角 (-180 to 180) / Initial yaw angle |
| `initialPitch` | number | ❌ No | 0 | 初始俯仰角 (-90 to 90) / Initial pitch angle |
| `initialZoom` | number | ❌ No | 1.0 | 初始缩放 / Initial zoom |
| `minZoom` | number | ❌ No | 0.5 | 最小缩放 / Minimum zoom |
| `maxZoom` | number | ❌ No | 3.0 | 最大缩放 / Maximum zoom |

### 投影类型 / Projection Types

- `EQUISOLID` - 等立体投影 (默认 / Default)
- `RECTILINEAR` - 直线投影
- `STEREOGRAPHIC` - 立体投影
- `EQUIDISTANT` - 等距投影

### 标签格式 / Label Format

标签是一个对象数组，每个标签包含以下字段：

Labels are an array of objects, each containing the following fields:

```typescript
{
  id: string;           // 唯一标识符 / Unique identifier
  x: number;           // X 坐标 (0 to 3600) / X coordinate
  y: number;           // Y 坐标 (0 to 1800) / Y coordinate
  w: number;           // 宽度 / Width
  h: number;           // 高度 / Height
  title?: string;      // 标题 / Title (optional)
  description?: string; // 描述 / Description (optional)
}
```

#### 标签示例 / Label Example

```javascript
const labels = [
  { id: "1", x: 1800, y: 900, w: 100, h: 50, title: "标签1" },
  { id: "2", x: 2000, y: 800, w: 120, h: 60, title: "标签2" }
];
const encoded = btoa(JSON.stringify(labels));
const iframeSrc = `https://your-domain.vercel.app/?src=panorama.jpg&labels=${encoded}`;
```

## 使用示例 / Usage Examples

### 基本用法 / Basic Usage

```html
<iframe
  src="https://your-domain.vercel.app/?src=https://example.com/panorama.jpg"
  width="800"
  height="400"
  frameborder="0"
  allowfullscreen
></iframe>
```

### 带标签的用法 / With Labels

```javascript
const labels = [
  { id: "1", x: 1800, y: 900, w: 100, h: 50, title: "标签1" },
  { id: "2", x: 2000, y: 800, w: 120, h: 60, title: "标签2" }
];
const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(labels))));
const url = `https://your-domain.vercel.app/?src=${imageUrl}&labels=${encoded}`;
```

### 不同投影模式 / Different Projections

```html
<!-- 等立体投影 / Equisolid -->
<iframe src="...?src=panorama.jpg&projection=EQUISOLID"></iframe>

<!-- 直线投影 / Rectilinear -->
<iframe src="...?src=panorama.jpg&projection=RECTILINEAR"></iframe>

<!-- 立体投影 / Stereographic -->
<iframe src="...?src=panorama.jpg&projection=STEREOGRAPHIC"></iframe>

<!-- 等距投影 / Equidistant -->
<iframe src="...?src=panorama.jpg&projection=EQUIDISTANT"></iframe>
```

### 自定义初始视角 / Custom Initial View

```html
<iframe
  src="...?src=panorama.jpg&initialYaw=45&initialPitch=-10&initialZoom=1.5"
></iframe>
```

## 技术栈 / Tech Stack

- React 18
- TypeScript
- Vite
- Canvas API

## 项目结构 / Project Structure

```
fisheye-panorama-embed/
├── src/
│   ├── core/              # 核心渲染器代码 / Core renderer code
│   │   ├── types.ts       # 类型定义 / Type definitions
│   │   ├── renderer.ts    # 主渲染器 / Main renderer
│   │   ├── projection.ts  # 投影算法 / Projection algorithms
│   │   ├── labelRenderer.ts # 标签渲染器 / Label renderer
│   │   └── index.ts       # 导出 / Exports
│   ├── react/             # React Hook
│   │   └── index.ts
│   ├── utils/             # 工具函数 / Utilities
│   │   └── urlParams.ts   # URL 参数解析 / URL parameter parsing
│   ├── App.tsx            # 主应用组件 / Main app component
│   ├── App.css            # 样式 / Styles
│   └── main.tsx           # 入口 / Entry point
├── public/                # 静态资源 / Static assets
├── index.html             # HTML 模板 / HTML template
├── vite.config.ts         # Vite 配置 / Vite config
├── tsconfig.json          # TypeScript 配置 / TypeScript config
├── vercel.json            # Vercel 配置 / Vercel config
└── package.json           # 依赖 / Dependencies
```

## 键盘快捷键 / Keyboard Shortcuts

- `←` / `→` - 水平旋转 / Horizontal rotation
- `↑` / `↓` - 垂直旋转 / Vertical rotation
- `+` / `-` - 缩放 / Zoom in/out

## 浏览器兼容性 / Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT
