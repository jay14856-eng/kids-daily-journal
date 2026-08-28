---
name: create-skill
description: "Use when: turning a repeatable workflow into a reusable SKILL.md for this repo or another workspace. Covers extracting process steps, clarifying scope, drafting the skill, and validating the final customization."
---

# Create Skill

Use this skill when the goal is to package a repeatable process into a reusable `SKILL.md` that a coding agent can invoke on demand.

## Goal

Create a concise, high-value skill that captures:
- the step-by-step workflow being followed
- decision points and branching logic
- quality criteria or completion checks
- the scope and intended use of the skill

## Workflow

### 1. Identify the existing workflow
Review the conversation or task history and extract the actual process that has been used repeatedly. Look for:
- ordered steps or phases
- explicit decision points
- common checks before claiming success
- repeated patterns that should become reusable

### 2. Generalize into a reusable pattern
Turn the observed workflow into a portable skill by abstracting from the immediate task:
- describe the goal clearly
- name the trigger scenario
- list the steps in a stable order
- include decision branches when behavior changes by context
- capture the completion criteria used to verify a result

### 3. Clarify scope if needed
If the workflow is not obvious or the outcome is ambiguous, ask the missing questions:
- should this skill be workspace-scoped or personal?
- what result should it produce?
- is this a quick checklist or a full multi-step workflow?
- what should the agent do when the workflow doesn't fit the request?

### 4. Draft the skill
Create a `SKILL.md` file in the appropriate location:
- workspace-level skills: `.github/skills/<name>/SKILL.md`
- user-level skills: `{{VSCODE_USER_PROMPTS_FOLDER}}/` for user-scoped prompt assets, if applicable

The file should include:
- frontmatter with `name` and a clear `description`
- a short purpose statement
- a workflow section with step-by-step guidance
- specific decision points and branch instructions
- validation or completion criteria

### 5. Review for ambiguity
Before finalizing, check the skill for weak or vague areas:
- Does the description make the skill discoverable?
- Are the steps sufficiently concrete?
- Are decision points obvious?
- Are completion checks measurable?
- Would another agent be able to follow the workflow without hidden context?

### 6. Finalize and summarize
Once the skill is in place, explain:
- what the skill produces
- when it should be used
- example prompts that can invoke it
- related customizations that may be useful next, such as prompts or instructions

## Quality bar

The skill is ready when:
- the workflow is clearly expressed and reusable
- the skill is scoped appropriately
- the description helps the agent find it in context
- the steps can be followed without missing assumptions
- completion criteria are explicit enough to validate the output

## Example prompts

- "Create a skill for turning a troubleshooting workflow into a reusable agent process."
- "Package our review checklist into a reusable SKILL.md for this workspace."
- "Turn our task implementation pattern into a skill that explains when to use it and how to validate results."

## Related customizations

Consider creating one of these next if the workflow is broader or more reusable:
- a prompt for a single focused task
- an instruction file for consistent project-wide guidance
- a custom agent for multi-stage workflows with isolating context or tool restrictions
