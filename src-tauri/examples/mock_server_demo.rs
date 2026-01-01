/// Mock WebDAV 服务器演示
///
/// 这个示例创建一个可以在浏览器访问的 Mock HTTP 服务器
///
/// 运行方式:
/// ```bash
/// cd src-tauri
/// cargo run --example mock_server_demo
/// ```
///
/// 然后在浏览器访问显示的 URL
use std::time::Duration;
use tokio::time::sleep;

#[tokio::main]
async fn main() {
    println!("🚀 启动 Mock WebDAV 服务器演示...\n");

    // 创建 Mock 服务器
    let mut server = mockito::Server::new_async().await;

    println!("✅ Mock 服务器已启动！");
    println!("📍 服务器地址: {}", server.url());
    println!("\n🌐 你可以在浏览器中访问以下 URL:\n");

    // 配置各种路由
    setup_routes(&mut server).await;

    println!("\n⏳ 服务器将保持运行 5 分钟，按 Ctrl+C 可以提前退出...\n");

    // 保持服务器运行 5 分钟
    for i in 1..=300 {
        sleep(Duration::from_secs(1)).await;
        if i % 30 == 0 {
            println!("⏰ 服务器已运行 {} 秒...", i);
        }
    }

    println!("\n👋 服务器关闭");
}

async fn setup_routes(server: &mut mockito::Server) {
    // 1. 首页 - GET /
    let _home = server
        .mock("GET", "/")
        .with_status(200)
        .with_header("content-type", "text/html; charset=utf-8")
        .with_body(
            r#"<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock WebDAV 服务器</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
        h1 { margin-top: 0; font-size: 2.5em; }
        .endpoint {
            background: rgba(255, 255, 255, 0.2);
            padding: 15px;
            margin: 10px 0;
            border-radius: 10px;
            border-left: 4px solid #4CAF50;
        }
        .method {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 5px;
            font-weight: bold;
            margin-right: 10px;
        }
        .get { background: #4CAF50; }
        .post { background: #2196F3; }
        .put { background: #FF9800; }
        .delete { background: #f44336; }
        a {
            color: #FFD700;
            text-decoration: none;
            font-weight: bold;
        }
        a:hover { text-decoration: underline; }
        code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎭 Mock WebDAV 服务器</h1>
        <p>这是一个用于测试的 Mock HTTP 服务器，模拟 WebDAV 协议的行为。</p>
        
        <h2>📋 可用的端点 (Endpoints):</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <a href="/api/hello">/api/hello</a>
            <p>返回 JSON 格式的欢迎消息</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <a href="/api/files">/api/files</a>
            <p>返回模拟的文件列表（JSON 格式）</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <a href="/webdav/documents">/webdav/documents</a>
            <p>返回 WebDAV PROPFIND 响应（XML 格式）</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <a href="/download/test.txt">/download/test.txt</a>
            <p>下载一个模拟的文本文件</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <a href="/status">/status</a>
            <p>查看服务器状态信息</p>
        </div>
        
        <h2>💡 提示:</h2>
        <ul>
            <li>点击上面的链接可以直接在浏览器中访问</li>
            <li>使用 <code>curl</code> 或 <code>Postman</code> 可以测试其他 HTTP 方法</li>
            <li>这个服务器只存在于内存中，不会真正存储任何数据</li>
        </ul>
    </div>
</body>
</html>"#,
        )
        .create_async()
        .await;

    println!("   1. 首页:           {}/", server.url());

    // 2. JSON API - Hello
    let _hello = server
        .mock("GET", "/api/hello")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(
            r#"{
    "message": "Hello from Mock Server!",
    "timestamp": "2024-01-15T10:30:00Z",
    "server": "mockito",
    "version": "1.0.0"
}"#,
        )
        .create_async()
        .await;

    println!("   2. JSON API:       {}/api/hello", server.url());

    // 3. 文件列表 API
    let _files = server
        .mock("GET", "/api/files")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(
            r#"{
    "files": [
        {
            "name": "document.pdf",
            "size": 1048576,
            "type": "file",
            "modified": "2024-01-15T10:00:00Z"
        },
        {
            "name": "photos",
            "size": 0,
            "type": "directory",
            "modified": "2024-01-14T15:30:00Z"
        },
        {
            "name": "notes.txt",
            "size": 2048,
            "type": "file",
            "modified": "2024-01-15T09:45:00Z"
        }
    ],
    "total": 3
}"#,
        )
        .create_async()
        .await;

    println!("   3. 文件列表:       {}/api/files", server.url());

    // 4. WebDAV PROPFIND 响应
    let _webdav = server
        .mock("GET", "/webdav/documents")
        .with_status(207)
        .with_header("content-type", "application/xml; charset=utf-8")
        .with_body(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
    <D:response>
        <D:href>/webdav/documents/</D:href>
        <D:propstat>
            <D:prop>
                <D:resourcetype><D:collection/></D:resourcetype>
                <D:displayname>documents</D:displayname>
            </D:prop>
            <D:status>HTTP/1.1 200 OK</D:status>
        </D:propstat>
    </D:response>
    <D:response>
        <D:href>/webdav/documents/report.docx</D:href>
        <D:propstat>
            <D:prop>
                <D:resourcetype/>
                <D:getcontentlength>524288</D:getcontentlength>
                <D:getlastmodified>Mon, 15 Jan 2024 10:00:00 GMT</D:getlastmodified>
                <D:displayname>report.docx</D:displayname>
            </D:prop>
            <D:status>HTTP/1.1 200 OK</D:status>
        </D:propstat>
    </D:response>
    <D:response>
        <D:href>/webdav/documents/presentation.pptx</D:href>
        <D:propstat>
            <D:prop>
                <D:resourcetype/>
                <D:getcontentlength>2097152</D:getcontentlength>
                <D:getlastmodified>Sun, 14 Jan 2024 15:30:00 GMT</D:getlastmodified>
                <D:displayname>presentation.pptx</D:displayname>
            </D:prop>
            <D:status>HTTP/1.1 200 OK</D:status>
        </D:propstat>
    </D:response>
</D:multistatus>"#,
        )
        .create_async()
        .await;

    println!("   4. WebDAV XML:     {}/webdav/documents", server.url());

    // 5. 文件下载
    let _download = server
        .mock("GET", "/download/test.txt")
        .with_status(200)
        .with_header("content-type", "text/plain; charset=utf-8")
        .with_header("content-disposition", "attachment; filename=\"test.txt\"")
        .with_body(
            r#"这是一个模拟的文本文件！

Mock 服务器演示
================

这个文件是由 Mock 服务器动态生成的，
并不真实存在于文件系统中。

当你下载这个文件时，Mock 服务器会：
1. 接收 GET 请求
2. 返回预设的文本内容
3. 浏览器将内容保存为文件

这就是 Mock 服务器的工作原理！

时间戳: 2024-01-15 10:30:00
服务器: mockito
"#,
        )
        .create_async()
        .await;

    println!("   5. 文件下载:       {}/download/test.txt", server.url());

    // 6. 服务器状态
    let _status = server
        .mock("GET", "/status")
        .with_status(200)
        .with_header("content-type", "text/html; charset=utf-8")
        .with_body(
            r#"<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <title>服务器状态</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 600px;
                    margin: 50px auto;
                    padding: 20px;
                    background: #f5f5f5;
                }
                .status-card {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .status-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #eee;
                }
                .status-item:last-child { border-bottom: none; }
                .label { font-weight: bold; color: #666; }
                .value { color: #333; }
                .online { color: #4CAF50; font-weight: bold; }
                h1 { color: #333; margin-top: 0; }
            </style>
        </head>
        <body>
            <div class="status-card">
                <h1>📊 服务器状态</h1>
                <div class="status-item">
                    <span class="label">状态:</span>
                    <span class="value online">● 在线</span>
                </div>
                <div class="status-item">
                    <span class="label">服务器类型:</span>
                    <span class="value">Mock HTTP Server (mockito)</span>
                </div>
                <div class="status-item">
                    <span class="label">协议:</span>
                    <span class="value">HTTP/1.1</span>
                </div>
                <div class="status-item">
                    <span class="label">运行模式:</span>
                    <span class="value">内存模式（不持久化）</span>
                </div>
                <div class="status-item">
                    <span class="label">启动时间:</span>
                    <span class="value">2024-01-15 10:30:00</span>
                </div>
                <div class="status-item">
                    <span class="label">用途:</span>
                    <span class="value">测试和演示</span>
                </div>
            </div>
        </body>
        </html>"#,
        )
        .create_async()
        .await;

    println!("   6. 服务器状态:     {}/status", server.url());
}
