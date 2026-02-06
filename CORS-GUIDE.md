# CORS Configuration Guide

## 问题诊断

如果你的全景图无法加载，显示错误：
```
Failed to load image: https://example.com/image.jpg
```

这通常是 **CORS（跨域资源共享）** 问题。

## 什么是 CORS？

当浏览器从 `https://your-app.vercel.app` 访问 `https://oss.example.com/image.jpg` 时，浏览器会检查图片服务器是否允许跨域访问。如果图片服务器没有返回正确的 CORS 头，浏览器会阻止加载。

## 常见云存储 CORS 配置

### 阿里云 OSS (Alibaba Cloud OSS)

1. **登录 OSS 控制台**
   - 访问：https://oss.console.aliyun.com/
   - 找到你的 Bucket

2. **配置 CORS 规则**
   - 点击 Bucket 名称 → 权限管理 → 跨域设置（CORS）
   - 点击"设置" → "创建规则"

3. **填写规则**：
   ```
   来源: *
   允许的 Methods: GET, HEAD
   允许的 Headers: *
   暴露的 Headers: ETag, Content-Length, Content-Type
   缓存时间: 600
   ```

4. **JSON 配置示例**：
   ```json
   {
     "AllowedOrigins": ["*"],
     "AllowedMethods": ["GET", "HEAD"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
     "MaxAgeSeconds": 600
   }
   ```

### AWS S3

1. **登录 AWS Console**
   - 访问：https://s3.console.aws.amazon.com/
   - 选择你的 Bucket

2. **配置 CORS**
   - 点击 "Permissions" 标签
   - 滚动到 "Cross-origin resource sharing (CORS)"
   - 点击 "Edit"

3. **添加 CORS 配置**：
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 600
     }
   ]
   ```

### Cloudflare R2

1. **登录 Cloudflare Dashboard**
   - 访问：https://dash.cloudflare.com/
   - 选择 R2 → 你的 Bucket

2. **配置 CORS**
   - 点击 "Settings" → "CORS Policy"
   - 添加规则：
   ```json
   {
     "AllowedOrigins": ["*"],
     "AllowedMethods": ["GET", "HEAD"],
     "AllowedHeaders": ["*"],
     "MaxAgeSeconds": 600
   }
   ```

### 腾讯云 COS (Tencent Cloud)

1. **登录 COS 控制台**
   - 访问：https://console.cloud.tencent.com/cos
   - 选择你的 Bucket

2. **配置 CORS**
   - 安全管理 → 跨域访问 CORS 设置
   - 添加规则：
   ```
   来源: *
   操作名: GET, HEAD
   头部: *
   暴露头部: ETag
   ```

### 七牛云 (Qiniu)

1. **登录七牛控制台**
   - 访问：https://portal.qiniu.com/
   - 选择存储空间

2. **配置 CORS**
   - 空间设置 → 跨域设置
   - 添加规则：
   ```json
   {
     "AllowedOrigins": ["*"],
     "AllowedMethods": ["GET", "HEAD"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 600
   }
   ```

### Vercel Blob

Vercel Blob 默认支持 CORS，无需额外配置。

### Cloudinary

Cloudinary 默认支持 CORS，无需额外配置。

## 限制访问源（推荐生产环境）

如果你不想允许所有域名访问（`*`），可以指定你的 Vercel 域名：

```
来源: https://your-app.vercel.app
来源: https://your-custom-domain.com
```

## 测试 CORS 是否生效

### 方法 1: 使用 curl 测试

```bash
curl -I -H "Origin: https://vercel.com" \
  "https://shuidianbang.oss-cn-chengdu.aliyuncs.com/ceshi/all.jpg"
```

应该返回类似这样的头：
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Allow-Headers: *
Access-Control-Expose-Headers: ETag, Content-Length
Access-Control-Max-Age: 600
```

### 方法 2: 使用浏览器测试

1. 打开浏览器开发者工具（F12）
2. 切换到 "Network" 标签
3. 刷新页面，找到图片请求
4. 查看响应头，应该包含 `Access-Control-Allow-Origin`

### 方法 3: 在线测试工具

访问：https://test-cors.org/
- 输入你的图片 URL
- 点击 "Send Request"
- 查看结果

## 常见问题

### Q: 配置了 CORS 还是报错？

**A**: 可能的原因：
1. **缓存问题**：清除浏览器缓存，或使用隐私模式测试
2. **CDN 缓存**：如果使用了 CDN，可能需要刷新 CDN 缓存
3. **配置生效时间**：OSS 配置通常需要 1-5 分钟生效
4. **多个规则冲突**：检查是否有多个 CORS 规则冲突

### Q: 可以使用代理服务器解决 CORS 问题吗？

**A**: 可以，但不推荐。会：
- 增加服务器负载和成本
- 增加延迟
- 需要额外的服务器资源

更好的方案是配置正确的 CORS 规则。

### Q: 开发环境正常，生产环境报错？

**A**: 检查：
1. 生产环境的域名是否在 CORS 允许列表中
2. 是否使用了 HTTPS（混合内容问题）
3. CDN 是否正确配置了 CORS

### Q: 可以在前端代码中绕过 CORS 吗？

**A**: **不可以**。CORS 是浏览器安全机制，无法在前端代码中绕过。必须在服务器端配置。

## 替代方案

如果无法配置 CORS，可以考虑：

### 方案 1: 使用图片代理

创建一个简单的代理服务器：

```javascript
// Next.js API Route 示例
// app/api/proxy/image/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing URL parameter', { status: 400 });
  }

  const response = await fetch(imageUrl);
  const blob = await response.blob();

  return new Response(blob, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
```

使用方式：
```
?src=https://your-app.vercel.app/api/proxy/image?url=https://oss.example.com/image.jpg
```

### 方案 2: 将图片托管到 Vercel

直接将图片放在 `public/` 目录，或使用 Vercel Blob。

### 方案 3: 使用 Cloudinary

Cloudinary 提供：
- 免费 CDN
- 自动优化
- 默认 CORS 支持
- 图片变换

## 检查清单

部署前检查：
- [ ] 图片服务器已配置 CORS 规则
- [ ] CORS 规则包含 `Access-Control-Allow-Origin: *`
- [ ] 允许的 Methods 包含 `GET` 和 `HEAD`
- [ ] 使用 curl 测试确认 CORS 头存在
- [ ] 浏览器测试确认图片可以加载
- [ ] 清除缓存重新测试

## 相关资源

- [MDN - CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [阿里云 OSS CORS 文档](https://help.aliyun.com/document_detail/100676.html)
- [AWS S3 CORS 文档](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [Vercel Blob CORS](https://vercel.com/docs/storage/vercel-blob/using-blob#cors)

## 仍需帮助？

如果按照上述步骤配置后仍有问题：
1. 检查浏览器控制台的完整错误信息
2. 使用 F12 → Network 标签查看请求详情
3. 确认图片 URL 是否可以直接访问
4. 在 GitHub 仓库创建 issue，提供：
   - 图片 URL（如果可以公开）
   - 浏览器控制台完整错误信息
   - Network 标签的请求/响应头
