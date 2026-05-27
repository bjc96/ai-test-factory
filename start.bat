@echo off
chcp 65001 >nul
title 智能测试工场 AI Test Factory

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装：https://nodejs.org
    pause
    exit /b 1
)

:: 检查 npm 依赖是否安装
if not exist "node_modules" (
    echo [信息] 首次运行，正在安装依赖...
    npm install --ignore-scripts
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

:: 清除 Electron 的 Node 模式（如果有）
set ELECTRON_RUN_AS_NODE=

:: 启动应用
echo [启动] 智能测试工场...
npm run dev:all
