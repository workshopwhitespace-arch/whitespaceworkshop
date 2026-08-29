# White Space Workshop — ERP system

## Project context

Internal ERP for White Space Workshop, an interior design + graphic design + social media agency studio. Manages leads, quotations, clients, projects, tasks, design file approvals, and a simple payment ledger. Three fixed roles: Super Admin, Admin, Employee. No client-facing login for now (schema is designed so one can be added later without a rebuild).

## Tech stack

- **Framework**: Next.js 14+ (App Router), TypeScript, React — one app for frontend and backend, no separate API service
- **Backend**: Next.js Route Handlers + Server Actions
- **ORM**: Prisma
- **Database**: MySQL, hosted on Aiven (free tier to start)
- **Auth**: NextAuth.js (Auth.js) v5, Credentials provider, JWT session strategy, role embedded in the token
- **UI**: Tailwind CSS + shadcn/ui
- **File storage**: Cloudinary (design file uploads, versions, thumbnails)
- **Email**: Resend (payment/deadline reminders)
- **Hosting**: Vercel
- **Validation**: Zod, shared between client and server

## Auth & role rules

- Three roles on the `User` model: `SUPER_ADMIN`, `ADMIN`, `EMPLOYEE`.
- `middleware.ts` protects every `/dashboard/*` route. Unauthenticated users redirect to `/login`.
- Role gates access:
  - **Employee**: cannot reach Team & Roles, Settings, Ledger, or Reports. Projects/Tasks views are scoped to their own assignments only.
  - **Admin**: cannot reach Team & Roles or Settings. Everything else is full access.
  - **Super Admin**: full access to everything.
- Sidebar and page-level checks both enforce this — don't rely on hiding a nav link alone; guard the route handlers/server actions too.

## Folder structure

```
white-space-workshop/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          # sidebar + topbar shell
│   │   ├── dashboard/page.tsx
│   │   ├── leads/
│   │   ├── quotations/
│   │   ├── clients/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── ledger/
│   │   └── team/
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       └── webhooks/
├── lib/
│   ├── actions/                # leads.ts, quotations.ts, clients.ts, projects.ts, tasks.ts, ledger.ts, team.ts
│   ├── auth.ts                 # NextAuth config, role helpers
│   ├── db.ts                   # Prisma client singleton
│   └── validations/            # Zod schemas
├── components/
│   ├── ui/                     # shadcn components
│   └── modules/                # feature-specific components
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── middleware.ts
└── package.json
```

## Database schema

This is the full schema, already designed and reviewed. Use it as-is for `prisma/schema.prisma`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum Role {
  SUPER_ADMIN
  ADMIN
  EMPLOYEE
}

enum LeadStatus {
  NEW
  CONTACTED
  QUOTATION
  WON
  LOST
}

enum QuotationStatus {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
}

enum ProjectType {
  INTERIOR
  BRANDING
  SOCIAL
  WEB
}

enum ProjectStatus {
  BRIEF
  CONCEPT
  DRAFT
  REVISION
  FINAL
  DELIVERED
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  REVIEW
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum ApprovalStatus {
  PENDING
  APPROVED
  CHANGES_REQUESTED
}

enum LedgerEntryType {
  DEBIT
  CREDIT
}

enum ReminderStatus {
  UPCOMING
  DUE_TODAY
  OVERDUE
  DONE
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(EMPLOYEE)
  status       String   @default("active")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  leadsAssigned      Lead[]             @relation("LeadAssignee")
  clientsCreated     Client[]
  quotationsCreated  Quotation[]
  projectsCreated    Project[]
  projectAssignments ProjectAssignee[]
  tasksAssigned      Task[]
  filesUploaded      ProjectFile[]
  ledgerEntries      LedgerEntry[]
  reminders          Reminder[]
  activityLogs       ActivityLog[]
  notifications      Notification[]
}

model Client {
  id          String   @id @default(cuid())
  name        String
  companyName String?
  email       String?
  phone       String?
  address     String?
  notes       String?  @db.Text
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdById String
  createdAt   DateTime @default(now())

  leads         Lead[]
  quotations    Quotation[]
  projects      Project[]
  ledgerEntries LedgerEntry[]
}

model Lead {
  id           String     @id @default(cuid())
  name         String
  phone        String?
  email        String?
  service      String
  budget       Decimal?   @db.Decimal(12, 2)
  followUpDate DateTime?
  status       LeadStatus @default(NEW)
  client       Client?    @relation(fields: [clientId], references: [id])
  clientId     String?
  assignedTo   User?      @relation("LeadAssignee", fields: [assignedToId], references: [id])
  assignedToId String?
  createdAt    DateTime   @default(now())
}

model Quotation {
  id              String          @id @default(cuid())
  quotationNumber String          @unique
  client          Client          @relation(fields: [clientId], references: [id])
  clientId        String
  status          QuotationStatus @default(DRAFT)
  reference       String?
  discount        Decimal         @default(0) @db.Decimal(12, 2)
  gstAmount       Decimal         @default(0) @db.Decimal(12, 2)
  totalAmount     Decimal         @default(0) @db.Decimal(12, 2)
  terms           String?         @db.Text
  createdBy       User            @relation(fields: [createdById], references: [id])
  createdById     String
  createdAt       DateTime        @default(now())

  items    QuotationItem[]
  projects Project[]
}

model QuotationItem {
  id          String    @id @default(cuid())
  quotation   Quotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  quotationId String
  description String
  quantity    Int       @default(1)
  rate        Decimal   @db.Decimal(12, 2)
  amount      Decimal   @db.Decimal(12, 2)
}

model Project {
  id           String        @id @default(cuid())
  client       Client        @relation(fields: [clientId], references: [id])
  clientId     String
  quotation    Quotation?    @relation(fields: [quotationId], references: [id])
  quotationId  String?
  title        String
  type         ProjectType
  status       ProjectStatus @default(BRIEF)
  projectValue Decimal?      @db.Decimal(12, 2)
  createdBy    User          @relation(fields: [createdById], references: [id])
  createdById  String
  startDate    DateTime?
  deadline     DateTime?
  createdAt    DateTime      @default(now())

  assignees     ProjectAssignee[]
  tasks         Task[]
  files         ProjectFile[]
  approvals     ClientApproval[]
  revisions     Revision[]
  ledgerEntries LedgerEntry[]
}

model ProjectAssignee {
  id         String   @id @default(cuid())
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId  String
  user       User     @relation(fields: [userId], references: [id])
  userId     String
  assignedAt DateTime @default(now())

  @@unique([projectId, userId])
}

model Task {
  id              String     @id @default(cuid())
  project         Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId       String
  title           String
  description     String?    @db.Text
  assignedTo      User?      @relation(fields: [assignedToId], references: [id])
  assignedToId    String?
  priority        Priority   @default(MEDIUM)
  status          TaskStatus @default(TODO)
  progressPercent Int        @default(0)
  dueDate         DateTime?
  createdAt       DateTime   @default(now())
}

model ProjectFile {
  id             String         @id @default(cuid())
  project        Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId      String
  uploadedBy     User           @relation(fields: [uploadedById], references: [id])
  uploadedById   String
  fileUrl        String
  fileType       String?
  version        Int            @default(1)
  approvalStatus ApprovalStatus @default(PENDING)
  createdAt      DateTime       @default(now())

  approvals ClientApproval[]
}

model ClientApproval {
  id         String         @id @default(cuid())
  project    Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId  String
  file       ProjectFile?   @relation(fields: [fileId], references: [id])
  fileId     String?
  itemType   String
  status     ApprovalStatus @default(PENDING)
  reviewedAt DateTime?
  notes      String?        @db.Text
}

model Revision {
  id             String   @id @default(cuid())
  project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId      String
  itemType       String
  revisionNumber Int      @default(1)
  revisionLimit  Int      @default(3)
  createdAt      DateTime @default(now())
}

model LedgerEntry {
  id           String          @id @default(cuid())
  client       Client          @relation(fields: [clientId], references: [id])
  clientId     String
  project      Project?        @relation(fields: [projectId], references: [id])
  projectId    String?
  entryType    LedgerEntryType
  amount       Decimal         @db.Decimal(12, 2)
  description  String
  entryDate    DateTime        @default(now())
  recordedBy   User            @relation(fields: [recordedById], references: [id])
  recordedById String
}

model Reminder {
  id                String         @id @default(cuid())
  type              String
  relatedEntityType String?
  relatedEntityId   String?
  dueDate           DateTime
  status            ReminderStatus @default(UPCOMING)
  assignedTo        User           @relation(fields: [assignedToId], references: [id])
  assignedToId      String
  createdAt         DateTime       @default(now())
}

model ActivityLog {
  id         String   @id @default(cuid())
  user       User     @relation(fields: [userId], references: [id])
  userId     String
  action     String
  entityType String
  entityId   String
  metadata   Json?
  createdAt  DateTime @default(now())
}

model Notification {
  id                String   @id @default(cuid())
  user              User     @relation(fields: [userId], references: [id])
  userId            String
  message           String
  isRead             Boolean  @default(false)
  relatedEntityType String?
  relatedEntityId   String?
  createdAt         DateTime @default(now())
}
```

Notes on the schema:
- Money fields use `Decimal` with `@db.Decimal(12, 2)` for exact precision — never `Float` for currency.
- Ledger balance = `SUM(debit) - SUM(credit)`, computed at query time, grouped by `clientId` or `projectId` as needed. There is no stored balance column.
- `Project.quotationId` is nullable — a project doesn't have to originate from a quotation.
- `LedgerEntry.projectId` is nullable — some entries (a general advance) may not tie to one project.
- `Quotation.reference` records who referred the enquiry. It is nullable by design: a value means the work came in through a referral, `NULL` means a direct client. It lives only on `Quotation` — a Project inherits its origin through `Project.quotationId`.
- Budget/purchase/profit tracking (`BudgetCategory`, `Purchase`) is intentionally **not** in this schema yet — deferred by request. Don't add it unless asked.

## Phase 1 — what to build first

1. `npx create-next-app@latest` with TypeScript, Tailwind, App Router, in the current repo (check the existing `package.json` first — clean up any leftover Vite artifacts like `.vite/` if this repo was previously scaffolded with something else).
2. Install and configure Prisma; use the schema above as `prisma/schema.prisma`.
3. Set up an Aiven MySQL free-tier instance (or ask the user for an existing `DATABASE_URL` if they've already created one) and run the first migration.
4. Install and configure shadcn/ui with Tailwind.
5. Set up NextAuth.js with a Credentials provider, role stored in the JWT, and `middleware.ts` enforcing the role rules above.
6. Build the `/login` page and a minimal authenticated `/dashboard` page as a smoke test — confirm login works and role shows correctly before moving to any feature module.
7. Seed the database (`prisma/seed.ts`) with one user per role for testing.

Do not build any feature module (leads, projects, ledger, etc.) until steps 1–7 are working end to end.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
