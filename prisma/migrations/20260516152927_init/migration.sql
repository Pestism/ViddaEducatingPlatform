-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "exposures" TEXT[],
    "responsibilities" TEXT[],
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "viddagptOutput" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "checkpointA" BOOLEAN NOT NULL DEFAULT false,
    "checkpointB" BOOLEAN NOT NULL DEFAULT false,
    "checkpointC" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "moduleCode" TEXT,
    "objective" TEXT NOT NULL,
    "duration" DECIMAL(65,30) NOT NULL,
    "difficulty" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "contentType" TEXT,
    "reasonAssigned" TEXT NOT NULL,
    "riskAlignment" TEXT[],
    "amlrArticles" INTEGER[],
    "knowledge" TEXT[],
    "skills" TEXT[],
    "judgment" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeEmail" TEXT NOT NULL,
    "modulesAssigned" INTEGER NOT NULL DEFAULT 0,
    "modulesCompleted" INTEGER NOT NULL DEFAULT 0,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_eventType_idx" ON "AuditLog"("eventType");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_actor_idx" ON "AuditLog"("actor");

-- CreateIndex
CREATE INDEX "AnalysisRun_roleId_idx" ON "AnalysisRun"("roleId");

-- CreateIndex
CREATE INDEX "AnalysisRun_status_idx" ON "AnalysisRun"("status");

-- CreateIndex
CREATE INDEX "Module_analysisId_idx" ON "Module"("analysisId");

-- CreateIndex
CREATE INDEX "Module_quarter_idx" ON "Module"("quarter");

-- CreateIndex
CREATE INDEX "Enrollment_analysisId_idx" ON "Enrollment"("analysisId");

-- CreateIndex
CREATE INDEX "Enrollment_employeeEmail_idx" ON "Enrollment"("employeeEmail");

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "AnalysisRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "AnalysisRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
