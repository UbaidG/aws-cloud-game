# Implementation Plan: 13-Module Coursera AWS Curriculum, Cardboard-Cutout Diorama Storyboards & Run-Time Zone/FinOps Physics

## 1. Executive Summary & Architectural Goals

This update transforms **CloudCraft: AWS & DevOps Architect** from a 60-level sequence into a structured **13-Module, 130-Level Interactive Curriculum** modeled directly on the **Coursera AWS Cloud Practitioner Essentials Syllabus**, while fixing the visual storyboard clipping/text overload and making run-time AWS zone & cost physics authentic.

### Key Pillars of This Update
1. **13-Module Coursera Curriculum (130 Levels Total — All Unlocked)**:
   - **13 Modules × 10 Levels per Module = 130 Levels**.
   - **Levels 1–9 of each module** teach the module's core AWS services and architectural patterns progressively (moving from guided 1-step fundamentals to multi-stage real-world scenarios across the 7 gameplay modes).
   - **Level 10 of every module** is a **Graded Module Boss Assessment** where players solve a comprehensive multi-stage real-world case study testing everything learned in that module without step-by-step hand-holding.
   - **All 13 modules and all 130 levels are unlocked from the start**, organized in a new Module Syllabus Browser inside the Level Select drawer so players can jump to any module or assessment immediately.
2. **Swipeable 3-Step Cardboard-Cutout Diorama Storyboard (`StoryboardModal.tsx`)**:
   - Replaces the cramped 3-column text modal (which suffered from horizontal clipping and heavy text) with a **full-card Swipeable 3-Step Cardboard-Cutout Diorama Carousel**.
   - Crafted to look like physical **layered corrugated cardboard & paper-cutout stage scenes** with masking-tape tabs, kraft-paper textures, bold AWS service badges, animated cutout props, and **1 short sentence (8–14 words max) per slide** in plain beginner-friendly English.
   - Zero horizontal overflow or clipped icons on both mobile phones and desktop monitors.
3. **Free Placement + Strict Run-Time AWS Zone & Wasted Compute Physics (`networkPhysics.ts`)**:
   - Players can freely drop any AWS block onto any tile on the board and spawn extra wired or unwired servers.
   - When the player hits **Run / Test Traffic**:
     - **Invalid Zone Placement (Fatal Error)**: If a VPC resource (such as `EC2`, `RDS`, `ElastiCache Redis`, `ALB`, `NAT Gateway`, `EBS`, `EFS`, `ECS`, `EKS`) is placed inside the `EDGE / DNS` zone (`gridX < -1`) or outside the VPC—or if an Edge/Global service (`Route 53`, `CloudFront`, `IGW`) is placed inside a `Private Subnet`—the simulation animates a red 3D failure callout right over that block explaining *why* AWS cannot run that service in that zone (e.g. *"EC2 lives inside a VPC Subnet, never in Edge/DNS!"*) and blocks passing.
     - **Unwired / Idle Server & Wasted Compute Spend Diagnostics**: If the player drops extra unwired EC2/RDS servers or over-provisions unnecessary instances, the live $/mo counter reflects the real cost immediately and running traffic triggers a 3D FinOps callout over the idle/extra servers (*"IDLE COMPUTE WASTE: This EC2 is billed at $70/mo with 0 traffic wires!"* or *"OVER-PROVISIONED: 4 EC2s ($280/mo) running for a 1-server workload!"*).

---

## 2. Full 13-Module Coursera Syllabus Breakdown (130 Levels)

We will expand the component catalog with authentic 3D models and official AWS service icons to cover all 13 modules (`ec2`, `asg`, `lambda`, `ecs`, `eks`, `beanstalk`, `s3`, `ebs`, `efs`, `rds`, `dynamodb`, `redis`, `redshift`, `kinesis`, `sagemaker`, `elb`, `igw`, `nat`, `route53`, `cloudfront`, `apigw`, `waf`, `iam`, `cloudwatch`, `cloudtrail`, `dms`, `sqs`, `sns`).

| Module | Coursera Syllabus Topic | Levels | Core AWS Services & Concepts Covered | Graded Assessment (10th Level) |
| :--- | :--- | :--- | :--- | :--- |
| **Module 1** | **Introduction to the Cloud** | **1 – 10** | On-demand delivery, Client → Cloud request flow, replacing on-prem racks with AWS Cloud, pay-as-you-go vs idle hardware waste, Shared Responsibility Model basics, high availability vs single point of failure. | **Level 10: Graded Assessment — Startup Cloud Cutover** (Retire failing on-prem server, wire DNS + Public Cloud Compute within budget). |
| **Module 2** | **Compute in the Cloud** | **11 – 20** | Amazon EC2 fundamentals, instance sizing (t3.micro vs m5.large), vertical vs horizontal scaling, EC2 Auto Scaling Groups (`ASG`), Elastic Load Balancing (`ALB`) across EC2s, avoiding idle EC2 waste. | **Level 20: Graded Assessment — Flash-Sale EC2 Fleet** (Survive a 3,500 RPS flash sale using ALB + ASG without overspending). |
| **Module 3** | **Exploring Compute Services** | **21 – 30** | Serverless compute with `AWS Lambda`, event-driven triggers (`API Gateway` → `Lambda`), containerized microservices with `Amazon ECS`, Kubernetes orchestration with `Amazon EKS`, rapid PaaS deployment with `AWS Elastic Beanstalk`, choosing EC2 vs Lambda vs Containers. | **Level 30: Graded Assessment — Hybrid Serverless & Container Platform** (Route bursty APIs to Lambda and core microservices to ECS/EKS). |
| **Module 4** | **Going Global** | **31 – 40** | AWS Global Infrastructure, Regions (data sovereignty & proximity), Multi-AZ high availability, Edge Locations & `Amazon CloudFront` CDN caching, `Route 53` global latency routing, Infrastructure as Code automation with CloudFormation/Terraform blueprints. | **Level 40: Graded Assessment — Global Multi-AZ Media Launch** (Cut global latency under 35ms with CloudFront + Route 53 + Multi-AZ failover). |
| **Module 5** | **Networking** | **41 – 50** | Amazon VPC boundaries, Public vs Private Subnets, `Internet Gateway (IGW)`, `NAT Gateway` for private outbound traffic, Route Tables, Security Groups vs Network ACLs, stopping direct internet-to-private-subnet breaches. | **Level 50: Graded Assessment — Zero-Trust FinTech VPC** (Isolate private app/data tiers behind IGW, ALB, NAT Gateway, and strict subnet rules). |
| **Module 6** | **Storage** | **51 – 60** | Block storage (`Amazon EBS`) attached to EC2, Object storage (`Amazon S3`) for static media & backups, Shared File storage (`Amazon EFS`) mounted across multiple EC2s, S3 Lifecycle & Glacier archival cost optimization. | **Level 60: Graded Assessment — Tri-Storage Media Pipeline** (Combine EBS boot volumes, EFS shared mounts, and S3 + CloudFront delivery). |
| **Module 7** | **Databases** | **61 – 70** | Relational databases (`Amazon RDS` & Multi-AZ failover), Non-relational NoSQL (`Amazon DynamoDB`) for millisecond key-value scale, In-memory caching (`Amazon ElastiCache / Redis`) for read-heavy spikes, `Amazon Redshift` warehousing. | **Level 70: Graded Assessment — Instagram-Scale Viral Feed** (Absorb 15,000 RPS using Redis cache-aside + DynamoDB + RDS Multi-AZ). |
| **Module 8** | **AI/ML and Data Analytics** | **71 – 80** | Real-time streaming ingestion (`Amazon Kinesis`), data lake storage (`S3`), enterprise analytics (`Amazon Redshift`), ML model training & inference endpoints (`Amazon SageMaker`), protecting AI inference endpoints from rate-limit floods. | **Level 80: Graded Assessment — Real-Time Fraud Detection AI Pipeline** (Stream events via Kinesis into SageMaker inference and Redshift analytics). |
| **Module 9** | **Security** | **81 – 90** | Shared Responsibility Model ("Security OF the Cloud" vs "IN the Cloud"), `AWS IAM` least-privilege roles & policies, `AWS WAF` & Shield DDoS mitigation, KMS encryption at rest/in transit, locking down exposed S3 buckets and databases. | **Level 90: Graded Assessment — Live Cyber-Attack Lockdown** (Defend an exposed banking stack from SQLi/DDoS with WAF, IAM Roles, and private subnets). |
| **Module 10** | **Monitoring, Compliance, and Governance** | **91 – 100** | `Amazon CloudWatch` metrics, logs, and auto-remediation alarms, `AWS CloudTrail` API audit trails ("who deleted the production DB?"), compliance auditing, and automated incident alerts via `SNS`. | **Level 100: Graded Assessment — SOC2 Audit & Self-Healing Ops** (Wire CloudWatch telemetry, CloudTrail auditing, and SNS alert pipelines across a production VPC). |
| **Module 11** | **Pricing and Support** | **101 – 110** | AWS Pricing fundamentals (Compute, Storage, Outbound Data Transfer), On-Demand vs Reserved vs Spot instances, AWS Budgets & Cost Explorer, hunting zombie EBS volumes, idle NAT Gateways, and unwired EC2s in **Cost Slasher** mode. | **Level 110: Graded Assessment — The $2,500/mo FinOps Rescue** (Slash a bloated enterprise bill by 60% with zero downtime or dropped traffic). |
| **Module 12** | **Migrating to the AWS Cloud** | **111 – 120** | AWS CAF, the 6 Rs of Migration (Rehost, Replatform, Refactor, Retire, Retain, Repurchase), live database replication with `AWS DMS`, zero-downtime hybrid DNS cutover from legacy servers to AWS. | **Level 120: Graded Assessment — Zero-Downtime Legacy Bank Migration** (Use AWS DMS + Route 53 weighted cutover to migrate a live monolith to AWS). |
| **Module 13** | **Well-Architected Solutions** | **121 – 130** | The 6 Pillars of the AWS Well-Architected Framework: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability—culminating in full-stack capstone architectures. | **Level 130: Final Capstone Exam — AWS Certified Cloud Architect** (Design a 6-Pillar Well-Architected global platform under live traffic, security, latency, and FinOps constraints). |

---

## 3. Cardboard-Cutout Visual Storyboard (`StoryboardModal.tsx`)

To eliminate text clutter and horizontal overflow clipping, we will completely redesign `StoryboardModal.tsx` into a **Swipeable 3-Step Cardboard-Cutout Diorama**:

1. **Tactile Cardboard & Paper-Craft Visual Aesthetic**:
   - Styled like a handcrafted **corrugated kraft-cardboard theater box** (`#d8b88c` warm kraft borders, layered paper-cutout drop shadows `4px 6px 0px rgba(0,0,0,0.35)`, masking-tape corner tabs, and stitched cardboard dividers).
   - **3 Swipeable Slides (One Focused Scene at a Time)**:
     - **Slide 1: Real-World Story (Case Study)** — Shows the real company/scenario (e.g., *Netflix, Instagram, Domino's, FinTech*) as a bold paper-cutout stage illustration with 3 large tactile cutout props (`[User Phone] ➔ [Slow Pipe] ➔ [Overloaded Box]`) and **one simple 10-word comic speech bubble**.
     - **Slide 2: What Went Wrong (The Problem)** — Visualizes the exact failure mode (e.g., *Red Smoke on Single Server / Hacker Packet / $900 Idle Bill*) in a large cutout scene with a single plain-English caption.
     - **Slide 3: Your Mission (The Solution)** — Shows the exact 2–3 AWS cutout pieces you will place on the board and a big green **"Start Building ➔"** button.
2. **Zero Clipping Guarantee**:
   - Instead of cramming 3 columns side-by-side on one screen, each slide occupies the full stage width with responsive wrapping, large 56px AWS cutout tokens, Next/Back swipe controls, and an instant **"Skip to Board"** button in the top corner.

---

## 4. Run-Time AWS Zone Validation & Idle/Wasted Compute Engine (`networkPhysics.ts`)

Per your feedback, players will never be artificially blocked from dragging a component anywhere on the grid or dropping multiple servers—instead, **running the simulation teaches real AWS behavior**:

1. **Global AWS Zone Placement Rules (Checked on `TEST TRAFFIC` across all 130 levels)**:
   - **Rule A — VPC Compute/Data in `EDGE / DNS` or `EXTERNAL` (`viol-invalid-zone-edge`)**:
     - If `ec2`, `asg`, `ecs`, `eks`, `beanstalk`, `elb`, `nat`, `rds`, `dynamodb`, `redis`, `redshift`, `ebs`, `efs`, or `sagemaker` is placed in the `EDGE / DNS` zone (`gridX < -1`) or `EXTERNAL` zone (`gridX < -3`), running traffic triggers a **Fatal Zone Error** with a 3D red diagnostic banner over the block:
       > *"INVALID AWS ZONE: {Service} must run inside a VPC Subnet (Public or Private), never in the external Edge/DNS zone!"*
     - Directly fixes the Level 2 bug where placing an EC2 in `EDGE / DNS` passed the level.
   - **Rule B — Edge/Global Services Inside VPC Subnets (`viol-invalid-zone-vpc`)**:
     - If `route53`, `cloudfront`, `waf`, or `igw` is placed inside the `PRIVATE SUBNET` (`gridX >= 3`), running traffic flags a **Fatal Zone Error**:
       > *"INVALID AWS ZONE: {Service} is a public Edge/Gateway service and cannot be hidden inside a Private Subnet!"*
   - **Rule C — Private-Only Databases & Storage in Public Subnet (`viol-db-in-public`)**:
     - Starting from Networking & Security modules (and any level teaching Private Subnets), placing `rds`, `redis`, `redshift`, or `efs` in the `PUBLIC SUBNET` triggers an animated security failure explaining why databases belong in the `PRIVATE SUBNET`.

2. **Unwired / Idle Servers & Wasted Compute Spend Rules**:
   - **Unwired Server Detection (`viol-idle-unwired-waste`)**:
     - Players can place extra servers (`ec2`, `rds`, `redis`, `nat`, `elb`, etc.) without wiring them.
     - On `TEST TRAFFIC`, any placed infrastructure block with `0` active traffic connections is flagged with a 3D callout over that block:
       > *"WASTED CLOUD SPEND: Unwired {Service} is sitting idle (0 RPS) while burning ${cost}/mo! Wire it into your flow or delete it."*
     - Any level with unwired/orphan components cannot pass until the player either wires the idle server into the architecture or removes the wasted hardware.
   - **Over-Provisioned / Extra Wired Server Detection (`viol-overprovisioned-spend`)**:
     - In foundational levels (like Level 2) and Cost Slasher / FinOps levels, if the player wires 3–4 EC2 servers where 1 EC2 handles the traffic and pushes `monthlyCost` above the level's `maxBudget`, the simulation shows the live RPS capacity boost AND fails the budget check with a clear explanation:
       > *"OVER-PROVISIONED COMPUTE: Your 4 EC2 servers handle {capacity} RPS, but cost ${monthlyCost}/mo (Budget: ${maxBudget}/mo). Right-size to 1 EC2!"*

---

## 5. File-by-File Implementation Steps

1. **`/src/game/types.ts`**:
   - Add `moduleId: number` (`1` to `13`), `moduleTitle: string`, and `isAssessment?: boolean` to `LevelSpec`.
   - Expand `ComponentType` with new Coursera syllabus services: `'ebs' | 'efs' | 'ecs' | 'beanstalk' | 'sagemaker' | 'kinesis' | 'redshift' | 'cloudtrail' | 'dms'`.
   - Update `StoryboardSlide` to support cardboard-cutout visual stage props, paper badge colors, and ultra-short 1-sentence speech bubbles.
2. **`/src/game/awsIconCanvas.ts` & `/src/game/voxelAssets.ts`**:
   - Add official AWS architecture icon vector renderers and 3D voxel hardware models for `EBS`, `EFS`, `ECS`, `Elastic Beanstalk`, `SageMaker`, `Kinesis`, `Redshift`, `CloudTrail`, and `DMS`.
3. **`/src/game/networkPhysics.ts`**:
   - Add universal `evaluateZonePlacementPhysics(state, levelId)` enforcing valid AWS zones for every service type on `TEST TRAFFIC` (including blocking `EC2` in `EDGE / DNS` in Level 2 and all other levels).
   - Upgrade `viol-unwired` to a blocking `'error'` that flags idle/unwired compute waste in 3D and explains the wasted `$/mo` spend.
   - Add over-provisioned compute diagnostics when extra wired servers exceed the level's `maxBudget`.
4. **`/src/game/levels.ts` & `/src/game/scenarioGenerator.ts`**:
   - Organize all **130 levels across the 13 Coursera Modules** (10 levels per module, with every 10th level configured as a multi-stage **Graded Module Assessment**).
   - Fix Level 1 and Level 2 auto-wiring and zone checks so only valid Public Subnet EC2s pass Level 2, and every level's `availableComponents` allows recreating any deletable component.
   - Generate concise, beginner-friendly cardboard-cutout storyboard specs for all 130 levels.
5. **`/src/components/StoryboardModal.tsx`**:
   - Rebuild as a **Swipeable 3-Step Cardboard-Cutout Diorama** with kraft-cardboard aesthetics, big cutout illustrations, zero horizontal clipping, and short 1-sentence captions.
6. **`/src/components/LevelSelectModal.tsx` & `/src/App.tsx`**:
   - Upgrade the Level Select modal with a **13-Module Syllabus Selector** (showing Module 1–13 tabs, progress per module, and a gold badge on each Module's Graded Assessment at Level 10, 20, 30... 130), with all 130 levels unlocked for immediate play.
