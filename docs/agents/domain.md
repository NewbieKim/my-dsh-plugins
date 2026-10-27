# 领域文档

工程 skill 探仓时按这里读领域文档。

## 动手前先读

- 根目录 **`GLOSSARY.md`**
- 若根目录有 **`GLOSSARY-MAP.md`**：按它去读与当前主题相关的各限界术语表
- **`docs/adr/`**：只读会碰到的决策。多限界仓再看 `src/<限界>/docs/adr/`

这些文件不存在时 **默默继续**。不要提醒「仓库没有术语表」，也不要一上来就建议创建。`domain-modeling`（经 `grill-with-docs`、`improve-codebase-architecture` 调用）会在真正敲定术语或决策时惰性创建。

## 目录

单限界（绝大多数仓）：

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-订单用事件溯源.md
│   └── 0002-写模型用-postgres.md
└── src/
```

多限界（根目录存在 `GLOSSARY-MAP.md`）：

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← 跨限界决策
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← 本限界决策
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## 用术语表里的词

工单标题、重构建议、假设、测试名里出现领域概念时，用 `GLOSSARY.md` 里的词，不要滑到术语表明确避开的同义词。

要用的概念还不在术语表里：要么你在发明项目不用的词（收回去），要么是真缺口（留给 `domain-modeling`）。

## 和决策记录冲突时

输出与已有决策记录矛盾，要明说，不要悄悄覆盖：

> 与 ADR-0007（订单用事件溯源）冲突，但值得重开，因为……
