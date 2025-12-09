const vscode = require("vscode");
const { ReminderManager } = require("./src/reminder");
const { StatisticsManager } = require("./src/statistics");
const { StatusBarManager } = require("./src/statusBar");

let reminderManager;
let statisticsManager;
let statusBarManager;

/**
 * 插件激活时调用
 * @param {vscode.ExtensionContext} context - VSCode 扩展上下文
 */
function activate(context) {
  console.log("休息提醒插件已激活");

  // 初始化管理器
  statisticsManager = new StatisticsManager(context);
  statusBarManager = new StatusBarManager(context, statisticsManager);
  reminderManager = new ReminderManager(
    context,
    statisticsManager,
    statusBarManager
  );

  // 注册命令：开始提醒
  context.subscriptions.push(
    vscode.commands.registerCommand("rest-reminder.startReminder", () => {
      reminderManager.start();
      vscode.window.showInformationMessage("休息提醒已开始");
    })
  );

  // 注册命令：停止提醒
  context.subscriptions.push(
    vscode.commands.registerCommand("rest-reminder.stopReminder", () => {
      reminderManager.stop();
      vscode.window.showInformationMessage("休息提醒已停止");
    })
  );

  // 注册命令：设置间隔
  context.subscriptions.push(
    vscode.commands.registerCommand("rest-reminder.setInterval", async () => {
      const config = vscode.workspace.getConfiguration("restReminder");
      const currentInterval = config.get("interval", 30);

      const input = await vscode.window.showInputBox({
        prompt: "请输入提醒间隔（分钟）",
        value: currentInterval.toString(),
        validateInput: (value) => {
          const num = parseInt(value);
          if (isNaN(num) || num <= 0) {
            return "请输入大于 0 的数字";
          }
          return null;
        },
      });

      if (input) {
        await config.update("interval", parseInt(input), true);
        vscode.window.showInformationMessage(`提醒间隔已设置为 ${input} 分钟`);

        // 如果提醒正在运行，重启以应用新间隔
        if (reminderManager.isRunning()) {
          reminderManager.stop();
          reminderManager.start();
        }
      }
    })
  );

  // 注册命令：设置图片
  context.subscriptions.push(
    vscode.commands.registerCommand("rest-reminder.setImage", async () => {
      const config = vscode.workspace.getConfiguration("restReminder");
      const currentImage = config.get("imageUrl", "");

      const input = await vscode.window.showInputBox({
        prompt: "请输入图片URL（http/https）",
        value: currentImage,
        placeHolder: "https://example.com/image.jpg",
        validateInput: (value) => {
          if (value && !value.match(/^https?:\/\/.+/)) {
            return "请输入有效的 http 或 https 开头的URL";
          }
          return null;
        },
      });

      if (input !== undefined) {
        await config.update("imageUrl", input, true);
        if (input) {
          vscode.window.showInformationMessage("图片URL已更新");
        } else {
          vscode.window.showInformationMessage("图片URL已清空");
        }
      }
    })
  );

  // 注册命令：预览图片
  context.subscriptions.push(
    vscode.commands.registerCommand("rest-reminder.previewImage", () => {
      const config = vscode.workspace.getConfiguration("restReminder");
      const imageUrl = config.get("imageUrl", "");

      if (!imageUrl) {
        vscode.window.showWarningMessage("请先设置图片URL");
        return;
      }

      reminderManager.showPreview(imageUrl);
    })
  );

  // 注册命令：查看统计
  context.subscriptions.push(
    vscode.commands.registerCommand("rest-reminder.showStatistics", () => {
      statisticsManager.showPanel();
    })
  );

  // 注册命令：清除统计
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "rest-reminder.clearStatistics",
      async () => {
        const answer = await vscode.window.showWarningMessage(
          "确定要清除所有休息统计记录吗？",
          "确定",
          "取消"
        );

        if (answer === "确定") {
          statisticsManager.clearAll();
          vscode.window.showInformationMessage("统计记录已清除");
        }
      }
    )
  );

  // 监听配置变化
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("restReminder")) {
        statusBarManager.update();
      }
    })
  );

  // 初始化统计数据
  statisticsManager.init();

  // 自动启动
  const config = vscode.workspace.getConfiguration("restReminder");
  if (config.get("autoStart", true)) {
    reminderManager.start();
  }
}

/**
 * 插件停用时调用
 */
function deactivate() {
  if (reminderManager) {
    reminderManager.dispose();
  }
  if (statusBarManager) {
    statusBarManager.dispose();
  }
  if (statisticsManager) {
    statisticsManager.dispose();
  }
}

module.exports = {
  activate,
  deactivate,
};
