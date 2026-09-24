# 数据结构与算法 · 伪代码编译器（单文件网页版）

直接双击 `伪代码编译器.html` 用浏览器打开即可使用，无需服务器、无需安装任何东西。

## 它做什么

针对《数据结构与算法分析》的课程作业，以**题目**为单位：

1. **题目**：可手打，也可上传 txt / md / py / cpp / 图片 / PDF；点「AI 摘取题目」让 AI 整理成完整题意，整理后仍可继续修改。
2. **伪代码 → 可运行代码**：内置编译器（词法/语法/语义 → 生成 JavaScript），**数组下标一律从 1 开始**（`A[1]` 就是第一个元素），关键字中英混用也可以（`如果/那么/结束` 与 `if/then/end` 等价）。
3. **复杂度分析**：
   - 静态推导：按循环嵌套、循环上界、递归结构给出量级与推导式；
   - **运行实测（更可靠）**：在多个规模 n 上真实运行，统计基本操作数/数组访问/写次数，做数据拟合给出 O(·) 及 R²、log-log 斜率；
   - 空间复杂度：静态给出。
4. **多解**：同一个题目下可放多个解法（如 DP 解 O(n) 与朴素解 O(n³)），一键对拍：同一批测试数据跑所有解法并比对输出是否一致。
5. **AI（可自己配置接口）**：「AI 自动编译」会 → 生成 2~3 个不同思路的解法 → 编译 → 把编译器诊断反馈给 AI 修复 → 再编译 → 综合检查（多解交叉验证输出一致性）。
6. **编辑器**：语法高亮、行号、**撤销/重做**（按钮 + Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z）。

## AI 接口配置

右上角「⚙ AI 设置」里填：协议（OpenAI 兼容 / Anthropic / Gemini）、Base URL、模型名、API Key。
常用预设：

| 服务 | Base URL | 协议 | 模型示例 |
| --- | --- | --- | --- |
| DeepSeek | https://api.deepseek.com/v1 | OpenAI 兼容 | deepseek-chat |
| 硅基流动 | https://api.siliconflow.cn/v1 | OpenAI 兼容 | Qwen/Qwen2.5-72B-Instruct |
| 智谱 | https://open.bigmodel.cn/api/paas/v4 | OpenAI 兼容 | glm-4-flash |
| OpenAI | https://api.openai.com/v1 | OpenAI 兼容 | gpt-4o-mini |
| Claude | https://api.anthropic.com | Anthropic | claude-3-5-sonnet-latest |
| Gemini | https://generativelanguage.googleapis.com | Gemini | gemini-1.5-flash |
| 本地 Ollama | http://localhost:11434/v1 | OpenAI 兼容 | qwen2.5:14b |

Key 只保存在本机浏览器 localStorage。浏览器直连需要服务端允许跨域（CORS），若被拦截请换允许跨域的网关。

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
- 交换 `swap A[i], A[j]`；注释 `//`；多语句一行用 `;` 分隔
- 内置函数：`len min max abs sqrt floor ceil pow sort reverse sum copy fill log2`

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `伪代码编译器.html` | **最终成品（单文件，双击即用）** |
| `core.js` | 编译器内核：词法/语法/语义、代码生成、复杂度分析、沙箱执行、拟合 |
| `ui.js` | 界面层：编辑器、题目/解法管理、AI 调用、报告渲染 |
| `shell.html` | 页面骨架与样式（含 `/*__CORE__*/` `/*__UI__*/` 注入位） |

修改 `core.js` / `ui.js` / `shell.html` 后，把三者重新合并即可得到新的单文件版本（把 core 与 ui 的内容替换进 shell 的两个占位注释处）。

## 内置自检

页面右上角「引擎自检」会跑 12 个标准算法（最大子段和 DP/枚举、二分查找、归并排序、0/1 背包、斐波那契递归、冒泡/插入/计数排序、Floyd 等），
检查：编译是否通过、1-based 下标是否正确、运行输出是否正确、实测复杂度是否与预期量级一致。
