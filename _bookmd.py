#!/usr/bin/env python3
"""docs/BOOK.md 生成器：把 book_data.json 导出为可直接在网页上阅读的题单。

用法：
    python3 _bookmd.py                 # 读本目录的 book_data.json，写 docs/BOOK.md
    PCDIR=/path/to/copy python3 _bookmd.py

目的：让不想下载应用的人也能在 GitHub 页面上直接看到全部书本习题。
数据来源与单文件应用内置的是同一份（book_data.json），不存在第二份真相。
"""
import json
import os
import pathlib
import sys

ROOT = pathlib.Path(os.environ.get("PCDIR") or pathlib.Path(__file__).resolve().parent)
SRC = ROOT / "book_data.json"
DST = ROOT / "docs" / "BOOK.md"


def main() -> int:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    chapters = data.get("chapters", [])
    stats = data.get("stats", {})

    total = sum(len(c.get("exercises", [])) for c in chapters)
    kinds: dict[str, int] = {}
    for ch in chapters:
        for e in ch.get("exercises", []):
            k = e.get("kindCN") or e.get("kind") or "其他"
            kinds[k] = kinds.get(k, 0) + 1

    L: list[str] = []
    L.append(f"# 书本习题题单 · {data.get('bookTitle', '算法导论 4th')}\n")
    L.append(
        f"> **{stats.get('chapters', len(chapters))} 章 / {stats.get('exercises', total)} 题**，"
        f"由 `book_data.json` 自动生成（`python3 _bookmd.py`）。\n"
    )
    L.append("**题型分布**：" + "、".join(f"{k} {v} 题" for k, v in sorted(kinds.items(), key=lambda x: -x[1])) + "\n")
    L.append(
        "> 这些题目已内置在单文件应用里：打开 `伪代码编译器.html` → 左侧「书本习题」→ 可搜索、勾选、"
        "一键加入自己的题库后作答（带起步模板与复杂度评测）。纯证明／纯推导／判断对错／纯讨论题已剔除。\n"
    )

    # 章节目录（纯文本清单，避免中文标题锚点在 GitHub 上不一致）
    L.append("## 目录\n")
    last_part = None
    for ch in chapters:
        pt = ch.get("partTitle")
        if pt and pt != last_part:
            last_part = pt
            L.append(f"\n**{pt}**\n")
        L.append(f"- 第 {ch['num']} 章 {ch['title']} · {ch.get('titleCN', '')}（{ch.get('count', len(ch.get('exercises', [])))} 题）")
    L.append("\n---\n")

    # 正文
    last_part = None
    for ch in chapters:
        pt = ch.get("partTitle")
        if pt and pt != last_part:
            last_part = pt
            L.append(f"\n# {pt}\n")
        L.append(f"## 第 {ch['num']} 章 {ch['title']} · {ch.get('titleCN', '')}\n")
        last_sec = None
        for e in ch.get("exercises", []):
            sec = e.get("section")
            if sec and sec != last_sec:
                last_sec = sec
                L.append(f"### {sec}\n")
            meta = [e.get("kindCN") or e.get("kind") or ""]
            if e.get("entry"):
                meta.append(f"入口 `{e['entry']}`")
            L.append(f"**{e.get('ref', '')} · {e.get('title', '')}**")
            L.append(f"*{' ｜ '.join(x for x in meta if x)}*\n")
            if e.get("statement"):
                L.append(e["statement"].strip() + "\n")
            extras = []
            for label, key in (("输入", "inputs"), ("输出", "outputs"), ("提示", "hint"), ("附注", "note")):
                v = str(e.get(key) or "").strip()
                if v:
                    extras.append(f"**{label}**：{v}")
            if extras:
                L.append("> " + " ｜ ".join(extras) + "\n")

    DST.parent.mkdir(parents=True, exist_ok=True)
    text = "\n".join(L).rstrip() + "\n"
    DST.write_text(text, encoding="utf-8")
    print(f"已写出 {DST.name}：{len(text)} 字符 / {len(chapters)} 章 / {total} 题")
    return 0


if __name__ == "__main__":
    sys.exit(main())
