const vscode = require("vscode");

/**
 * 状态栏管理器
 */
class StatusBarManager {
  /**
   * @param {vscode.ExtensionContext} context
   * @param {import('./statistics').StatisticsManager} statisticsManager
   */
  constructor(context, statisticsManager) {
    this.context = context;
    this.statisticsManager = statisticsManager;

    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.command = "rest-reminder.showStatistics";
    context.subscriptions.push(this.item);
  }

  /**
   * 更新状态栏显示
   */
  update() {
    const config = vscode.workspace.getConfiguration("restReminder");
    const enableStats = config.get("enableStatistics", true);

    if (!enableStats) {
      this.item.hide();
      return;
    }

    const stats = this.statisticsManager.getStatistics();

    // 尝试从 reminder 获取时间信息（通过全局状态）
    const reminderState = this.context.globalState.get("reminderState") || {};

    if (reminderState.isRunning && reminderState.startTime) {
      const interval = config.get("interval", 30);
      const elapsed = Math.floor(
        (Date.now() - reminderState.startTime) / 1000 / 60
      );
      const remaining = interval - elapsed;
      if (remaining > 0) {
        this.item.text = `$(clock) ${remaining}分 | 今日${stats.today.count}次`;
        this.item.tooltip = "点击查看统计详情";
      }
    } else {
      this.item.text = `$(graph) 今日休息 ${stats.today.count} 次`;
      this.item.tooltip = "点击查看统计详情";
    }
  }

  /**
   * 显示状态栏
   */
  show() {
    this.item.show();
  }

  /**
   * 隐藏状态栏
   */
  hide() {
    this.item.hide();
  }

  /**
   * 清理资源
   */
  dispose() {
    this.item.dispose();
  }
}

module.exports = { StatusBarManager };
