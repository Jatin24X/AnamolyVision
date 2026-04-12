# AED-MAE Frontend Implementation Plan

## Plan Status
This plan replaces the earlier rough concept note.

It is now aligned to:
- the current repository state
- the locked frontend scope in `frontend_feature_spec.md`
- the fact that the current demo is Gradio-based and not sufficient as the final frontend

This plan covers only:
- frontend planning
- frontend architecture
- execution phases
- tool strategy

It does not yet start the frontend code scaffold.

## Project Reality

### What Exists Already
- Python AED-MAE model pipeline
- dataset preparation scripts
- training/evaluation pipeline
- trained checkpoints
- current Gradio demo in `app.py`
- deployment-oriented duplicate in `vad-mae-demo-ready`

### What Does Not Exist Yet
- real frontend application
- structured frontend-ready API
- design system
- reusable frontend component library
- production-grade interaction flow

## Implementation Objective
Build a premium frontend experience that:
- looks presentation-ready
- is grounded in the actual ML system
- is honest about model limitations
- can later connect cleanly to a structured Python backend API

## Locked V1 Scope Source
The build scope for this plan is the `Locked Must-Have Scope` from `frontend_feature_spec.md`.

Anything outside that list is deferred unless explicitly approved later.

## Recommended Frontend Stack

### Core Stack
- Next.js
- TypeScript
- Tailwind CSS
- component system in a `shadcn/ui` style
- Framer Motion
- Recharts or Nivo for charting

### Why This Stack
- strong for premium UI work
- easy to scale into a proper product shell
- good support for animation and polished states
- ideal for responsive presentation-grade pages
- easy to integrate with a future Python API

## Recommended Delivery Strategy
Do not start by wiring the real backend.

Build order:
1. lock scope
2. define information architecture
3. design visual system
4. build frontend using mocked inference data
5. finalize component behavior
6. integrate with a structured backend response later

This avoids frontend quality being constrained by the current Python demo output.

## Information Architecture

### Surface 1: Landing
Purpose:
- establish identity
- introduce the value proposition
- route users into the detection workflow

### Surface 2: Detection Workspace
Purpose:
- handle upload, processing, and results
- function as the main demo environment

### Surface 3: Method / Credibility
Purpose:
- explain model behavior
- support viva/presentation usage
- provide benchmark context and limitations

## Execution Phases

### Phase 1. Scope and UX Lock
Goals:
- freeze V1 scope
- freeze page structure
- freeze core user journey

Outputs:
- locked `frontend_feature_spec.md`
- rewritten `implementation_plan.md`
- page list
- section list
- state list for empty/loading/error/results

Status:
- completed for the planning stage

### Phase 2. Design Direction
Goals:
- establish visual language before coding
- avoid generic AI dashboard output

Outputs:
- typography direction
- color system
- spacing system
- motion principles
- page wireframes or Figma frames
- component references

Recommended workflow:
- use Figma for layout and visual hierarchy
- use AI generation only for inspiration and section ideation, not as the final authority

### Phase 3. Frontend Shell Build
Goals:
- create the full frontend skeleton without backend dependency

Outputs:
- app shell
- page routing
- landing page
- detection workspace
- method/benchmark sections
- reusable components
- mocked demo data model

Important:
- use mocked inference output to build the complete result experience first

### Phase 4. Result Experience Refinement
Goals:
- make the demo feel premium and presentation-ready

Outputs:
- staged loading flow
- anomaly chart interactions
- summary cards
- suspicious segment cards
- explanatory copy blocks
- polished transitions and reveal behavior

### Phase 5. Backend Contract Definition
Goals:
- specify what the Python backend must return to support the frontend cleanly

Outputs:
- JSON response schema
- error schema
- processing-state model
- fallback image strategy if structured data is incomplete

Important:
- this phase defines the contract only
- actual backend refactor can happen after frontend UX is stable

### Phase 6. Integration
Goals:
- connect frontend to real backend
- preserve frontend quality during integration

Outputs:
- API client layer
- backend request/response handling
- timeout/cold-start handling
- production error handling

## V1 Feature Checklist

### Must Build
- polished landing page
- polished upload workflow
- sample video support
- staged processing UI
- interactive anomaly chart
- summary cards
- suspicious segment summary
- method/overview section
- benchmark/credibility section
- limitations section

### Defer
- session history
- advanced report export
- multi-video compare
- live feed simulation
- admin/research tooling

## Design Requirements
The frontend should feel:
- premium
- cinematic
- trustworthy
- technically credible
- uncluttered

The frontend should not feel:
- template-generated
- overly academic
- purple-on-white generic AI UI
- like a repackaged Gradio form

## Content Strategy

### Tone
- confident
- clean
- technically grounded
- easy to understand

### Messaging Principles
- explain anomaly detection in simple language
- avoid claiming universal intelligence
- avoid fake realtime claims
- highlight project credibility without overselling

## Data and Metrics Strategy
Do not bind UI directly to raw `experiments/avenue/log_test.txt` content.

Reason:
- the log file contains mixed historical runs
- earlier bad runs and later corrected runs are appended together
- benchmark values shown in the UI should come from curated, verified values

Use:
- curated benchmark values
- curated model summary values
- explicitly defined sample/demo data for frontend development

## Tool Strategy

### Primary Tooling
- main implementation: Codex / code-first agent workflow
- design system and layout: Figma
- frontend ideation assistance: v0

### Recommended Use of AI
Use AI for:
- section ideation
- component drafts
- copy refinement
- code acceleration

Do not use AI for:
- blindly generating the whole app
- deciding product architecture on its own
- inventing unsupported backend behavior

## Recommended External Tools / MCP

### Already Valuable
- Figma

### Recommended Additions
- browser automation/testing MCP
- Playwright-style browser testing integration
- optional visual regression tooling

These are most useful after the frontend shell exists.

## Risks

### Risk 1. Backend Contract Mismatch
The current Python demo returns mostly a saved plot image and status text.

Mitigation:
- design frontend around a future structured response
- use mocked data first

### Risk 2. Generic AI UI
Auto-generated frontend code may produce a bland result.

Mitigation:
- lock design direction first
- use AI as a copilot, not as final designer

### Risk 3. Misleading Product Claims
The model is specialized, not universal.

Mitigation:
- include honest limitations in the UI

## Immediate Next Steps
1. finalize this plan and locked scope
2. decide the visual direction in Figma
3. define page wireframes
4. prepare mocked inference payload
5. begin frontend shell implementation

## Success Criteria
This planning phase is successful when:
- V1 feature scope is frozen
- implementation order is clear
- tool strategy is clear
- the project is ready for design-first frontend execution
