---
applyTo: "**/*.{md,ts,js,json}"
description: "Use when: creating or improving reusable workflow customizations in this workspace. Keep skills discoverable, explicit, and validated with clear completion criteria."
---

# Skill creation guidance

Use this guidance whenever creating or updating a reusable workflow customization for this project.

## Default rules

- Prefer a `SKILL.md` when the task is a multi-step workflow with reusable decision logic.
- Prefer a prompt when the task is a single focused action with clear inputs.
- Prefer a repo-level instruction when behavior should apply across most work.
- Keep the `description` highly discoverable by starting with "Use when:" and naming the trigger scenario.

## Required structure for a skill

Each skill should include:
- a short purpose statement
- the workflow or process steps in order
- decision points and branching logic
- validation or completion criteria
- relevant examples or prompts
- a brief note on scope and when not to use it

## Repo conventions

- Workspace-scoped skills live under `.github/skills/<name>/SKILL.md`.
- Prompt-based tasks live under `.github/prompts/<name>.prompt.md`.
- Shared guidance for broader conventions belongs in `.github/instructions/`.

## Quality bar

A skill is ready when:
- the workflow is reusable outside the original task
- the purpose is obvious without extra context
- the steps are concrete and ordered
- completion criteria are measurable
- the agent can discover it from the description alone

## Final output

When a skill is created or updated, briefly summarize:
- what it does
- when to use it
- example prompts that invoke it
- any related prompt or instruction to create next
