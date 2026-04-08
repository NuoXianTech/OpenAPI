# Env Handling Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Confirm that `.env` handling already meets the repository policy without changing runtime behavior.

**Architecture:** This work is intentionally non-invasive. It treats env-file handling as a repository state verification task, not an application feature. The implementation consists of checking ignore rules, tracked-file state, and spec documentation, with no app code, config behavior, or test runtime changes.

**Tech Stack:** Git, `.gitignore`, Markdown documentation

---

### Task 1: Verify ignore rules and tracked-file state

**Files:**
- Modify: `docs/superpowers/specs/2026-04-08-env-handling-design.md`
- Test: repository root `.gitignore`

- [ ] **Step 1: Verify the ignore rule exists**

```gitignore
# Local env files
.env
.env.*
!.env.example
```

Confirm this block exists in `/.gitignore`.

- [ ] **Step 2: Run git check-ignore for `.env`**

Run: `git -C "/d/Project/vscode/OpenAPI" check-ignore -v .env`
Expected: output includes `.gitignore` and the `.env` rule, such as:

```text
.gitignore:22:.env	.env
```

- [ ] **Step 3: Run git check-ignore for `.env.example`**

Run: `git -C "/d/Project/vscode/OpenAPI" check-ignore -v .env.example || true`
Expected: no output, because `.env.example` is explicitly unignored.

- [ ] **Step 4: Verify tracked env files**

Run: `git -C "/d/Project/vscode/OpenAPI" ls-files -- .env .env.example`
Expected: output contains only `.env.example`:

```text
.env.example
```

- [ ] **Step 5: Confirm spec wording matches observed state**

Ensure the spec states all three facts below:

```markdown
- `.gitignore` 已忽略 `.env` 与 `.env.*`，并显式保留 `.env.example`
- `.env` 当前未被 git 跟踪
- `.env.example` 已存在，内容为示例配置
```

- [ ] **Step 6: Check working tree status for env-related files**

Run: `git -C "/d/Project/vscode/OpenAPI" status --short -- .gitignore .env.example .env docs/superpowers/specs/2026-04-08-env-handling-design.md`
Expected: only the spec file is untracked if it has not yet been committed:

```text
?? docs/superpowers/specs/2026-04-08-env-handling-design.md
```

- [ ] **Step 7: Commit the spec**

```bash
git -C "/d/Project/vscode/OpenAPI" add "docs/superpowers/specs/2026-04-08-env-handling-design.md" && git -C "/d/Project/vscode/OpenAPI" commit -m "$(cat <<'EOF'
docs: add env handling confirmation spec

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Expected: a new commit is created containing only the spec file.

### Task 2: Final verification after commit

**Files:**
- Modify: none
- Test: `docs/superpowers/specs/2026-04-08-env-handling-design.md`

- [ ] **Step 1: Verify the committed spec still reflects the chosen scope**

Confirm the spec keeps this non-goal list:

```markdown
- 轮换已经泄露的外部凭据
- 修改 README
- 增加运行时环境校验
- 修改认证、SMTP、数据库等相关业务逻辑
```

- [ ] **Step 2: Verify the working tree is clean for this scope**

Run: `git -C "/d/Project/vscode/OpenAPI" status --short -- .gitignore .env.example .env docs/superpowers/specs/2026-04-08-env-handling-design.md`
Expected: no output.

- [ ] **Step 3: Record completion criteria in human review**

Use this checklist during review:

```markdown
- `.env` is ignored
- `.env` is not tracked
- `.env.example` remains tracked
- no runtime behavior changed
- only the spec file was added for this step
```

- [ ] **Step 4: Commit if and only if additional edits were made during review**

```bash
git -C "/d/Project/vscode/OpenAPI" add "docs/superpowers/specs/2026-04-08-env-handling-design.md" && git -C "/d/Project/vscode/OpenAPI" commit -m "$(cat <<'EOF'
docs: refine env handling confirmation spec

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Expected: skip this step if `git status --short -- docs/superpowers/specs/2026-04-08-env-handling-design.md` is empty.
