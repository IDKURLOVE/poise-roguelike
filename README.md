# POISE // 破防之隙

单文件 HTML5 Canvas 动作肉鸽。削韧破防、海克斯改写规则、多模式无尽推进。

**Developer: [POPOult](https://github.com/POPOult)**

## 玩

直接用浏览器打开 `index.html`，无需构建、无需服务器。

```
WASD          移动
Space         闪避
J / 左键      轻击
K / 右键      重击
Esc           暂停 / 放弃
R             重开
M             模式大厅
A             成就
F1            埋点调试
```

## 模式

| 模式 | 说明 |
|------|------|
| 无尽 | 主模式，每 5 层出口结算 |
| 战役 | 12 层 + Boss，通关解锁竞技场 |
| Boss 连战 | 精英车轮 |
| 竞技场 | 90 秒生存 |
| 挑战之书 | 12 条固定规则 |
| 自定义 | 修饰器自由堆叠 |
| 每日种子 | 当日同种子 + 本地排行 |

## 角色

- **刃** 近战 · 贴脸削韧
- **弦** 远程 · 移动射击 · 弹丸海克斯
- **盾** 坦克 · 闪避后格挡减伤

## 开发

```bash
# 自动化（需本机 Chrome + playwright-core）
cd test
node test-all-modes.mjs
node test-ui-clicks.mjs
```

测试钩子：`window.__RG`

## 作者

保留署名。移除署名后用于二次商用请自行承担法律风险。

© 2026 POPOult
