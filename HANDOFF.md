# HANDOFF · 伪代码编译器 + 书本习题（CLRS 4th）

> 交接对象：WSL 里的新 dsh 会话（本文件由 Windows 侧旧 dsh 会话写于交接时）。
> 目标：接手后能**独立**构建、修改、验证这个工程，最好直接继续做「书本习题」相关的迭代。

## 0. 一句话现状

单文件网页版《数据结构与算法分析》伪代码编译器 + AI 评测（多评审+组长终审+驳回重审），
已把 CLRS《算法导论》第 4 版全书练习题加工成中文题库（**35 章 / 345 题**），
用户可在「书本习题」面板浏览/搜索/多选，一键加入自己的题库后作答。**排版刚修好一版，验证全绿。**

## 1. 位置

| 位置 | 状态 | 说明 |
|---|---|---|
| WSL `~/pseudo-compiler` | ✅ **权威工作副本（2026-09-24 起）** | 206 个文件；改代码只改这里，构建与验证也在这里跑 |
| `C:\Users\31883\Desktop\pseudo-compiler` | ✅ 已同步为新版（2026-09-24） | ⚠ **用户实际双击打开的就是这一份**（`file:///C:/Users/31883/Desktop/...`），所以每次改完 UI 必须同步覆盖它并提醒 Ctrl+F5。其中**源码类文件（shell.html / ui.js / 脚本）仍是旧的 52 项**，只更新了单文件成品 |
| `C:\Users\31883\Documents\codex\pseudo-compiler` | 旧排版（未同步） | 与桌面**覆盖前**那份字节相同，等于一份旧版备份，可当回滚用 |
| `C:\ProgramData\pseudo-compiler` | 备份源（555 只读） | 交接时那份；WSL 副本与它逐文件 md5 一致（成品除外，见下） |

## 2. 目录内容

```
伪代码编译器.html      ← 成品：单文件、零外部依赖（**695,328 字节**，2026-09-24 第二轮排版修复后；含书本数据内联）
shell.html             ← 页面骨架（CSS + DOM + 三个注入占位符）
ui.js                  ← 界面层：题目/多解/AI 评测/复杂度过虑/题库/书本习题（~80 KB）
core_py.js             ← 编译内核：词法→语法→语义→Python 目标码→复杂度代数→沙箱解释器（~171 KB）
book_data.js           ← 书本习题数据（window.PseudoBook = {...}，构建时注入）
book_data.json         ← 同上，纯 JSON（便于脚本处理）

_mk.js                 ← 构建：shell.html + book_data.js + core_py.js + ui.js → 伪代码编译器.html
_bookbuild.py          ← 书本数据合并：book_out/*.json → book_data.json / book_data.js（含去重、归章、改名）
_pdf9.py _pdf10.py _pdf11.py  ← 从桌面 CLRS PDF 抽文本/建目录索引/抽题（含跨页续接合并）
_cls.py _jobs.py       ← 预筛「需要写算法的题」并切成翻译批次 alg_jobs/jNNN.json
_report.py             ← 进度报告（哪些章已入库、还剩几批）
_qa2.py _qa3.py _finalqa.py _esc.py _chk.py _cnt.py _missing.py _dupfix.py _merge.py _meta.py _qcheck.py  ← 数据体检/一致性检查
_kt.js                 ← 内核回归（10 个经典算法：编译/执行/实测）
_startercheck.js       ← 检查 345 道题的起步模板是否都能编译
_entrycheck.js         ← 检查生成的函数头是否合法标识符
_smoke_book.js         ← 书本面板端到端（DOM 桩）：搜索/全选/导入/落盘/错误捕获
_smoke_disp*.js _smoke_search.js _smoke13.js ← 其他 UI 桩测试
_widthcheck.js _searchlogic.js _searchpy.js ← 排版宽度 / 搜索过滤逻辑检查
_fixcss.js             ← 本次排版修复用的补丁脚本（已执行过）

clrs_pages.txt         ← PDF 全文（2,623,585 字节，抽取自 1677 页）
clrs_toc.json          ← 目录树（8 部分 / 35 章 / 149 个习题小节）
clrs_book.json         ← 章节元信息 + 823 道原始练习题
clrs_exercises_raw.json← 抽题中间结果
clrs_alg_candidates.json ← 预筛后 496 道「可写算法」候选
clrs_alg_final.json    ← ⚠ 2 字节，空文件，可删
alg_jobs/              ← 46 个翻译任务包（j001~j046）
book_out/              ← 46 个翻译成品（j001~j046，每包 13 字段/题）
book_batches/          ← 早期粗批次，已被 alg_jobs 取代，可删
README.md              ← 旧说明（内容已过时）
```

## 3. 构建与验证（三条命令）

```bash
cd ~/pseudo-compiler
python3 _bookbuild.py          # 合并 book_out/*.json → book_data.json / book_data.js
node _mk.js                    # 重建伪代码编译器.html（应打印 inline#1~3 OK）
### 验证：
node _kt.js | tail -3          # 期望：compile 10/10 / run 10/10 / measured 10/10
node _startercheck.js | tail 1 # 期望：起步模板可编译: 345/345
node _smoke_book.js | tail -5  # 期望：运行时错误=[]，toast=已加入 345 题
python3 _qa2.py                # 期望：题数 345 / 章节 35 / 问题 0
python3 _report.py             # 期望：已完成加工的章 1~35，剩余 0 题
```

`_mk.js` 用环境变量 `PCDIR` 指定工程目录（不设则用当前目录的 `process.env.PCDIR`，实际是 `path.join(dir, ...)`）：
```bash
PCDIR=$PWD node _mk.js        # 保险写法
```

## 4. 数据结构

### 4.1 书本习题（book_data.json）
```json
{ "bookTitle": "...", "source": "CLRS 4th edition",
  "stats": { "chapters": 35, "exercises": 345 },
  "chapters": [
    { "num": "2", "title": "Getting Started", "titleCN": "入门",
      "part": "I Foundations", "partTitle": "基础", "count": 11,
      "exercises": [ {
        "ref": "2.1-1",            // 题号（书上印错时写成 "2.1-4·补"）
        "section": "2.1", "kind": "simulate", "kindCN": "模拟过程",
        "title": "插入排序过程演示",
        "statement": "完整中文题意（保留大写算法名与 Θ/O/Ω 记号，下标统一 1-based）",
        "entry": "insertion_sort",  // 建议入口函数名（导入时会清洗成合法标识符）
        "inputs": "数组 A[1..n] …", "outputs": "排序后的数组 A[1..n]",
        "hint": "一句话思路提示（不给完整代码）",
        "note": "书上原题里无法用代码表达的附要求，可为空串"
      } ] } ] }
```
`kind` 取值：`implement`(136) `design`(63) `modify`(62) `simulate`(56) `analyze`(28)。
纯证明/纯推导/判断对错/纯讨论题**按用户要求全部剔除**（原书 823 题 → 保留 345 题）。

### 4.2 翻译任务包（alg_jobs/jNNN.json）
```json
{ "job": "j002", "chapter": "2", "chapterTitle": "Getting Started",
  "items": [ { "ref": "2.1-1", "chapter": "2", "section": "2.1", "page": 52, "en": "英文原文" } ] }
```
对应成品在 `book_out/jNNN.json`，是**13 字段**的数组（缺字段会被 `_qa2.py` 报出来）。

### 4.3 用户题库（浏览器 localStorage）
- 主键 `pseudo-course-workbench-v1`（另有 `-backup` 与 3 个滚动快照 `-snap-0/1/2`）
- 结构：`[{ id, title, statement, notes, size, solutions:[{ id, name, code, outputs, badgeText, grade, fromBook }], currentSol, fromBook }]`
- `fromBook` = 书本题号，用于避免重复导入；改动会 350ms 防抖自动保存

## 5. 本次（交接前）最后改动：书本弹窗排版

用户反馈「左边太大、一个小框框占了大部分位置」，已修（**9 处替换，全部落在 `shell.html`**）：

1. `.modal-body` → `display:flex;flex-direction:column;gap:11px;min-width:0`
2. `.book-bar` → 加 `flex-wrap:wrap`、`margin-bottom:4px`
3. 新增 `#bookList{display:grid;grid-template-columns:repeat(auto-fill,minmax(430px,1fr));gap:8px;align-items:start;min-width:0}` + `#bookList .empty{grid-column:1/-1}`
4. `.book-part` → 加 `grid-column:1/-1`
5. `.book-ch` → 去 `margin-bottom`、加 `min-width:0`
6. `.book-ch-head` → 加 `position:sticky;top:-1px;z-index:1`（章节标题吸顶）
7. `.book-it input` → `.book-it input[type=checkbox]{flex:none;width:15px;height:15px;margin:3px 0 0;accent-color:var(--accent)}`
8. `.book-it-main` → `flex:1 1 auto;min-width:0`
9. 弹窗 `<div class="modal" style="width:min(940px,94vw)">` → `width:min(1240px,96vw);display:flex;flex-direction:column;overflow:hidden`
10. 内容区 `<div class="modal-body" style="max-height:64vh;overflow:auto">` → `max-height:70vh;min-height:52vh;overflow:auto;flex:1 1 auto`

验证（在 ProgramData 副本上实跑）：书本面板 35 章节卡 / 345 题、全选导入 → 题库 346 题、运行时错误 0；
内核回归 10/10；起步模板 345/345；单文件外部依赖 0。

### 5.1 第二轮修复（2026-09-24 · WSL 侧）：展开章节把整列顶空

用户**再次**反馈同一句话「左边太大，一个小框框占了大部分位置」。这次没有盲改 CSS，而是用无头 Edge
渲染 + DOM 几何实测定位真因：**`#bookList` 是 CSS grid，而网格行高取该行最高项**。
展开任一章节后（第 2 章 11 题 → 卡片高 1853px），与它同处一行的另一列只有一张 45px 的折叠卡，
于是那一列留下 **1816px 纯空白** —— 正是「一个小框 + 一大片空白」。
实测撑坏的程度：`bookList` 3098px，第 3 章被推到 y=2120。**这不是上次那 9 处 CSS 的问题，是 grid 行高耦合。**

修法（`shell.html` 4 处 + `ui.js` 1 处）：

1. `ui.js renderBook`：把 `var open = !!state.bookOpen[ch.num]` 提到建卡之前，卡片带类名 →
   `el('div', 'book-ch' + (open ? ' open' : ''))`
2. `#bookList .book-ch.open{grid-column:1/-1}` —— **展开的章节独占整行**，不再与折叠卡同行，根除列内空白
3. 展开卡内部改用多列排版：`columns:2;column-gap:30px`（特意不用 grid，避免再次行高耦合），
   并给 `.book-it`/`.book-sec` 加 `break-inside:avoid`、`.book-sec{break-after:avoid}` 防止小标题孤行
4. 顺带修好**吸顶静默失效**：`.book-ch` 原带 `overflow:hidden`，而 overflow:hidden 自身就是滚动容器，
   会让子元素的 `position:sticky` 永远动不了。去掉它、给头部 `border-radius:9px 9px 0 0` 补圆角，
   吸顶才真正生效（第 5 节声称的「章节标题吸顶」此前其实没生效）
5. 顺带去掉重复文案：部分标题原为 `ch.partTitle + ' · 第 N 章 ' + ch.title`，在「基础」这种跨 5 章的部分下
   只写首章标题、且与紧随其后的卡片完全重复 → 改为只显示 `ch.partTitle`

实测（无头 Edge，1440x900 与 1920x1080 两视口一致）：左列最大空白 **1816px → 50px**、右列 103px
（仅剩奇偶配对的半行，除非换瀑布流否则消不掉）；展开卡高 **1853 → 961px**；`bookList` **3098 → 2259px**；
吸顶实测：滚动 700px 后章头停在 139px（= 滚动容器内容盒顶 140px − 1px），确认生效；
展开卡内两栏平衡、无条目被切断、无小标题孤行。回归：内核 10/10、起步模板 345/345、面板运行时错误 0。

> 经验：这类「大片空白」缺陷 `_smoke_*.js` 那类 DOM 桩测不出来（它们只断言结构与文本）。
> 需要无头浏览器实测几何。本机可用 Windows Edge 无头截图/dump-dom，见第 7 节；截图只能用千问视觉看。


## 6. 已知问题 / 待办

1. **桌面写不进去**：Codex Windows 沙箱把可写根限制在 workspace(`C:\Users`) + `C:\ProgramData` + `%TEMP%`；
   `CODEX_PERMISSION_PROFILE=:workspace`，`config.toml` 里 `[windows] sandbox = "elevated"`。
   桌面 ACL 上其实有 `embar\CodexSandboxUsers:(M)`，但沙箱策略层仍拦。**WSL 里跑 dsh 不受此限。**
2. 桌面那份**曾经是**旧排版（694,432）。2026-09-24 已覆盖为新版（695,328，与 WSL 成品 md5 一致）。
   教训：**用户打开的是桌面那份**，只改 WSL 副本等于没改 —— 改完 UI 一律同步覆盖桌面 + 提醒 Ctrl+F5：
   `cp ~/pseudo-compiler/伪代码编译器.html "/mnt/c/Users/31883/Desktop/pseudo-compiler/伪代码编译器.html"`
3. `clrs_alg_final.json` 为空（2 字节）、`clrs_pages.txt` 曾是 2 字节（后在 ProgramData 副本里是完整 2.6 MB）——以 ProgramData 为准。
4. 第 1、3 章书上几乎全是证明/讨论题，所以只入库 2 题 / 1 题，属正常。
5. 用户在课程范围上可能还想「只留第 2~4、6~9、14~15、20~25 章」这类筛选 —— 面板已具备搜索+全选，不必改数据。

## 7. WSL 迁移记录（✅ 已完成 · 2026-09-24，由 WSL 侧新会话实跑）

迁移已执行完毕，**`~/pseudo-compiler` 即当前权威工作副本**；ProgramData 那份保留为备份源（其权限是 555 只读）。

```bash
cp -r "/mnt/c/ProgramData/pseudo-compiler/." ~/pseudo-compiler/
chmod -R u+rwX ~/pseudo-compiler     # ⚠ 必须：源文件是 555，拷过来也是只读，否则写不进成品

python3 _bookbuild.py            # ✅ translated refs 345 / chapters 35 / exercises 345
PCDIR=$PWD node _mk.js           # ✅ inline#1 OK(220282) #2 OK(166009) #3 OK(71983) → 694,845 字节
node _kt.js | tail -3            # ✅ compile 10/10 | run 10/10 | measured 10/10
node _startercheck.js | tail -1  # ✅ 起步模板可编译: 345/345
node _smoke_book.js | tail -5    # ✅ 运行时错误=[] / toast=已加入 345 题 / 导入后题库 346 题
python3 _qa2.py                  # ✅ 题数 345 / 章节 35 / 问题 0 / 每题字段集 OK
python3 _report.py               # ✅ 已完成加工 1~35 章 / 剩余 0 题
```

- 206 个文件与 ProgramData 副本**逐文件 md5 一致**；无 CRLF 行尾；成品 694,845 字节，
  新排版标记（1240px 弹窗 / 两列 grid / sticky 章节标题 / 15px 复选框 / 70vh 内容区）全在，旧值 `940px` 已不存在。
- **重建可复现**：跑完 `_bookbuild.py` + `_mk.js` 后 `book_data.js` 与成品 HTML 与原版**字节完全一致**
  （仅 `book_data.json` 的 JSON 排版不同，语义比对 `a == b` 为 True）。
- **已修：11 个 `_*.js` 写死的旧桌面路径**（`C:\Users\31883\Desktop\pseudo-compiler`）。
  原先 `_kt.js` / `_startercheck.js` / `_smoke_book.js` 在 WSL 直接报 `Cannot find module`。
  现统一解析为 `(process.env.PCDIR||__dirname)`，因此 `PCDIR=/别的副本 node _xx.js` 可指向任意目录。
  改动文件：`_kt.js _smoke_book.js _smoke_disp.js _smoke_disp2.js _smoke_disp3.js _smoke_disp4.js _smoke_search.js _smoke13.js _startercheck.js _entrycheck.js _widthcheck.js _searchlogic.js _j037check.js`
- 本机 WSL **有外网**（`api.deepseek.com` → 401 即可达），AI 评测可用；WSL 也能直接写桌面/ProgramData。

遗留（都不影响构建与验证链）：

1. `_smoke_disp.js` / `_smoke_disp2.js` / `_smoke_disp3.js` 是旧的一次性桩脚本，断言写在深层 `children[N]` 索引上，
   **在旧排版的桌面副本上同样报错**，属脚本自身过时；同族最新的 `_smoke_disp4.js` 正常通过，以它为准。
2. `_smoke13.js` 全部断言通过（`运行时错误=[]`）但进程不自行退出（桩里残留句柄），用 `timeout 25 node _smoke13.js` 跑。
3. `_searchlogic.js` 里「空关键字 → 345 题（应为 287）」是早期题数 287 留下的过期期望值，不是缺陷。

新端口提醒仍然有效：**新端口 = 新浏览器存储域**，AI 设置（Base URL/模型/Key）要重填一次；
用户题库在 localStorage、按域隔离，不会自动带过去（用页面里的「导出题库」/「导入」搬运）。

## 8. 用户偏好（务必遵守）

- 界面：不要 Python 代码面板、不要「插入模板」「规范化」按钮；题库入口在左侧；「当前题目/解法」可折叠；
- 评测面板只保留评测（复杂度一行足矣），不需要「运行实测 / 多解对比 / 引擎自检」标签；
- 评测语义：格式、语法、记号问题**一律不扣分**，只看算法思路与逻辑；多评审独立打分后由**组长 AI 终审**（不取平均），支持「驳回」申诉重审；
- 生成代码目标：**Python（标准 0-based 数组）**，但伪代码语言里数组**一律 1-based**；
- 评分过程不必输出大量进度文字，只给结果；
- 改完 UI 提醒用户 **Ctrl+F5** 强刷。
