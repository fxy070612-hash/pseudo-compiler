# 伪代码编译器 · 单文件网页版（内置《算法导论》习题库）

一个**单文件、零外部依赖**的伪代码编译器：在浏览器里写伪代码 → 编译成可运行代码 → 静态推导 + 运行实测复杂度 → 多解法对拍 → 可选接入 AI 做题目整理与多评审评测。

**打开方式**：双击 `伪代码编译器.html` 即可。无服务器、无安装、无构建步骤、不联网也能用（只有 AI 功能需要自备 API Key）。

## 功能

- **题目**：可手打，也可导入 txt / md / py / cpp / 图片 / PDF，让 AI 整理成完整题意，之后仍可修改。
- **伪代码 → 可运行代码**：内置词法／语法／语义分析。**数组下标一律 1-based**（`A[1]` 就是第一个元素），关键字中英混用（`如果/那么/结束` 与 `if/then/end` 等价）。
- **复杂度分析**：
  - 静态推导：按循环嵌套、循环上界、递归结构给出量级与推导式；
  - **运行实测**：在多个规模 n 上真实运行，统计基本操作数／数组访问／写次数，做数据拟合给出 O(·) 与 R²、log-log 斜率；
  - 空间复杂度静态给出。
- **多解对照**：同一题目下放多个解法（如 DP 的 O(n) 与朴素 O(n³)），一键对拍：同一批数据跑所有解法并比对输出是否一致。
- **AI 评测**：多评审独立打分后由**组长 AI 终审**（不取平均），支持「驳回 + 申请重审」；「AI 自动编译」会生成 2~3 个不同思路的解法 → 编译 → 把编译器诊断反馈给 AI 修复 → 综合检查。
- **编辑器**：语法高亮、行号、撤销/重做（按钮与 Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z）。
- **书本习题库**：《算法导论》第 4 版 35 章 / 345 道**可编程**练习题（中文题意，纯证明/纯讨论题已剔除），支持搜索、多选、一键加入自己的题库后作答。

## AI 接口配置

右上角「⚙ AI 设置」填：协议（OpenAI 兼容 / Anthropic / Gemini）、Base URL、模型名、API Key。常用预设：

| 服务 | Base URL | 协议 | 模型示例 |
| --- | --- | --- | --- |
| DeepSeek | https://api.deepseek.com/v1 | OpenAI 兼容 | deepseek-chat |
| 硅基流动 | https://api.siliconflow.cn/v1 | OpenAI 兼容 | Qwen/Qwen2.5-72B-Instruct |
| 智谱 | https://open.bigmodel.cn/api/paas/v4 | OpenAI 兼容 | glm-4-flash |
| OpenAI | https://api.openai.com/v1 | OpenAI 兼容 | gpt-4o-mini |
| Claude | https://api.anthropic.com | Anthropic | claude-3-5-sonnet-latest |
| Gemini | https://generativelanguage.googleapis.com | Gemini | gemini-1.5-flash |
| 本地 Ollama | http://localhost:11434/v1 | OpenAI 兼容 | qwen2.5:14b |

Key 只保存在本机浏览器 localStorage，不会写进任何文件、也不会随本仓库分发。浏览器直连需要服务端允许跨域（CORS），被拦就换允许跨域的网关。

## 伪代码语法速查

```
function maxSubArray(A[1..n]) : int      // 数组声明 1..n；返回类型可省略
  cur = A[1]                            // 下标从 1 开始
  best = A[1]
  for i = 2 to n do                     // 也支持: 对于 i 从 2 到 n 做 ... 结束
    if cur > 0 then cur = cur + A[i] else cur = A[i] end
    if cur > best then best = cur end
  end
  return best
end
```

- 二维数组：`dp[1..n][1..W]`，访问 `dp[i][j]`
- 循环：`for i = 1 to n`、`for i = n downto 1`、`for i = 1 to n step 2`、`while 条件 do ... end`、`for x in A do ... end`
- 比较 `== != < <= > >=`；逻辑 `and or not`；整除 `div`；取模 `mod`
- 交换 `swap A[i], A[j]`；注释 `//`；一行多语句用 `;` 分隔
- 内置函数：`len min max abs sqrt floor ceil pow sort reverse sum copy fill log2`

## 构建（改源码后重新生成单文件）

成品 `伪代码编译器.html` 是**构建产物**，由 `shell.html` + `ui.js` + `core_py.js` + `book_data.js` 合并而成：

```bash
python3 _bookbuild.py          # book_out/*.json → book_data.json / book_data.js
PCDIR=$PWD node _mk.js         # shell.html + book_data.js + core_py.js + ui.js → 伪代码编译器.html
```

回归验证：

```bash
node _kt.js | tail -3            # 内核：compile 10/10 | run 10/10 | measured 10/10
node _startercheck.js | tail -1  # 起步模板可编译: 345/345
node _smoke_book.js | tail -5    # 书本面板端到端：运行时错误=[]、toast=已加入 345 题
python3 _qa2.py                  # 题库体检：题数 345 / 章节 35 / 问题 0
```

> 脚本用 `PCDIR` 指定工程目录（不设则用脚本自身所在目录），因此可以把某个副本当数据源：
> `PCDIR=/path/to/copy node _kt.js`。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `伪代码编译器.html` | **成品**（单文件，双击即用） |
| `shell.html` | 页面骨架与样式（含 `/*__BOOK__*/`、`/*__CORE__*/`、`/*__UI__*/` 三个注入位） |
| `ui.js` | 界面层：题目／多解／题库／书本习题面板／AI 评测 |
| `core_py.js` | 编译内核：词法→语法→语义→Python 目标码→复杂度代数→沙箱解释器 |
| `book_data.json` / `book_data.js` | 书本习题数据（35 章 / 345 题；构建时注入成品） |
| `book_out/` | 题目翻译成品（每题 13 字段），`_bookbuild.py` 的输入 |
| `_mk.js`、`_bookbuild.py` | 构建脚本 |
| `_kt.js`、`_startercheck.js`、`_smoke_book.js`、`_qa2.py`、`_report.py` | 回归与体检脚本 |
| `HANDOFF.md` | 工程交接与历史修复记录（含根因、实测数据与踩坑） |
| `README.legacy.md` | 旧版说明（部分内容已过时，保留备查） |

**未随仓库分发**（`.gitignore` 已排除）：`clrs_pages.txt`（原著全书正文）、`clrs_book.json` / `clrs_exercises_raw.json` / `clrs_alg_candidates.json`（英文原题抓取）、`alg_jobs/` 与 `book_batches/`（含英文原文 `en` 字段的任务包）。
因此 `_pdf*.py`、`_cls.py`、`_jobs.py` 这几个「从 PDF 抽题 → 切翻译批次」的脚本克隆后无法直接运行；`_bookbuild.py` 与 `_mk.js` 可以正常跑。

## 关于书本习题数据的版权说明

`book_data.*` 与 `book_out/` 中的 345 道题，是针对《算法导论》（*Introduction to Algorithms*, 4th ed.）习题的**中文翻译与改写**，供个人学习使用；原著版权归 MIT Press 及作者所有。本仓库**不包含**原著正文与英文原题文本。若版权方提出异议，将立即移除相关数据。
