# CloudCraft: AWS & DevOps 3D Architect — Master Project Context (`context.md`)

> **MANDATORY AGENT INSTRUCTION**:
> This file (`/context.md`) is the single source of truth for **CloudCraft: AWS & DevOps 3D Architect**.
> 1. **Read First**: Before planning or writing any code for a new user request, read this file to understand the product vision, architectural invariants, UI/UX constraints, and historical decisions.
> 2. **Update on Every Turn**: Every time a new user request is fulfilled, append a new entry to **Section 2: Chronological Request & Decision Log** and update any affected architecture sections in this file.

---

## 1. Product Vision & Core Philosophy

**CloudCraft: AWS & DevOps 3D Architect** is an interactive 3D spatial simulation game built with React 19, Three.js (`@react-three/fiber` + `@react-three/drei`), Tailwind CSS, and TypeScript. It teaches cloud architecture, networking, FinOps, security, and Terraform Infrastructure-as-Code (IaC) from absolute zero to AWS Cloud Practitioner & Solutions Architect proficiency.

### Core Design Pillars
1. **Zero Prior Knowledge Required (Grandma-Friendly Onboarding)**:
   - Early levels assume zero cloud or coding background.
   - Every concept is introduced with a plain-English analogy, a visual **Swipeable 3-Step Cardboard-Cutout Diorama Storyboard**, and step-by-step guided action banners on the 3D board.
   - Terraform HCL code is hidden in early levels (`Levels 1–14`) unless toggled, then introduced progressively with a line-by-line interactive code explainer.
2. **Free Placement + Run-Time Physics Validation (Learn by Experimenting)**:
   - Users are **never blocked** from placing components on the wrong tile or spawning extra servers.
   - Instead, when the user clicks **"Run Traffic"** (or **"Test Stage"**), the simulation engine evaluates real AWS architecture physics and renders 3D diagnostic badges + plain-English remediation advice:
     - **Zone Physics**: VPC-bound resources (`EC2`, `RDS`, `Redis`, `ALB`, `EBS`, `EFS`, etc.) placed in the external `EDGE / DNS` zone (`gridX < -1`) fail with an `Invalid Zone: Edge/DNS` error. Databases (`RDS`, `Redis`, `Redshift`) placed outside the `Private Subnet` (`gridX < 2`) fail with a `Security Risk: Public DB` error.
     - **Idle & Over-Provisioned Compute Waste (FinOps Physics)**: Unwired servers (`connections === 0`) or extra servers beyond a single-server level's target are flagged with `Idle Compute Waste ($/mo)` and `Over-Provisioned Compute` warnings.
     - **Firewall / Security Group Port Physics**: Connections fail visually with red bouncing packets when destination Security Group ports (`80`, `443`, `5432`, `6379`) are closed or when routing bypasses required tiers.
3. **100% Unlocked 13-Module Coursera AWS Cloud Practitioner Curriculum (130 Levels)**:
   - All **13 Modules** and **130 Levels** are unlocked from the start so learners can follow the linear path or jump directly to any module or **Graded Module Boss Assessment** (`Levels 10, 20, 30 ... 130`).
4. **Desktop & Mobile Responsive**:
   - Full touch and mouse orbit/pan/zoom camera controls, collapsible mobile bottom-sheet drawers for Mission & Inspector/Terraform panels, and horizontally scrollable component palettes.

---

## 2. Chronological Request & Decision Log

### Request 1 — Initial Concept & 60-Level 3D Cloud Game
- **User Request**:
  - Build a 3D interactive game that teaches AWS & DevOps concepts (VPC, EC2, Security Groups, Load Balancers, RDS, S3, CloudFront, Route 53, IAM, CloudWatch, SQS, Lambda, Terraform) through visual 3D hardware blocks, animated traffic packets, and bidirectional Terraform HCL code synchronization.
- **Decisions Taken**:
  - Created a dark industrial hardware-bench 3D aesthetic (`#0D1117` obsidian canvas, `#F59E0B` AWS amber, `#38BDF8` network cyan, `#10B981` healthy emerald, `#EF4444` error crimson).
  - Built a 3D isometric/orbital VPC board (`Scene3D.tsx`) with distinct color-coded zones (`EDGE / DNS`, `PUBLIC SUBNET`, `PRIVATE SUBNET`), animated packet spheres, procedural Web Audio sound effects (`soundEngine.ts`), and bidirectional 3D-to-Terraform HCL sync (`terraformSync.ts`).

### Request 2 — Full Mobile Responsiveness & Complete 60-Level Unlock
- **User Request**:
  - Make all levels playable and unlocked, and ensure the UI works cleanly on mobile screens without overlapping panels or clipped buttons.
- **Decisions Taken**:
  - Unlocked all levels by default so users can browse and load any mission from `LevelSelectModal`.
  - Refactored `App.tsx` and `TitleScreen.tsx` with responsive breakpoints (`sm:`, `lg:`), adding a mobile tab switcher (`3D Board`, `Mission`, `Code / Inspect`) that opens slide-over bottom sheets on phones while preserving the 3-column workbench on desktop.

### Request 3 — Beginner-First Progressive Onboarding (Levels 1–10) & Plain-English Concept Cards
- **User Request**:
  - Ensure a complete beginner ("even a grandma") can understand the game from Level 1 without feeling overwhelmed by jargon or Terraform code.
- **Decisions Taken**:
  - Designed a dedicated 10-level micro-step tutorial in Chapter 1:
    - **Level 1**: Just click **Run Traffic** to observe healthy traffic flow.
    - **Level 2**: Place a single EC2 server on a glowing gold target tile (`[0, 0]`) with automatic wire connection for the first EC2.
    - **Level 3**: Connect two components with the **Connect Wire** tool.
    - **Level 4**: Select a server and click **Open Port 80** in the Inspector.
    - **Level 5**: Combine Place + Connect + Open Port.
    - **Levels 6–10**: Introduce Load Balancers, Private Subnet RDS databases, Redis ElastiCache, S3 + CloudFront CDN, and Route 53 + WAF step by step.
  - Added `ConceptModal.tsx` ("New Concept Unlocked" cards with real-world analogies) and `TerraformExplainer.tsx` (plain-English line-by-line translator for HCL blocks).
  - Hid the Terraform code panel by default in early levels (`Levels 1–14`) behind an optional toggle so beginners focus purely on 3D visual blocks first.

### Request 4 — Real-World AWS Simulation Depth, Official AWS Icons & Multi-Stage Scenarios
- **User Request**:
  - Make the game feel like real-world cloud engineering rather than a repetitive toy puzzle:
    1. Replace generic Lucide icons with authentic AWS service icons.
    2. Add distinct gameplay modes (*Live Outage Repair*, *Chaos Resilience Lab*, *FinOps Cost Cut*, *SecOps Audit*, *Peak Scale Event*) and multi-stage wave challenges (Normal Load → 3x Flash Sale → AZ Failure / Security Audit) for levels 11+.
    3. Add comic/storyboard intros inspired by real engineering case studies (Netflix, Stripe, Airbnb, Slack, Reddit, GitHub, etc.).
- **Decisions Taken**:
  - Created `AwsServiceIcon.tsx` with custom multi-layered SVG badges matching official AWS Architecture Icon colors and silhouettes (Compute Orange `#ED7100`, Storage Green `#7AA116`, Database Blue `#3B48CC`, Networking Purple `#8C4FFF`, Security Red `#DD344C`, AI/ML Teal `#01A88D`).
  - Added floating 3D AWS icon badges above every 3D block on the board (`Scene3D.tsx`) and inside the bottom toolbar, Level Select, and Storyboard modals.
  - Created `scenarioGenerator.ts` to enrich levels with multi-stage load/chaos waves, FinOps budget targets, and real-world engineering case studies.

### Request 5 — 13-Module Coursera AWS Cloud Practitioner Syllabus (130 Levels), Cardboard-Cutout Diorama Storyboards & Run-Time Zone/FinOps Physics
- **User Request**:
  1. **Run-Time Zone & Extra-Server Validation**: On Level 2, placing an EC2 server in the `EDGE / DNS` zone or placing 2 EC2 servers when only 1 is needed still allowed the level to pass. Fix this so users can place blocks anywhere, **but** running traffic validates zone placement and flags extra/unwired idle servers as wasted cloud spend.
  2. **Swipeable Cardboard-Cutout Storyboards**: Make the storyboard modal look like a tactile **Cardboard-Cutout Diorama** with short comic speech bubbles, and show 1 slide at a time (swipeable/clickable 3 steps) so it never clips horizontally.
  3. **13-Module Coursera AWS Cloud Practitioner Curriculum (130 Levels)**: Align the entire curriculum with the 13 modules of the Coursera AWS Cloud Practitioner syllabus (10 levels per module = 130 levels total, all unlocked, ending each module with a **Graded Module Boss Assessment**).
- **Decisions Taken**:
  - **Simulation Engine (`simulationEngine.ts`)**:
    - Added `validateComponentZone()` to check every component's `gridX` against AWS zone rules (`EDGE / DNS: x <= -2`, `PUBLIC SUBNET: -1 <= x <= 1`, `PRIVATE SUBNET: x >= 2`).
    - Added detection for unwired idle compute/database nodes (`Idle Compute Waste`) and over-provisioned extra EC2 instances on single-server levels (`Over-Provisioned Compute`).
    - Blocked objective completion (`allObjectivesMet = false`) whenever `zoneViolations.length > 0`, `idleComponents.length > 0`, or `overProvisionedCount > 0`.
  - **3D Scene (`Scene3D.tsx`) & Level 2 Auto-Wire (`App.tsx`)**:
    - Updated `App.tsx` so Level 2 only auto-wires the **first** EC2 placed; any extra EC2s remain unwired and trigger FinOps waste alerts.
    - Added high-contrast 3D floating diagnostic banners (`INVALID ZONE`, `PUBLIC DB RISK!`, `IDLE SERVER ($120/mo waste)`) directly above offending 3D blocks after running traffic.
  - **Cardboard-Cutout Storyboard (`StoryboardModal.tsx`)**:
    - Redesigned as a **Swipeable 3-Step Cardboard-Cutout Diorama** (`1. Real-World Story`, `2. What Breaks`, `3. Your AWS Fix`) with kraft-paper textures (`#F5E6CC`), masking-tape corners, hard paper-cutout drop shadows, comic speech bubbles, and wrapping cutout cards with zero horizontal clipping.
  - **13-Module, 130-Level Generator (`scenarioGenerator.ts` & `levels.ts`)**:
    - Expanded `ComponentType` from 12 to 21 AWS services (`client`, `route53`, `cloudfront`, `waf`, `igw`, `alb`, `ec2`, `ecs`, `beanstalk`, `lambda`, `sqs`, `s3`, `ebs`, `efs`, `rds`, `dynamodb`, `redis`, `redshift`, `kinesis`, `sagemaker`, `iam`, `cloudwatch`, `cloudtrail`, `dms`).
    - Built all 13 Coursera modules × 10 levels = **130 unlocked levels**, with every 10th level (`10, 20, 30 ... 130`) structured as a **Graded Module Boss Assessment**.

### Request 6 — Master `context.md` Documentation File
- **User Request**:
  - Create a `context.md` file in the root directory containing every request made and every decision taken so future requests and AI agents can read `context.md` as the complete guide of the app and update it on every request.
- **Decisions Taken**:
  - Created `/context.md` in the project root with the complete request history, decision rationale, file map, and mandatory update protocol.

---

## 3. Complete Curriculum Structure (13 Coursera Modules · 130 Levels)

| Module | Title | Levels | Assessment Boss | Core AWS Services Covered |
| :--- | :--- | :--- | :--- | :--- |
| **Module 1** | Introduction to the Cloud | Levels 1–10 | Level 10 | `client`, `ec2`, `alb`, `rds`, `redis`, `s3`, `cloudfront`, `route53`, `waf` |
| **Module 2** | Compute in the Cloud | Levels 11–20 | Level 20 | `ec2`, `alb`, `igw` (Instance Types, Auto Scaling, ELB) |
| **Module 3** | Exploring Compute Services | Levels 21–30 | Level 30 | `beanstalk`, `ecs`, `lambda`, `sqs` (PaaS, Containers, Serverless) |
| **Module 4** | Going Global | Levels 31–40 | Level 40 | `route53`, `cloudfront`, `s3`, `alb` (Regions, AZs, Edge Locations) |
| **Module 5** | Networking | Levels 41–50 | Level 50 | `igw`, `alb`, `ec2`, `rds` (VPC Subnets, Gateways, Security Groups) |
| **Module 6** | Storage | Levels 51–60 | Level 60 | `s3`, `ebs`, `efs`, `ec2` (Object, Block, and Shared File Storage) |
| **Module 7** | Databases | Levels 61–70 | Level 70 | `rds`, `dynamodb`, `redis`, `redshift` (Relational, NoSQL, Caching, Warehouse) |
| **Module 8** | AI/ML and Data Analytics | Levels 71–80 | Level 80 | `sagemaker`, `kinesis`, `redshift`, `s3`, `lambda` |
| **Module 9** | Security | Levels 81–90 | Level 90 | `iam`, `waf`, `rds`, `s3` (Shared Responsibility, Least Privilege, Encryption) |
| **Module 10** | Monitoring and Governance | Levels 91–100 | Level 100 | `cloudwatch`, `cloudtrail`, `s3`, `lambda` (Metrics, Alarms, Audit Logs) |
| **Module 11** | Pricing and Support | Levels 101–110 | Level 110 | `ec2`, `lambda`, `s3`, `rds`, `redis` (FinOps Right-Sizing & Cost Optimization) |
| **Module 12** | Migrating to the AWS Cloud | Levels 111–120 | Level 120 | `dms`, `rds`, `s3`, `ec2`, `alb` (6 Rs of Migration, AWS DMS, Cutover) |
| **Module 13** | Architecting Well-Architected Solutions | Levels 121–130 | Level 130 | Full 6-Pillar Capstone Architectures + Final Exam Boss (Level 130) |

---

## 4. Codebase Architecture & File Map

```text
/
├── context.md                         # Master project & decision log (MUST BE UPDATED ON EVERY REQUEST)
├── metadata.json                      # AI Studio Applet metadata
├── index.html                         # Entry HTML
└── src/
    ├── App.tsx                        # Main workbench state, toolbar, Mission HUD, Inspector/Terraform drawers
    ├── components/
    │   ├── AwsServiceIcon.tsx         # Official AWS silhouette & category-colored SVG icon badges (24 types)
    │   ├── Scene3D.tsx                # Three.js 3D VPC board, 24 3D hardware meshes, packet spheres, 3D error banners
    │   ├── StoryboardModal.tsx        # Swipeable 3-step Cardboard-Cutout Diorama modal (zero horizontal clipping)
    │   ├── LevelSelectModal.tsx       # 13 Coursera Module tabs, syllabus summary banner, 130 unlocked level cards
    │   ├── ConceptModal.tsx           # Beginner plain-English "New Concept Unlocked" modal
    │   ├── TerraformExplainer.tsx     # Interactive line-by-line HCL to plain-English translator
    │   ├── TitleScreen.tsx            # Landing modal with syllabus progress bar and quick-start buttons
    │   └── VictoryModal.tsx           # Post-level completion summary & Next Level progression
    └── game/
        ├── types.ts                   # Core TypeScript interfaces (ComponentType, LevelDefinition, SimulationResult, etc.)
        ├── levels.ts                  # Hand-crafted Module 1 (Levels 1-10) + base templates + 130-level export
        ├── scenarioGenerator.ts       # Generates Modules 2-13 (Levels 11-130), storyboards, stages, and Chapter metadata
        ├── simulationEngine.ts        # Traffic routing, Zone validation, Idle/Over-provisioned server detection, FinOps math
        ├── terraformSync.ts           # Bidirectional 3D ArchitectureState <-> Terraform HCL generator & parser
        └── soundEngine.ts             # Web Audio API synthesized UI clicks, wire snaps, alerts, and victory chimes
```

---

## 5. Architectural Invariants (Do Not Break)

1. **Spatial Board Zones (`gridX` Coordinates)**:
   - `gridX <= -2`: **EDGE / DNS** (`client`, `route53`, `cloudfront`, `waf`, `igw`, `s3`, `iam`, `cloudwatch`, `cloudtrail`). Placing VPC compute or databases here must trigger a Zone Violation when traffic runs.
   - `-1 <= gridX <= 1`: **PUBLIC SUBNET** (`alb`, `ec2`, `ecs`, `beanstalk`, `lambda`, `sqs`, `ebs`, `efs`, `kinesis`, `sagemaker`, `dms`). Placing `rds`, `redis`, or `redshift` here must trigger a Public DB Security Risk when traffic runs.
   - `gridX >= 2`: **PRIVATE SUBNET** (`rds`, `dynamodb`, `redis`, `redshift`, plus backend `ec2`/`ecs`/`lambda`/`ebs`/`efs`/`sagemaker`/`dms`).
2. **Free Placement at Build-Time, Strict Validation at Run-Time**:
   - Never prevent the player from clicking a tile to place a block. Always let them experiment and show the resulting architectural consequence when they click **Run Traffic**.
3. **Zero Horizontal Clipping in Modals**:
   - Keep `StoryboardModal` as a single-slide-at-a-time swipeable/tabbed cardboard-cutout stage with `flex-wrap` on component nodes so it fits 360px mobile screens and desktop monitors without horizontal scrollbars.
