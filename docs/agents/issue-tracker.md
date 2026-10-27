# 工单跟踪器：GitHub

本仓的需求、缺陷、PRD 都写在 GitHub Issues（`NewbieKim/my-dsh-plugins`）。所有操作走 `gh`，并带 `-R NewbieKim/my-dsh-plugins`。

## 常用操作

- **建单**：`gh issue create -R NewbieKim/my-dsh-plugins --title "..." --body "..."`。多行正文用 here-string，不要手拼转义。
- **读单**：`gh issue view <number> -R NewbieKim/my-dsh-plugins --json number,title,body,labels,comments`
- **列表**：`gh issue list -R NewbieKim/my-dsh-plugins --state open --json number,title,body,labels,comments`，按需加 `--label` / `--state`
- **子单**：`gh issue create -R NewbieKim/my-dsh-plugins --parent <parent> ...`，或事后 `gh issue edit <parent> -R NewbieKim/my-dsh-plugins --add-sub-issue <child>`（`gh` 2.94+）。更老的 `gh`：`gh api --method POST repos/NewbieKim/my-dsh-plugins/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`。没有子单能力时，在子单正文顶部写 `属于 #<parent>`
- **评论**：`gh issue comment <number> -R NewbieKim/my-dsh-plugins --body "..."`
- **打标 / 摘标**：`gh issue edit <number> -R NewbieKim/my-dsh-plugins --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> -R NewbieKim/my-dsh-plugins --comment "..."`

## 把 PR 当需求入口

**外部 PR 当作需求入口：否。** （若要把外部 PR 纳入 `triage`，把这里改成「是」。）

为「是」时，PR 走和 Issue 同一套标签与状态，改用 `gh pr`：

- **读 PR**：`gh pr view <number> -R NewbieKim/my-dsh-plugins --comments`，diff 用 `gh pr diff <number> -R NewbieKim/my-dsh-plugins`
- **列出外部 PR**：`gh api --paginate "repos/NewbieKim/my-dsh-plugins/pulls?state=open"`，筛掉 `OWNER` / `MEMBER` / `COLLABORATOR`
- **评论 / 打标 / 关闭**：`gh pr comment`、`gh pr edit --add-label`、`gh pr close`

GitHub 的 Issue 和 PR 共用一套编号。裸 `#42` 先 `gh pr view 42 -R NewbieKim/my-dsh-plugins`，失败再 `gh issue view 42 -R NewbieKim/my-dsh-plugins`。

## 技能说「发布到跟踪器」时

创建一张 GitHub Issue。

## 技能说「拉取对应工单」时

按上面的「读单」执行。

## 阻塞关系

- 用 GitHub 原生依赖：`gh api --method POST repos/NewbieKim/my-dsh-plugins/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`
- `<blocker-db-id>` 是数字数据库 id：`gh api repos/NewbieKim/my-dsh-plugins/issues/<n> --jq .id`，不是 `#number`
- 原生依赖不可用时，在子单正文顶部写 `被阻塞于: #<n>, #<n>`
- 一张单可开工：它的所有阻塞单都已关闭
