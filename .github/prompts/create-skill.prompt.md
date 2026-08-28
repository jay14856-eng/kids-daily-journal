---
mode: agent
description: "Use when: package a repeatable workflow into a reusable SKILL.md for this repo or another workspace. Extract steps, capture decisions, and validate completion criteria."
---

# Create a reusable skill

Turn the workflow in this request into a reusable `SKILL.md` that an agent can invoke on demand.

## Required output

Create a skill that includes:
- a clear purpose and trigger scenario
- ordered workflow steps
- decision points and branching logic
- completion checks or validation criteria
- guidance on scope, usage, and follow-up customizations

## Process

1. Identify the workflow being followed in the conversation or task history.
2. Extract the actual steps, decision points, and success checks.
3. Generalize the workflow so it works beyond the immediate task.
4. Decide whether the skill should be workspace-scoped or personal.
5. Draft the `SKILL.md` in the appropriate location.
6. Review it for ambiguity, missing assumptions, and weak discovery wording.
7. Finalize with a brief explanation of use cases and example prompts.

## Quality bar

The result is ready only if:
- the skill is easy to discover by description
- steps are concrete and stable
- decision branches are explicit
- completion criteria are measurable
- the workflow is reusable outside the original task

## File placement

Use:
- `.github/skills/<name>/SKILL.md` for workspace-level skills
- a user-level customizations folder when the skill is personal

## Final response

After creating the skill, briefly summarize:
- what the skill does
- when to use it
- example prompts that invoke it
- related customizations worth creating next
