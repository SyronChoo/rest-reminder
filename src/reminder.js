const vscode = require("vscode");
const { WebviewManager } = require("./webview");

/**
 * 提醒管理器
 */
class ReminderManager {
  /**
   * @param {vscode.ExtensionContext} context
   * @param {import('./statistics').StatisticsManager} statisticsManager
   * @param {import('./statusBar').StatusBarManager} statusBarManager
   */
  constructor(context, statisticsManager, statusBarManager) {
    this.context = context;
    this.statisticsManager = statisticsManager;
    this.statusBarManager = statusBarManager;
    this.webviewManager = new WebviewManager(context);

    this.timer = null;
    this.startTime = null;
    this.statusUpdateTimer = null;
  }

  /**
   * 开始提醒
   */
  start() {
    this.stop();

    const config = vscode.workspace.getConfiguration("restReminder");
    const interval = config.get("interval", 30);

    this.startTime = Date.now();
    this.statusBarManager.update();
    this.statusBarManager.show();

    // 设置提醒定时器
    this.timer = setInterval(() => {
      this.showReminder();
    }, interval * 60 * 1000);

    // 设置状态栏更新定时器
    this.statusUpdateTimer = setInterval(() => {
      if (!this.timer) {
        clearInterval(this.statusUpdateTimer);
        return;
      }
      this.statusBarManager.update();
    }, 1000);
  }

  /**
   * 停止提醒
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.startTime = null;
      this.statusBarManager.update();
    }
    if (this.statusUpdateTimer) {
      clearInterval(this.statusUpdateTimer);
      this.statusUpdateTimer = null;
    }
  }

  /**
   * 显示提醒
   */
  showReminder() {
    const config = vscode.workspace.getConfiguration("restReminder");
    const interval = config.get("interval", 30);
    const messageTemplate = config.get(
      "message",
      "该休息一下了！已经工作了 {time} 分钟"
    );
    const showImage = config.get("showImage", true);
    const imageUrl = config.get("imageUrl", "");
    const reminderStyle = config.get("reminderStyle", "compact");

    const message = messageTemplate.replace("{time}", interval);

    // 根据样式显示不同的提醒
    if (reminderStyle === "notification") {
      // 仅显示通知
      vscode.window
        .showWarningMessage(
          message,
          "好的，休息一下",
          "再工作 5 分钟",
          "暂停提醒"
        )
        .then((selection) => this.handleResponse(selection));
    } else if (showImage && imageUrl) {
      // 显示图片面板（紧凑或完整模式）
      this.webviewManager.showReminderPanel(
        message,
        imageUrl,
        reminderStyle,
        (action) => this.handleResponse(action)
      );
    } else {
      // 显示文字通知
      vscode.window
        .showWarningMessage(
          message,
          "好的，休息一下",
          "再工作 5 分钟",
          "暂停提醒"
        )
        .then((selection) => this.handleResponse(selection));
    }

    // 重置开始时间
    this.startTime = Date.now();
  }

  /**
   * 处理用户响应
   * @param {string} selection - 用户选择
   */
  handleResponse(selection) {
    if (selection === "好的，休息一下") {
      this.statisticsManager.recordRest();
      this.startTime = Date.now();
      this.webviewManager.closePanel();
    } else if (selection === "再工作 5 分钟") {
      this.stop();
      setTimeout(() => {
        this.start();
      }, 5 * 60 * 1000);
      vscode.window.showInformationMessage("已延迟 5 分钟后再次提醒");
      this.webviewManager.closePanel();
    } else if (selection === "暂停提醒") {
      this.stop();
      vscode.window.showInformationMessage("已暂停提醒");
      this.webviewManager.closePanel();
    }
  }

  /**
   * 显示图片预览
   * @param {string} imageUrl - 图片URL
   */
  showPreview(imageUrl) {
    this.webviewManager.showPreviewPanel(imageUrl);
  }

  /**
   * 是否正在运行
   * @returns {boolean}
   */
  isRunning() {
    return this.timer !== null;
  }

  /**
   * 获取开始时间
   * @returns {number|null}
   */
  getStartTime() {
    return this.startTime;
  }

  /**
   * 清理资源
   */
  dispose() {
    this.stop();
    this.webviewManager.dispose();
  }
}

module.exports = { ReminderManager };
