-- AlterEnum
ALTER TYPE "TriggerType" ADD VALUE 'SCHEDULE';

-- CreateTable
CREATE TABLE "ContentCalendar" (
    "id" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCalendarRow" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "sheet" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCalendarRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentCalendar_spreadsheetId_key" ON "ContentCalendar"("spreadsheetId");

-- CreateIndex
CREATE INDEX "ContentCalendarRow_calendarId_sheet_idx" ON "ContentCalendarRow"("calendarId", "sheet");

-- CreateIndex
CREATE UNIQUE INDEX "ContentCalendarRow_calendarId_sheet_rowIndex_key" ON "ContentCalendarRow"("calendarId", "sheet", "rowIndex");

-- AddForeignKey
ALTER TABLE "ContentCalendarRow" ADD CONSTRAINT "ContentCalendarRow_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "ContentCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
