# AGENT OPERATIONAL RULES (TOKEN-OPTIMIZED)

## 1. MANDATORY CONTEXT RESTRICTIONS
- NEVER execute `read_all_files` or scan directories recursively unless explicitly requested by the user.
- You are strictly FORBIDDEN from reading files outside the target path provided in the prompt.
- If you need context from another file, ASK the user first; do not automatically use tools to fetch it.
- Ignore all dependency folders, build artifacts, lockfiles, and media files. Rely on `.gitignore`.

## 2. CODE MODIFICATION PROTOCOL (MICRO-DIFFS ONLY)
- CRITICAL: Never overwrite or rewrite an entire file.
- You must ONLY output precision code modifications using selective line replacement (diffs).
- Before applying any change, isolate the exact lines (e.g., lines 45-52) and modify only that specific block.
- Minimize terminal execution: Do not run build/test commands repeatedly in a loop. Run once, analyze the log, and present the final fix.

## 3. REASONING & VERBOSITY CONTROL
- Set your internal thinking loop to the absolute minimum required for the task.
- Cut down conversational filler. Do not explain "Why" you are doing a fix unless the user asks `/btw`.
- If an automated step fails twice (2 consecutive errors), STOP IMMEDIATELY. Do not attempt a third automated fix. Freeze the state and report to the user to prevent token-burn loops.

## 4. MULTI-STEP TASK HANDLING (PLANNING FIRST)
- For complex tasks, you must enter Planning Mode first.
- Output a maximum 3-bullet-point execution plan. 
- WAIT for user confirmation (Yes/No) before calling any execution tools or writing code.

## 5. GIT BRANCHING & CLOUDFLARE DEPLOYMENT RULES
- BEFORE making any code modifications, you MUST automatically create and switch to a dedicated isolation branch from the current base branch (e.g., `feature/an-task-name` or `fix/issue-name`).
- NEVER write code, commit, or make changes directly on the `main` or `master` branch.
- You are strictly FORBIDDEN from executing `git merge` or fast-forwarding any branch into `main`.
- You are strictly FORBIDDEN from triggering production deployments, modifying Wrangler configurations, or executing deployment commands to Cloudflare Pages/Workers (`wrangler deploy`, `wrangler pages deploy`, etc.) without explicit instruction in the active prompt.
- Once a task is complete, push the isolation branch to GitHub or leave it local as a pending state, then report the branch name to the user for manual verification.
