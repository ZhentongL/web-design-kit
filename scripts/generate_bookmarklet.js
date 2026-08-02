#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const collectorPath = path.join(root, "scripts", "browser_snapshot_collector.js");
const distDir = path.join(root, "dist");

function minifyJs(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}()[\];,:+\-*/%<>=?&|])\s*/g, "$1")
    .trim();
}

function htmlEscape(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function main() {
  const collector = fs.readFileSync(collectorPath, "utf8");
  const bookmarklet = `javascript:${encodeURIComponent(minifyJs(collector))}`;

  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, "collector-bookmarklet.txt"), bookmarklet, "utf8");

  const installer = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>页面采集书签安装器</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f8fb;
      --panel: #ffffff;
      --text: #172033;
      --muted: #667085;
      --primary: #3176ff;
      --border: #d9e1ef;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
      background: var(--bg);
      color: var(--text);
      display: grid;
      place-items: center;
      padding: 32px;
    }
    main {
      width: min(760px, 100%);
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 28px;
      box-shadow: 0 12px 32px rgba(23, 32, 51, .08);
    }
    h1 {
      margin: 0 0 12px;
      font-size: 24px;
      line-height: 1.3;
    }
    p {
      color: var(--muted);
      line-height: 1.7;
      margin: 0 0 16px;
    }
    .bookmarklet {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 16px;
      border-radius: 6px;
      background: var(--primary);
      color: #fff;
      text-decoration: none;
      font-weight: 600;
      margin: 8px 0 20px;
    }
    .steps {
      display: grid;
      gap: 10px;
      margin-top: 8px;
      padding-left: 20px;
      color: var(--text);
      line-height: 1.7;
    }
    button {
      height: 36px;
      border: 1px solid var(--border);
      background: #fff;
      border-radius: 6px;
      padding: 0 12px;
      cursor: pointer;
    }
    textarea {
      width: 100%;
      height: 92px;
      margin-top: 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px;
      color: var(--muted);
      resize: vertical;
    }
  </style>
</head>
<body>
  <main>
    <h1>页面采集书签安装器</h1>
    <p>把下面这个蓝色按钮拖到浏览器收藏栏。以后打开已登录的内部系统页面，点收藏栏里的这个按钮，就会自动下载 <code>page-snapshot.json</code>。</p>
    <a class="bookmarklet" href="${htmlEscape(bookmarklet)}">采集当前页面</a>
    <ol class="steps">
      <li>第一次：把“采集当前页面”拖到收藏栏。</li>
      <li>以后：打开目标页面并登录，点收藏栏里的“采集当前页面”。</li>
      <li>把下载的 <code>page-snapshot.json</code> 提供给 Web Design Kit，继续创建或更新设计套件。</li>
    </ol>
    <p>如果浏览器不允许拖拽安装，可以复制下面内容，新建收藏夹，把网址粘进去。</p>
    <button id="copy">复制书签脚本</button>
    <textarea readonly>${htmlEscape(bookmarklet)}</textarea>
  </main>
  <script>
    document.getElementById("copy").addEventListener("click", async () => {
      const text = document.querySelector("textarea").value;
      await navigator.clipboard.writeText(text);
      document.getElementById("copy").textContent = "已复制";
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(distDir, "install_collector_bookmarklet.html"), installer, "utf8");

  console.log(JSON.stringify({
    bookmarklet: path.join(distDir, "collector-bookmarklet.txt"),
    installer: path.join(distDir, "install_collector_bookmarklet.html"),
    bookmarkletLength: bookmarklet.length,
  }, null, 2));
}

main();
