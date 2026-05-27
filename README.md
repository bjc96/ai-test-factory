# 智能测试工场 AI Test Factory

AI 驱动的桌面软件——输入需求文档，自动生成企业标准测试用例 Excel 和 Playwright 自动化测试脚本。

## 快速开始

### 环境要求
- **Node.js** >= 18（[下载](https://nodejs.org)）
- **Claude Code CLI**（[安装](https://docs.anthropic.com/zh-CN/docs/claude-code/overview)）：`npm install -g @anthropic-ai/claude-code`
- **Git Bash**（Windows 自带或通过 Git 安装）

### 一键启动

```bash
# 双击运行
start.bat
```

或手动：

```bash
cd ai-test-factory
npm install --ignore-scripts
npm run dev:all
```

### 配置 Claude CLI 路径

如果 Claude CLI 不在默认路径，编辑 `config.json`：

```json
{
  "claude": {
    "paths": [
      "claude",
      "你的/自定义/claude.exe路径"
    ],
    "timeout": 600
  }
}
```

## 功能

| 功能 | 说明 |
|------|------|
| 需求分析 | 输入需求文本 → Claude AI 自动拆解功能点 + 测试点 |
| 测试用例生成 | 基于分析结果生成企业标准格式测试用例 |
| Excel 导出/导入 | 导出标准测试用例 Excel，支持修改后重新导入 |
| 自动化脚本 | 按用例生成 Playwright TypeScript 测试脚本，可直接运行 |
| 单用例脚本 | 每条用例支持独立生成脚本 |
| 示例文档 | 内置 3 份示例需求，开箱即用 |

## 输出目录

- Excel：`我的文档/AI-Test-Factory/test-cases/`
- 脚本：`我的文档/AI-Test-Factory/scripts/`

## 技术栈

Electron + Vue 3 + Element Plus + SQLite + Claude Code CLI + Playwright
