const vscode = require("vscode");

/**
 * Webview 管理器
 */
class WebviewManager {
  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this.context = context;
    this.panel = null;
  }

  /**
   * 显示提醒面板
   * @param {string} title - 标题
   * @param {string} imageUrl - 图片URL
   * @param {string} style - 显示样式 (compact/full)
   * @param {Function} onAction - 响应回调
   */
  showReminderPanel(title, imageUrl, style, onAction) {
    const config = vscode.workspace.getConfiguration("restReminder");
    const autoCloseTime = config.get("autoCloseTime", 10);
    const windowSize = config.get("windowSize", "medium");

    this.createPanel("restReminder", title);

    if (style === "compact") {
      this.panel.webview.html = getCompactReminderHtml(
        imageUrl,
        title,
        autoCloseTime,
        windowSize
      );
    } else {
      this.panel.webview.html = getFullReminderHtml(
        imageUrl,
        title,
        autoCloseTime,
        windowSize
      );
    }

    // 监听消息
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        if (message.command === "rest") {
          onAction("好的，休息一下");
        } else if (message.command === "delay") {
          onAction("再工作 5 分钟");
        } else if (message.command === "stop") {
          onAction("暂停提醒");
        }
      },
      undefined,
      this.context.subscriptions
    );

    // 自动关闭
    if (autoCloseTime > 0) {
      setTimeout(() => {
        this.closePanel();
      }, autoCloseTime * 1000);
    }
  }

  /**
   * 显示预览面板
   * @param {string} imageUrl - 图片URL
   */
  showPreviewPanel(imageUrl) {
    const config = vscode.workspace.getConfiguration("restReminder");
    const windowSize = config.get("windowSize", "medium");

    this.createPanel("restPreview", "图片预览");
    this.panel.webview.html = getPreviewHtml(imageUrl, windowSize);

    this.panel.webview.onDidReceiveMessage(
      (message) => {
        if (message.command === "close") {
          this.closePanel();
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * 创建面板
   * @param {string} viewType - 面板类型
   * @param {string} title - 标题
   */
  createPanel(viewType, title) {
    if (this.panel) {
      this.panel.dispose();
    }

    this.panel = vscode.window.createWebviewPanel(
      viewType,
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.onDidDispose(
      () => {
        this.panel = null;
      },
      null,
      this.context.subscriptions
    );
  }

  /**
   * 关闭面板
   */
  closePanel() {
    if (this.panel) {
      this.panel.dispose();
    }
  }

  /**
   * 清理资源
   */
  dispose() {
    this.closePanel();
  }
}

/**
 * 获取窗口尺寸
 * @param {string} size - 尺寸选项
 * @returns {Object} 宽度和高度
 */
function getWindowSize(size) {
  const sizes = {
    small: { width: 400, height: 300 },
    medium: { width: 600, height: 400 },
    large: { width: 800, height: 600 },
  };
  return sizes[size] || sizes.medium;
}

/**
 * 生成紧凑模式提醒页面（夜间模式）
 */
function getCompactReminderHtml(imageUrl, title, autoCloseTime, windowSize) {
  const { width, height } = getWindowSize(windowSize);
  const autoCloseText = autoCloseTime > 0 ? `${autoCloseTime}秒后自动关闭` : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a1a;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }
        .compact-container {
            background: #2d2d2d;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            max-width: ${width}px;
            width: 100%;
            overflow: hidden;
            animation: slideIn 0.3s ease-out;
            border: 1px solid #3d3d3d;
        }
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .header {
            background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
            color: #e2e8f0;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #3d3d3d;
        }
        .header h3 {
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .timer-badge {
            background: rgba(255, 255, 255, 0.15);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            color: #cbd5e0;
        }
        .content {
            padding: 15px;
        }
        .image-container {
            width: 100%;
            height: ${height}px;
            background: #1a1a1a;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 15px;
            border: 1px solid #3d3d3d;
        }
        .image-container img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .loading {
            color: #718096;
            font-size: 14px;
        }
        .error {
            color: #fc8181;
            font-size: 14px;
            padding: 20px;
            text-align: center;
        }
        .message {
            color: #e2e8f0;
            font-size: 14px;
            margin-bottom: 15px;
            padding: 12px;
            background: #1a1a1a;
            border-radius: 6px;
            border-left: 3px solid #4a5568;
        }
        .actions {
            display: flex;
            gap: 8px;
        }
        .btn {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .btn:active {
            transform: translateY(0);
        }
        .btn-primary {
            background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
            color: #e2e8f0;
            border: 1px solid #4a5568;
        }
        .btn-primary:hover {
            background: linear-gradient(135deg, #5a6678 0%, #3d4758 100%);
        }
        .btn-secondary {
            background: #3d3d3d;
            color: #cbd5e0;
            border: 1px solid #4d4d4d;
        }
        .btn-secondary:hover {
            background: #4d4d4d;
        }
        .btn-text {
            background: transparent;
            color: #718096;
            font-size: 12px;
            border: 1px solid transparent;
        }
        .btn-text:hover {
            color: #a0aec0;
            background: rgba(255, 255, 255, 0.05);
        }
        .tips {
            margin-top: 10px;
            padding: 10px;
            background: rgba(74, 85, 104, 0.2);
            border-radius: 6px;
            font-size: 12px;
            color: #a0aec0;
            line-height: 1.5;
            border: 1px solid #3d3d3d;
        }
    </style>
</head>
<body>
    <div class="compact-container">
        <div class="header">
            <h3>
                <span>⏰</span>
                <span>休息提醒</span>
            </h3>
            ${
              autoCloseText
                ? `<span class="timer-badge">${autoCloseText}</span>`
                : ""
            }
        </div>
        <div class="content">
            <div class="image-container" id="imageContainer">
                <div class="loading">加载中...</div>
            </div>
            <div class="message">${title}</div>
            <div class="actions">
                <button class="btn btn-primary" onclick="handleAction('rest')">
                    ✅ 休息
                </button>
                <button class="btn btn-secondary" onclick="handleAction('delay')">
                    ⏰ 延迟
                </button>
                <button class="btn btn-text" onclick="handleAction('stop')">
                    暂停
                </button>
            </div>
            <div class="tips">
                💡 建议：远眺窗外20秒，放松眼部肌肉
            </div>
        </div>
    </div>
    ${getImageScript(imageUrl)}
</body>
</html>`;
}

/**
 * 生成完整模式提醒页面（夜间模式）
 */
function getFullReminderHtml(imageUrl, title, autoCloseTime, windowSize) {
  const { width, height } = getWindowSize(windowSize);
  const autoCloseText =
    autoCloseTime > 0 ? `（${autoCloseTime}秒后自动关闭）` : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .container {
            background: #2d2d2d;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
            max-width: ${width + 100}px;
            width: 90%;
            text-align: center;
            animation: slideIn 0.5s ease-out;
            border: 1px solid #3d3d3d;
        }
        @keyframes slideIn {
            from { 
                opacity: 0; 
                transform: translateY(-30px); 
            }
            to { 
                opacity: 1; 
                transform: translateY(0); 
            }
        }
        h1 {
            color: #e2e8f0;
            margin: 0 0 20px 0;
            font-size: 28px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        .image-container {
            margin: 20px 0;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            background: #1a1a1a;
            height: ${height}px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #3d3d3d;
        }
        img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .loading {
            color: #718096;
            font-size: 16px;
        }
        .error {
            color: #fc8181;
            padding: 20px;
        }
        .button-group {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 20px;
        }
        button {
            padding: 12px 30px;
            font-size: 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }
        button:active {
            transform: translateY(0);
        }
        .btn-primary {
            background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
            color: #e2e8f0;
            border: 1px solid #4a5568;
        }
        .btn-primary:hover {
            background: linear-gradient(135deg, #5a6678 0%, #3d4758 100%);
        }
        .btn-secondary {
            background: linear-gradient(135deg, #805ad5 0%, #6b46c1 100%);
            color: #e2e8f0;
        }
        .btn-secondary:hover {
            background: linear-gradient(135deg, #9065e5 0%, #7b56d1 100%);
        }
        .btn-danger {
            background: linear-gradient(135deg, #fc8181 0%, #f56565 100%);
            color: white;
        }
        .btn-danger:hover {
            background: linear-gradient(135deg, #ff9191 0%, #ff7575 100%);
        }
        .timer {
            color: #a0aec0;
            font-size: 14px;
            margin-top: 10px;
        }
        .tips {
            margin-top: 20px;
            padding: 15px;
            background: rgba(74, 85, 104, 0.2);
            border-radius: 8px;
            color: #cbd5e0;
            font-size: 14px;
            line-height: 1.6;
            border: 1px solid #3d3d3d;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌟 ${title}</h1>
        <div class="image-container" id="imageContainer">
            <div class="loading">加载图片中...</div>
        </div>
        <div class="button-group">
            <button class="btn-primary" onclick="handleAction('rest')">
                ✅ 好的，休息一下
            </button>
            <button class="btn-secondary" onclick="handleAction('delay')">
                ⏰ 再工作 5 分钟
            </button>
            <button class="btn-danger" onclick="handleAction('stop')">
                ⏸️ 暂停提醒
            </button>
        </div>
        <div class="timer">${autoCloseText}</div>
        <div class="tips">
            💡 建议：远眺窗外、活动颈椎、做做眼保健操，让眼睛和身体都休息一下吧！
        </div>
    </div>
    ${getImageScript(imageUrl)}
</body>
</html>`;
}

/**
 * 生成预览页面 HTML（夜间模式）
 */
function getPreviewHtml(imageUrl, windowSize) {
  const { width, height } = getWindowSize(windowSize);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>图片预览</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #1a1a1a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .container {
            background: #2d2d2d;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            max-width: ${width + 40}px;
            width: 90%;
            border: 1px solid #3d3d3d;
        }
        h2 {
            margin: 0 0 15px 0;
            color: #e2e8f0;
            font-size: 20px;
        }
        .image-container {
            width: 100%;
            height: ${height}px;
            background: #1a1a1a;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 15px;
            border: 1px solid #3d3d3d;
        }
        img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .loading {
            color: #718096;
        }
        .error {
            color: #fc8181;
            padding: 20px;
            text-align: center;
        }
        button {
            width: 100%;
            padding: 10px;
            background: #4a5568;
            color: #e2e8f0;
            border: 1px solid #5a6678;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }
        button:hover {
            background: #5a6678;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>🖼️ 图片预览</h2>
        <div class="image-container" id="imageContainer">
            <div class="loading">加载中...</div>
        </div>
        <button onclick="handleAction('close')">关闭</button>
    </div>
    ${getImageScript(imageUrl)}
</body>
</html>`;
}

/**
 * 生成统计页面 HTML（保持原风格或也可以改为夜间）
 */
function getStatisticsHtml(stats) {
  const chartData = stats.last7Days.map((d) => ({
    date: d.date.substring(5),
    count: d.count,
  }));

  const maxCount = Math.max(...chartData.map((x) => x.count), 1);
  const bars = chartData
    .map((d) => {
      const height = (d.count / maxCount) * 200;
      return `
        <div class="bar-container">
            <div class="bar" style="height: ${height}px;">
                ${d.count > 0 ? `<div class="bar-value">${d.count}</div>` : ""}
            </div>
            <div class="bar-label">${d.date}</div>
        </div>
        `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>休息统计</title>
    ${getStatisticsStyles()}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 休息统计报告</h1>
            <p>追踪你的休息习惯，关爱健康</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="icon">🎯</div>
                <div class="label">今日休息</div>
                <div class="value">${stats.today.count}</div>
                <div class="subtitle">共 ${stats.today.minutes} 分钟</div>
            </div>

            <div class="stat-card">
                <div class="icon">📅</div>
                <div class="label">本周休息</div>
                <div class="value">${stats.thisWeek.count}</div>
                <div class="subtitle">共 ${stats.thisWeek.minutes} 分钟</div>
            </div>

            <div class="stat-card">
                <div class="icon">🏆</div>
                <div class="label">累计休息</div>
                <div class="value">${stats.total.count}</div>
                <div class="subtitle">共 ${stats.total.hours} 小时 ${
    stats.total.minutes % 60
  } 分钟</div>
            </div>

            <div class="stat-card">
                <div class="icon">⏱️</div>
                <div class="label">使用天数</div>
                <div class="value">${stats.total.useDays}</div>
                <div class="subtitle">平均每天 ${(
                  stats.total.count / stats.total.useDays
                ).toFixed(1)} 次</div>
            </div>
        </div>

        <div class="chart-card">
            <h2>📈 最近 7 天休息趋势</h2>
            <div class="chart">${bars}</div>
        </div>

        <div class="tips">
            <h3>💡 健康小贴士</h3>
            <ul>
                <li>建议每工作 25-30 分钟休息一次，遵循番茄工作法</li>
                <li>休息时远眺窗外至少 20 秒，放松眼部肌肉</li>
                <li>每天至少休息 8 次以上，累计约 4 小时工作时间</li>
                <li>保持良好的休息习惯可以提高工作效率和身体健康</li>
            </ul>
        </div>

        <div class="actions">
            <button class="btn-danger" onclick="clearStats()">🗑️ 清除统计数据</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function clearStats() {
            if (confirm('确定要清除所有统计数据吗？此操作不可恢复！')) {
                vscode.postMessage({ command: 'clearStats' });
            }
        }
    </script>
</body>
</html>`;
}

/**
 * 统计页面样式（保持彩色，或改为夜间模式）
 */
function getStatisticsStyles() {
  return `<style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 36px;
            margin-bottom: 10px;
        }
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            transition: transform 0.3s ease;
        }
        .stat-card:hover {
            transform: translateY(-5px);
        }
        .stat-card .icon {
            font-size: 40px;
            margin-bottom: 10px;
        }
        .stat-card .label {
            color: #7f8c8d;
            font-size: 14px;
            margin-bottom: 5px;
        }
        .stat-card .value {
            color: #2c3e50;
            font-size: 32px;
            font-weight: bold;
        }
        .stat-card .subtitle {
            color: #95a5a6;
            font-size: 12px;
            margin-top: 5px;
        }
        .chart-card {
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            margin-bottom: 30px;
        }
        .chart-card h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 24px;
        }
        .chart {
            display: flex;
            align-items: flex-end;
            justify-content: space-around;
            height: 250px;
            padding: 20px 0;
            border-bottom: 2px solid #ecf0f1;
        }
        .bar-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
        }
        .bar {
            width: 40px;
            background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
            border-radius: 5px 5px 0 0;
            position: relative;
            transition: all 0.3s ease;
            min-height: 5px;
        }
        .bar:hover {
            opacity: 0.8;
        }
        .bar-value {
            position: absolute;
            top: -25px;
            font-size: 12px;
            font-weight: bold;
            color: #2c3e50;
        }
        .bar-label {
            margin-top: 10px;
            font-size: 12px;
            color: #7f8c8d;
        }
        .actions {
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        button {
            padding: 12px 30px;
            font-size: 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }
        .btn-danger {
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
            color: white;
        }
        .tips {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            margin-top: 20px;
        }
        .tips h3 {
            color: #2c3e50;
            margin-bottom: 15px;
        }
        .tips ul {
            list-style: none;
            padding: 0;
        }
        .tips li {
            padding: 8px 0;
            color: #555;
            line-height: 1.6;
        }
        .tips li:before {
            content: "✓ ";
            color: #27ae60;
            font-weight: bold;
            margin-right: 8px;
        }
    </style>`;
}

/**
 * 图片加载脚本
 */
function getImageScript(imageUrl) {
  return `<script>
        const vscode = acquireVsCodeApi();
        
        function handleAction(action) {
            vscode.postMessage({ command: action });
        }

        const img = new Image();
        const container = document.getElementById('imageContainer');
        
        img.onload = function() {
            container.innerHTML = '';
            container.appendChild(img);
        };
        
        img.onerror = function() {
            container.innerHTML = '<div class="error">❌ 图片加载失败<br/>请检查图片URL是否正确</div>';
        };
        
        img.src = '${imageUrl}';
        img.alt = '休息提醒图片';
    </script>`;
}

module.exports = {
  WebviewManager,
  getStatisticsHtml,
  getCompactReminderHtml,
  getFullReminderHtml,
  getPreviewHtml,
};
