const vscode = require("vscode");
const { getWeekKey, getDateFromWeek } = require("./utils");
const { getStatisticsHtml } = require("./webview");

/**
 * 统计管理器
 */
class StatisticsManager {
  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this.context = context;
    this.panel = null;
  }

  /**
   * 初始化统计数据
   */
  init() {
    const stats = this.context.globalState.get("restStatistics");
    if (!stats) {
      this.context.globalState.update("restStatistics", {
        totalRestCount: 0,
        totalRestMinutes: 0,
        dailyRecords: {},
        weeklyRecords: {},
        firstUseDate: new Date().toISOString(),
      });
    }
  }

  /**
   * 记录一次休息
   */
  async recordRest() {
    const config = vscode.workspace.getConfiguration("restReminder");
    if (!config.get("enableStatistics", true)) {
      return;
    }

    const stats = this.context.globalState.get("restStatistics") || {
      totalRestCount: 0,
      totalRestMinutes: 0,
      dailyRecords: {},
      weeklyRecords: {},
      firstUseDate: new Date().toISOString(),
    };

    const now = new Date();
    const dateKey = now.toISOString().split("T")[0];
    const weekKey = getWeekKey(now);
    const interval = config.get("interval", 30);

    // 更新总计
    stats.totalRestCount++;
    stats.totalRestMinutes += interval;

    // 更新每日记录
    if (!stats.dailyRecords[dateKey]) {
      stats.dailyRecords[dateKey] = {
        count: 0,
        minutes: 0,
        records: [],
      };
    }
    stats.dailyRecords[dateKey].count++;
    stats.dailyRecords[dateKey].minutes += interval;
    stats.dailyRecords[dateKey].records.push({
      time: now.toISOString(),
      duration: interval,
    });

    // 更新每周记录
    if (!stats.weeklyRecords[weekKey]) {
      stats.weeklyRecords[weekKey] = {
        count: 0,
        minutes: 0,
      };
    }
    stats.weeklyRecords[weekKey].count++;
    stats.weeklyRecords[weekKey].minutes += interval;

    // 清理旧数据
    this.cleanOldData(stats, now);

    await this.context.globalState.update("restStatistics", stats);
  }

  /**
   * 清理旧数据
   * @param {Object} stats - 统计数据
   * @param {Date} now - 当前时间
   */
  cleanOldData(stats, now) {
    // 只保留最近90天的每日记录
    const cleanedDailyRecords = {};
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    Object.keys(stats.dailyRecords).forEach((key) => {
      if (new Date(key) >= ninetyDaysAgo) {
        cleanedDailyRecords[key] = stats.dailyRecords[key];
      }
    });
    stats.dailyRecords = cleanedDailyRecords;

    // 只保留最近12周的每周记录
    const cleanedWeeklyRecords = {};
    const twelveWeeksAgo = new Date(
      now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000
    );
    Object.keys(stats.weeklyRecords).forEach((key) => {
      const [year, week] = key.split("-W");
      const weekDate = getDateFromWeek(parseInt(year), parseInt(week));
      if (weekDate >= twelveWeeksAgo) {
        cleanedWeeklyRecords[key] = stats.weeklyRecords[key];
      }
    });
    stats.weeklyRecords = cleanedWeeklyRecords;
  }

  /**
   * 获取统计数据
   * @returns {Object} 统计数据
   */
  getStatistics() {
    const stats = this.context.globalState.get("restStatistics") || {
      totalRestCount: 0,
      totalRestMinutes: 0,
      dailyRecords: {},
      weeklyRecords: {},
      firstUseDate: new Date().toISOString(),
    };

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const thisWeek = getWeekKey(now);

    const todayStats = stats.dailyRecords[today] || {
      count: 0,
      minutes: 0,
      records: [],
    };
    const weekStats = stats.weeklyRecords[thisWeek] || { count: 0, minutes: 0 };

    // 获取最近7天的统计
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0];
      const dayStats = stats.dailyRecords[dateKey] || { count: 0, minutes: 0 };
      last7Days.push({
        date: dateKey,
        count: dayStats.count,
        minutes: dayStats.minutes,
      });
    }

    // 计算使用天数
    const firstUse = new Date(stats.firstUseDate);
    const useDays = Math.floor((now - firstUse) / (1000 * 60 * 60 * 24)) + 1;

    return {
      total: {
        count: stats.totalRestCount,
        minutes: stats.totalRestMinutes,
        hours: Math.floor(stats.totalRestMinutes / 60),
        useDays: useDays,
      },
      today: todayStats,
      thisWeek: weekStats,
      last7Days: last7Days,
    };
  }

  /**
   * 显示统计面板
   */
  showPanel() {
    const stats = this.getStatistics();

    // 如果已有面板，先关闭
    if (this.panel) {
      this.panel.dispose();
    }

    // 创建 webview 面板
    this.panel = vscode.window.createWebviewPanel(
      "restStatistics",
      "休息统计",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    // 设置 HTML 内容
    this.panel.webview.html = getStatisticsHtml(stats);

    // 监听来自 webview 的消息
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        if (message.command === "clearStats") {
          vscode.commands.executeCommand("rest-reminder.clearStatistics");
        }
      },
      undefined,
      this.context.subscriptions
    );

    // 面板关闭时清理
    this.panel.onDidDispose(
      () => {
        this.panel = null;
      },
      null,
      this.context.subscriptions
    );
  }

  /**
   * 清除所有统计数据
   */
  async clearAll() {
    await this.context.globalState.update("restStatistics", null);
    this.init();
  }

  /**
   * 清理资源
   */
  dispose() {
    if (this.panel) {
      this.panel.dispose();
    }
  }
}

module.exports = { StatisticsManager };
