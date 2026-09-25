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
| `C:\Users\31883\Documents\pseudo-compiler` | ✅ 已同步为新版（2026-09-24 **改到此处**） | ⚠ **用户实际打开的就是这一份**（`file:///C:/Users/31883/Documents/pseudo-compiler/...`），每次改完 UI 必须同步覆盖它并提醒 Ctrl+F5。含 `app-icon.ico`（自绘图标，六个尺寸）。其中**源码类文件仍是旧的 52 项**，只更新了单文件成品 |
| 桌面 `C:\Users\31883\Desktop\` | 只剩快捷方式 | 用户明确要求**文件夹不要放桌面**，已迁至 Documents；桌面留 `伪代码编辑器.url`（本地）、`伪代码编辑器（GitHub仓库）.url`、`伪代码编辑器（应用窗口）.lnk`（Edge `--app` 无地址栏），开始菜单还有一个同名入口 |
| `C:\Users\31883\Documents\codex\pseudo-compiler` | 旧排版（未同步） | 与迁移前那份字节相同，等于一份旧版备份，可当回滚用 |
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
2. 用户实际打开的那份**已从桌面迁到** `C:\Users\31883\Documents\pseudo-compiler`（2026-09-24，用户要求桌面只留快捷方式）。
   教训：**用户打开的是这一份**，只改 WSL 副本等于没改 —— 改完 UI 一律同步覆盖它 + 提醒 Ctrl+F5：
   `cp ~/pseudo-compiler/伪代码编译器.html "/mnt/c/Users/31883/Documents/pseudo-compiler/伪代码编译器.html"`
   （迁移安全性已实测：`file://` 下 localStorage 与文件路径无关，挪文件夹不会丢用户题库。）
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

## 9. GitHub 仓库（2026-09-24 建立）

- 仓库：**https://github.com/fxy070612-hash/pseudo-compiler**（public，默认分支 `main`）
- remote：`origin = git@github.com:fxy070612-hash/pseudo-compiler.git`（SSH）
- 提交身份（仓库级）：`embar <3250102869@zju.edu.cn>`（与用户 math-hut 一致；想换成 GitHub noreply 邮箱就改 `git config user.email`）
- **push 前必读**：本机 `/etc/ssh/ssh_config.d/20-systemd-ssh-proxy.conf` 是坏软链，裸 `ssh` 会失败。
  已在仓库级固定绕过：`git config core.sshCommand "ssh -F /dev/null -i ~/.ssh/github_ed25519 -o IdentitiesOnly=yes"`
  密钥对在 `~/.ssh/github_ed25519`（公钥已加到账号）；github.com 已写入 `known_hosts`。
- **推送流程**：`git add -A && git commit -m "..." && git push`（`main` 已跟踪 `origin/main`）。
  ⚠️ **本机 push 会偶发「静默失败」**：命令零输出、退出码 0，但远程其实没更新（已遇到 2 次，均在当次重推后成功）。
  所以**每次都务必复核**：`git rev-parse HEAD` 与 `git ls-remote origin refs/heads/main` 必须相等。
  重推时用带保活的写法更稳：
  `GIT_SSH_COMMAND="ssh -F /dev/null -i ~/.ssh/github_ed25519 -o IdentitiesOnly=yes -o ServerAliveInterval=5" git push origin main`

### 9.1 入库范围（.gitignore 的取舍）

已上传 **94 个文件 / 2.31 MB**：全部代码、成品 `伪代码编译器.html`、中文题库数据（`book_data.*`、`book_out/`）。

**刻意不上传**（本地文件仍在，不影响构建与验证）：

| 排除项 | 原因 |
|---|---|
| `clrs_pages.txt`（2.6 MB） | 原著《算法导论》全书正文，公开仓库有版权风险 |
| `clrs_book.json` / `clrs_exercises_raw.json` / `clrs_alg_candidates.json` / `clrs_alg_final.json` | 英文原题抓取与候选筛选（原文文本） |
| `alg_jobs/` / `book_batches/` | 任务包含 `en` 英文字段 |

> 后果：`_pdf*.py`、`_cls.py`、`_jobs.py`（PDF→抽题→切批次）克隆后跑不了；`_bookbuild.py`、`_mk.js`
> 与全部回归脚本可正常运行，README 已写明。
> `book_out/` 是纯中文翻译成品（无 `en` 字段），保留是为了让 `_bookbuild.py` 克隆后仍可用。

### 9.2 远程核对（已实跑）

- 本地 `HEAD` 与 `origin/main` SHA 一致；远程 94 文件 / 2.31 MB；版权文件确认未混入。
- 经 API 取回远程成品与本地逐字节比对：**695,328 字节、md5 `f654fca7…`，完全一致**（含本轮排版修复，无旧值 `940px`、外部依赖 0）。
- ⚠️ `raw.githubusercontent.com` 在本机网络下**超时**（`github.com` 与 `api.github.com` 正常）；取文件请用 API `contents` 接口或 `git clone`。
- ⚠️ 推完记得同步桌面那份成品（第 6 节第 2 条）——**用户看的是桌面**，仓库更新不等于他看见了。

### 9.3 面向使用者的可发现性（2026-09-24 第二轮）

用户的诉求演进：上传 → 「别人方便下载使用」→「**别人也要看到书本题目**」。据此做的：

- `index.html`：入口页，打开自动跳到成品（URL 用百分号编码，本地实测能落到应用本体）。
- `docs/BOOK.md`：由 `_bookmd.py` 从 `book_data.json` 生成的**题单**（2804 行 / 389 KB，按章分节、含完整中文题意与输入/输出/提示），
  不下载应用也能在 GitHub 页面上直接读全部 345 题。
- `docs/screenshot-main.png`、`docs/screenshot-book-panel.png`：README 截图，由无头 Edge 渲染当前成品。**给他人看的仓库，截图比文字管用。**
- README 结构改为「怎么用 → 书本习题库 → 功能 → …」，把「只用不开发只需那一个 HTML 文件」写在最前。

用户的明确取舍（**别再自作主张**）：

1. **暂不开启 GitHub Pages** —— 所以 README 里**不要留**在线版链接（曾写过，已按用户要求删除）。
2. **不加 LICENSE**，保留默认版权（他人可查看/fork，但不能合法复制再分发）。

已实测（硬证据）：从 GitHub 经 API 取回成品 → 抽出内联的 `window.PseudoBook` 段 → 用 node 实际执行 →
**35 章 / 345 题 / 五种题型分布齐全**，`btnBook`/`bookList`/`bookSearch` 等面板元素都在。
即「别人下载后能看到书本题目」成立，不需要额外数据文件。

版本标签 `v1.0.0` 已推送（Tags 页可下载该快照 ZIP）。

### 9.4 用户桌面入口与自绘图标（2026-09-24）

用户诉求：「怎么方便打开」「文件夹不要放桌面」「图标好看一些」。

**入口（都在 Windows 侧，脚本可重建）**

| 入口 | 类型 | 内容 |
|---|---|---|
| 桌面 `伪代码编辑器.url` | InternetShortcut | 本地 `file://` 地址（离线可用，用户日常用这个） |
| 桌面 `伪代码编辑器（应用窗口）.lnk` | WScript.Shell 快捷方式 | `msedge.exe --app=<file url>`，无地址栏/标签页，像原生应用 |
| 桌面 `伪代码编辑器（GitHub仓库）.url` | InternetShortcut | 仓库页 |
| 开始菜单 `伪代码编辑器.url` | InternetShortcut | Win 键输入「伪代码」即可打开 |

**图标**：`C:\Users\31883\Documents\pseudo-compiler\app-icon.ico`（纯色 `#3b6ef5` 圆角方 + 白色 `{}`），
含 16/32/48/64/128/256 六个尺寸。由无头 Edge 渲染 256px + 纯 Python（无第三方库）面积平均缩放并打包 ICO。

踩坑记录（下一会话别重犯）：

1. **第一版图标被用户当场指出「有点奇怪」，是真的坏了**：`{ }` 里塞了细空格 + 负字距 → 整体偏右不居中；
   `border-radius` 用了 `vmin` 尺寸导致左右圆角不对称；加了渐变与 inset 阴影反而发脏；16px 下花括号糊成「L」。
   **教训：自绘图标的 256px 画布要用固定 px、单字符居中、纯色优先，并且做完必须自己先看（本模型不能读图 → 用千问视觉）。**
2. **Edge 小窗口渲染不出来**：`--window-size=48,48` 截出来是 100 多字节的空白图。
   正确做法：只渲染 256px，再用纯 Python 面积平均缩放（预乘 alpha）得到其它尺寸。
3. **Windows 图标缓存按路径记**：同名覆盖 `.ico` 常常不刷新 → 换新文件名（`app.ico` → `app-icon.ico`）并删旧文件，
   再跑 `ie4uinit.exe -show`。
4. 中文文件名/中文路径经 PowerShell 处理时，`.ps1` 必须写成 **UTF-8 带 BOM**，否则 PS 5.1 按 ANSI 读会乱码；
   而控制台里看到的中文乱码多半只是输出编码问题，**以 WSL 侧 `ls` 的真实文件名为准**。
5. 枚举窗口别用 `Get-Process msedge | MainWindowTitle`（Chromium 只报一个标题，会漏），要用 `EnumWindows`（user32）才准。

## 10. 部署到阿里云服务器（宝塔面板，2026-09-24）

**线上地址：http://112.124.28.206:86/** （用户指定用这个网址；已实测外网可达，0.47s）

| 项目 | 值 |
|---|---|
| 服务器 | 阿里云 ECS `112.124.28.206`，宝塔面板装在 `/www/server/panel`（面板端口 17273，安全入口 `/6d6092f9`） |
| 站点 | `/www/server/panel/vhost/nginx/112.124.28.206_86.conf`，`listen 86`，root `/www/wwwroot/112.124.28.206_86` |
| 部署内容 | `index.html` + `伪代码编译器.html`（同一份成品，695,328 字节，md5 `f654fca7…`） |
| 部署命令 | `~/pseudo-compiler/_deploy_server.sh`（上传 → 校验 md5 → install → 线上再校验，幂等） |
| 访问方式 | SSH：`ssh -F /dev/null -i ~/.ssh/anbao_key root@112.124.28.206`（**必须带 `-F /dev/null`**，本机 ssh_config.d 有坏软链） |

**原站点已归档、未删除**：:86 原先是个 Vite/React 小游戏「小莓爆尾大冒险｜50关爆破解谜」，用户明确说不要了，
内容整体搬到 `/www/backup/pseudo-compiler/archive-86-game-20260924/`（含 index.html / assets / manifest）。
另有用户自己早先的几份备份：`/www/wwwroot/112.124.28.206_86.{backup-books-20260829,backup-game-v11b-20260829,v12-backup-20260831-1650}`。
要回滚就把归档目录的内容搬回去。

**重要：数据不同源** ⚠️ `http://112.124.28.206:86/` 与本地 `file://` 是**两个不同的浏览器存储域**，
所以线上打开时题库是**空的**；用户既有的题库仍在本地 `file://` 域下（见第 11 节）。
要让两边同一份数据，必须做**服务端数据接口**（用户原话「把后端放到面板上」），否则只能手动导出/导入。

## 11. 用户数据（localStorage）备份 —— 未完成，下次继续

用户明确表达「总是担心数据丢了」。现状与已查明的事实：

- 用户确实有数据：Edge 配置 `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage\leveldb` 里存在
  `pseudo-course-workbench-v1` 等键，抽样可见题目「两个有序数组的中位数」及其解法。
- 应用的存储设计：主键 `pseudo-course-workbench-v1`，另有 `-backup` 与滚动快照 `-snap-0/1/2`、`-lastwrite`
  （见 `ui.js` 第 7~117 行）。**这些都在同一个 localStorage 里**，所以「清除浏览数据」会一次全没。
- 已实测：`file://` 下 localStorage **与文件路径无关**（同 origin），所以移动/改名文件夹不会丢数据。
- **导出思路（已验证到一半）**：把 `.../User Data/Default/Local Storage/leveldb` 复制到临时目录，
  用 `--user-data-dir` 指向它跑无头 Edge + 打开一个注入了 dump 脚本的应用副本，即可让浏览器自己吐出干净的 JSON。
  坑：**profile 必须放在 `<user-data-dir>/Default/` 下**（第一次放错层级 → 读出来 0 个键）；
  第二次修正后**无头 Edge 卡住超时**（300s），下次要加 `timeout` 并对单个文件失败容错，或改用 CDP。
- 最省事的兜底：让用户在本地文件里点一次「导出题库」，把 JSON 存到固定目录，再由脚本定期同步到服务器
  `/www/backup/pseudo-compiler/`。

> **2026-09-24 更新：此问题已由第 12 节的服务端后端解决**（数据存服务器，不再只活在浏览器里）。
> 上面这段「无头复制配置导出」的思路仍可作为离线取证手段，但日常不再需要。

## 12. 云端同步后端（2026-09-24 上线）：数据不再只活在浏览器里

用户诉求原话：「把数据都放在后端」「保持一致」「我之前的几道题也存进去」。

**架构：服务器上的题库 JSON 是唯一真相，localStorage 只当离线缓存。**

| 组件 | 位置 |
|---|---|
| 接口 | `http://112.124.28.206:86/api/bank.php`（`GET` 读 / `POST` 写，鉴权头 `X-Bank-Token`） |
| 接口文件 | `/www/wwwroot/112.124.28.206_86/api/bank.php`（PHP 8.2） |
| 数据 | `/www/wwwroot/pseudo_data/bank.json`（**在站点根之外**；无任何站点以 `/www/wwwroot` 为根 → 不可被公开访问） |
| 同步口令 | `/www/wwwroot/pseudo_data/token.txt`（`root:www 640`，48 位 hex）。**绝不写进公开页面或仓库**；用户那份在 `Documents\pseudo-compiler\同步口令.txt` |
| 写入历史 | 每次 POST 前自动留一份 → `/www/wwwroot/pseudo_data/history/`，保留 30 份 |
| 每日快照 | 计划任务 `30 3 * * *` 跑 `/www/backup/pseudo-compiler/daily_backup.sh`，保留 90 天 |

**应用侧实现**（`ui.js` 新增「云端同步」侧栏区块 + `shell.html` 对应 DOM）：`SYNC_URL` 硬编码在 `ui.js`；口令只存浏览器 localStorage（键 `pseudo-sync-config-v1`）。

- 改动后 **1.5 秒防抖上传**；内容与上次提交完全相同则不传（挡住 10 秒自动保存造成的无谓请求）
- 打开时自动对齐（`cloudBoot` → `syncPull`）：
  - 服务器为空 → 把本机题库推上去（**用户原有的几道题就是这样完成首次迁移的**）
  - 服务器较新 → 覆盖本机（覆盖前把本机另存到 `pseudo-course-workbench-before-cloud`）
  - 本机较新 → 推回服务器
- ⚠️ **安全护栏（改这块务必保留）**：启动时本机若无存档会自动生成一道「示例题」，它**不算本机题库**
  （判据 `state.restored === 0`），**绝不能拿它覆盖服务器上的真题**。
- 断网/接口失败只提示，不影响本地使用（离线照常写题）。
- **实测两条路径**（无头 Edge 打真实接口，测完已把服务器数据与探针页清理干净）：
  - 本机有题 → 界面「已同步到服务器 · 16:54」，服务器 GET 确认收到该题
  - 本机清空 → 界面「已与服务器对齐 · 1 题」，且本机 localStorage 确实写回（`LOCAL_BANK:1`）
- 关键前提也已实测：**`file://` 页面能跨域调用该接口**（返回 200），所以本地文件版、线上版、平板可以共用同一份数据。

**入口一致性**：桌面 `伪代码编辑器.url` = 本地文件（离线可用，同样会同步）；
桌面 `伪代码编辑器（应用窗口）.lnk` = `msedge --app http://112.124.28.206:86/`（线上版，数据在服务器）。

⚠️ 第 10/12 节把服务器地址写进了**公开仓库**的 HANDOFF。用户若在意暴露 IP:86，需要改成私有运维文档。

### 12.1 当天事故与两道护栏（2026-09-24，务必保留）

**症状**：用户反馈「只有一道题目，还是初始题目」。查服务器发现 `bank.json` 里存的是应用内置**示例题**
（「最大子段和」+ 三个解法），写入时间 16:58:19，而用户自己的题还在本机浏览器里。

**成因**：用户从 `http://112.124.28.206:86/`（**全新存储域，本机没有任何题库**）点了「上传」，
当时后端没有任何护栏，示例题就被推了上去。

**两道护栏（已实现并实测）**：

1. `syncPush`：`state.restored === 0`（本机没有自己的题库，只有启动示例题）时，
   **静默上传一律拒绝**；手动点「上传」会弹确认框，取消则不传。
2. `syncPull`：本机已有题库时，**自动对齐永不覆盖本机**，一律把本机推上去；
   只有手动点「下载」才会用服务器数据覆盖本机（覆盖前另存到 `pseudo-course-workbench-before-cloud`）。

⚠️ **不要用时间戳决定谁覆盖谁**：实测踩到——服务器上的示例题写入时间比用户真实的题库**新**，
按时间戳比较会用示例题顶掉用户的作业。数据丢失的不对称性决定了：**本机不可再生的作业永远优先**。

**实测证据**（无头 Edge 打真实接口，测完已清理，服务器现为空）：

| 测试 | 场景 | 期望 | 实测 |
|---|---|---|---|
| A | 服务器空 + 本机只有示例题 | 不上传 | 界面「服务器为空 · 本机也还没有题库」，服务器仍 `{"empty":true}` ✅ |
| B | 服务器有示例题 + 本机有真题（lastwrite = 3 天前） | 推本机、不覆盖 | 界面「已同步到服务器」，服务器内容变为 `['我的题A','我的题B']` ✅ |

**教训**：这类「谁覆盖谁」的逻辑必须**先把危险场景写成可复现测试**再改代码；我第一版用时间戳比较，
方向就是错的（第一轮测试还因为 `rm` 没生效而假通过，靠写入历史的时间线才发现）。

## 13. 驳回重审的公平性（2026-09-24）

用户反馈原话：「驳回会重新交给几个评委重新打分，组长重新审核，我现在每次驳回分都高一点，即使随便说的话」
「AI 不会被驳回带偏」「一切实事求是，不会顺着用户说」「检验了不对，就说明驳回是不对的」
「比如给出了四个问题、五个提醒都可以进行驳回」「每次重新 AI 测评后还会记得驳回内容」。

**病因**：旧实现是「一次组长调用」，提示词里带着**上一轮分数**和**各评审给分**（强锚定），
并且把模型返回的 `finalScore` 直接采纳——模型出于"体谅学生"总会悄悄加一两分，于是每驳回一次就涨一点。

**现在的设计（四层，缺一层都会漏）**：

| 层 | 做法 | 作用 |
|---|---|---|
| ① 评委纯盲评 | 重审时重新跑 N 位评委，**提示词里完全不含申诉内容**（`buildReviewerPrompt` 不接收申诉） | AI 从源头无从被申诉带偏 |
| ② 组长逐条裁定 | `AI_APPEAL_SYS` 硬性规则：申诉不是加分理由；不成立必须**直说**「这条驳回不成立，因为…」；不许奉承、不许无依据改判；发现原判过宽要下调；必须逐条给「成立/不成立」+ 理由；输出 `upheld` 与 `items` | 把「实事求是」写死进提示词 |
| ③ 程序化护栏 | `if (!upheld) ns = old;` —— 申诉不成立时**直接不采纳模型给的分数**，强制等于原分 | 提示词劝不住的，代码兜住 |
| ④ 记得但不受影响 | 驳回记录存进 `s.grade.appeals`；重新测评时**保留**该数组，并把历史申诉作为「只是背景、绝不代表应当加分」喂给组长；已裁定不成立的不得再当加分理由 | 既"记得"又"不带偏" |

**UI**：「问题」页里每一条问题/提醒（含 error/warn/info）右侧都有独立的「驳回」小按钮，
点它弹出驳回框、自动选中该条并预填理由模板；驳回记录展示逐条裁定与「维持原分」。

**实测（打桩 AI，16 项断言全绿，关键几条）**：

- 模型在重审里故意返回 `upheld:false, finalScore:95` → **界面分数仍是原分 78**（护栏生效）
- 评委提示词中出现申诉内容的条数 = **0**（纯盲评）
- 4 个问题 + 5 个提醒 = 9 条，每条都有驳回按钮；点某条后弹窗显示「本次只针对这一条」并预填理由
- 重新测评一次后，驳回记录仍在，且新测评的组长提示词里带上了历史申诉（带"不代表应加分"的告诫）

**注意**：`s.grade` 被重新赋值的地方有三处（`gradeWithAI` 成功、`gradeWithAI` 组长失败、
`submitReject`），三处都必须带上 `appeals`，否则驳回记录会被一次重新测评抹掉。

## 14. 真 Python 实测（AI 出例 + 服务器真跑）· 2026-09-24

用户原话：「这里编译实测应该直接通过 python 调用，并且 ai 随机给出几个例子，看看输出对不对」「不通过会报错」。

**为什么不能本地跑**：应用是单文件纯前端（零依赖、离线可用），浏览器里没有真 Python。
所以在服务器上加了执行端，应用用 `fetch` 调它；同时保留原有 JS 模拟路径作离线兜底。

### 14.1 执行链路（服务器侧）

| 组件 | 位置 |
|---|---|
| HTTP 入口 | `http://112.124.28.206:86/api/run`（nginx `location = /api/run` 反代到本机 8799） |
| 反代配置 | `/www/server/panel/vhost/nginx/extension/112.124.28.206_86/pseudo-runner.conf`（BT 的 extension include，不动主配置） |
| 服务 | `/www/server/pseudo_runner/runner_server.py`（Python http.server，只监听 127.0.0.1:8799，systemd `pseudo-runner`，并发上限 2） |
| 沙箱启动器 | `/usr/local/bin/pseudo_python_run` |
| 测试台 | `/www/wwwroot/pseudo_data/harness.py` |
| 鉴权 | 沿用题库口令头 `X-Bank-Token`（与 `bank.php` 同一串） |

**PHP 走不通**：宝塔的 php.ini 把 `exec/shell_exec/proc_open/popen/chown/chgrp...` 全禁了
（CLI 用的是另一个 ini，所以 `php -r` 测出来是"可用"，容易误判）。所以没用 PHP 做执行端。

**沙箱（实测结果）**：`unshare -n`（无网络，实测外连 BLOCKED）+ `ulimit -t 6 -v 400000 -u 64 -f 4096`
+ `timeout 8` 硬超时（死循环实测 8 秒被杀、不留结果文件）+ `runuser -u nobody` 降权
+ `python3 -I -S` 隔离模式 + 每请求独立临时目录 + out/ 目录单独授权给 nobody 写。
⚠️ 未做 mount 隔离，所以**世界可读的文件仍可被读到**（如 `/www/wwwroot/anbao_app/config.py` 是 755，
里面有 API Key；没有网络所以传不出去，但建议 `chmod 640` 收紧——那条属于生产配置，我没擅自改）。

**harness 的关键处理**（否则跑不起来）：编译器生成的是「独立可运行版」Python——
模块顶部有 `n = int(input())`、函数只收数组参数、循环上界引用全局 `n`。所以 harness 必须：
① 剥掉读 stdin 的前导与 `main()` 驱动；② 把用例参数注入命名空间（让全局 `n` 生效）；
③ 用 `inspect.signature` 只传函数真正声明的参数。

### 14.2 应用侧（ui.js）

- 评测面板动作行新增按钮「真 Python 实测」（与「驳回 · 申请重审」并排）。
- 流程：① 以**题目 + 函数签名为唯一输入**让 AI 随机出 4 组数据与期望值（`AI_CASE_SYS`）
  ——**故意不给它看学生代码**，否则它会照抄学生（可能有 bug 的）实现去猜期望值，比对就失去意义；
  ② `C.pyStandalone(res)` 取 Python 目标码，POST 到 `/api/run`；③ 逐例比对渲染成卡片。
- **不通过一律标红**：卡片顶部写「✗ 有 N 组输出与正确答案不一致」，逐条列 `期望 X，实际 Y，输入 …`；
  代码跑不起来时直接显示 `✗ 你的代码在 Python 里跑不起来：…`；全部通过则绿字「✓ N 组全部跑通」。
- 需要先在「云端同步」保存口令（执行端要鉴权）；断网/超时只提示，不影响其他功能。

### 14.3 顺带修掉一个会丢代码的 bug ⚠️

`gradeWithAI` 与 `doCompile` 里原本是无条件 `s.code = ed.value();`。
如果此刻编辑器里是空的（还没装载 / 装的是别的解法），点一次「AI 测评打分」或「编译」
就会把该解法的代码**清空并立刻落盘**。已被我的端到端测试真实踩到（发出的代码是空模板 `def solve(n)`）。

修法：`Editor` 记住 `ed.solId`（在载入编辑器时记录当前解法 id），新增 `adoptEditorCode(s)`
——**只有编辑器里装的正是这个解法时**才写回。`gradeWithAI`、`doCompile`、`ed.onChange` 三处都改用它。
⚠️ 不要把这三处改回无条件 `ed.value()`。

### 14.4 实测证据（无头浏览器走完整流程，测完已清理）

```
发出的代码 = def maxSubArray(A)…      entry = maxSubArray
执行端返回 ret = [6, 1, -2, 5]
判定        = ["通过","通过","通过","不符"]   ← 故意给错期望值的那组被抓出来
```
另：无口令 → 401；死循环 → `{"error":"run_failed","exit":124,"hint":"执行超时（8 秒）"}`。

## 15. 实测引擎可选 + 报错标红（2026-09-24）

用户原话：「所有测试全改成一个 python 实测，并且未通过会报错，在源代码呈现红色错误地方」
→ 随后修正为「**可以选择**伪代码测试和 python 测试」。

### 15.1 两个引擎，一个流程

编辑器右上角新增下拉「实测：伪代码 / 实测：Python」（`#engineSel`，键 `pseudo-test-engine`）：

| 引擎 | 怎么跑 | 依赖 |
|---|---|---|
| **伪代码（默认）** | `runCasesPseudo()`：用内置解释器 `C.executeCompiled` 逐例跑 | **离线可用**，不需要口令 |
| **Python** | `C.pyStandalone()` → POST `/api/run` → 服务器沙箱真跑 | 需要「云端同步」里的口令 |

两条路共用同一套：AI 出例（**不看学生代码**）→ 逐例比对 → `verdictOf()` 判定 → 同一张结果卡片。
⚠️ 两条引擎的**数组约定相反**，`buildPseudoInput()` 负责适配：伪代码解释器是按下标直取，
1-based 必须补一个下标 0 的占位；Python 路径靠代码生成阶段平移，数组是稠密的。

### 15.2 未通过就报错 + 源码标红

- 卡片顶部：不通过 → 红字「✗ 有 N 组输出与正确答案不一致」；代码跑不起来 → 「✗ 你的代码在 Python 里跑不起来：…」；
  全通过 → 绿字「✓ N 组全部跑通」。
- 逐条列出 `【判定】期望 X，实际 Y　输入 …`，运行出错时附上真实异常（如 `IndexError: list index out of range`）。
- **源码标红**：`#edMarks` 层在编辑器里画出红底色块（`top = 10 + (行-1)*21.06px`，必须与
  `.ed-input` 的 `padding-top:10px / line-height:21.06px` 保持一致），行号区同时标红（`.ln-err`）。
- 行号映射：执行端报的是**生成代码**的行号，学生看的是伪代码，`alignPyToPseudo()` 逐行做词元重叠度
  单调对齐（相似度 < 0.34 就不映射——**宁可少标，不标错行**）。
- 标红会在「用户改代码 / 换题目 / 换解法」时自动清除（`setEditorMarks([])`），避免留着过期的红。

**实测证据**（无头浏览器，Kadane 代码 + 一组 n 大于数组长度的用例）：
```
卡片: 实测检查（Python · 服务器真跑）· 通过 1/2
#1 【运行出错】期望 3，实际 undefined　报错：IndexError: list index out of range
源码标红行数 = 1，行号标红 = 1，提示「错误行已标红（第 5 行）」
```
第 5 行正是 `for i = 2 to n do`——越界确实发生在这一行，映射正确。
另：`promptContext()` 现在会把最近一次实测结果作为**运行证据**带进 AI 测评（并注明"不是评分依据"）。
