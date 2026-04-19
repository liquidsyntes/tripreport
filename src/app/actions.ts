"use server";

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function getTripReports(searchQuery?: string, statusFilter?: string) {
  let whereClause: any = {};
  
  if (statusFilter && statusFilter !== 'all') {
    whereClause.status = statusFilter;
  } else {
    // default: do not include deleted ones in all unless explicitly requested
    whereClause.status = { not: 'deleted' };
  }

  if (searchQuery) {
    whereClause.OR = [
      { notes: { contains: searchQuery } },
      { psychedelicType: { contains: searchQuery } },
      { mushroomStrain: { contains: searchQuery } },
      { location: { contains: searchQuery } }
    ];
  }

  const reports = await prisma.tripReport.findMany({
    where: whereClause,
    orderBy: { updatedAt: 'desc' }
  });
  
  return reports;
}

export async function getTripReportById(id: string) {
  return prisma.tripReport.findUnique({
    where: { id },
    include: { history: { orderBy: { version: 'desc' } } }
  });
}

export async function createDraft(data: any) {
  const newReport = await prisma.tripReport.create({
    data: {
      status: 'draft',
      currentStep: data.currentStep || 1,
      psychedelicType: data.psychedelicType || null,
      notes: data.notes || null,
      formPayload: JSON.stringify(data.formPayload || {}),
    }
  });

  await prisma.tripReportHistory.create({
    data: {
      tripReportId: newReport.id,
      version: 1,
      actionType: 'create',
      changedFields: JSON.stringify(Object.keys(data)),
      snapshotBefore: '{}',
      snapshotAfter: JSON.stringify(data),
    }
  });

  revalidatePath('/');
  return newReport;
}

export async function updateTripReport(id: string, data: any, isFinal: boolean = false) {
  const existing = await prisma.tripReport.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

  const newStatus = isFinal ? 'active' : existing.status;
  const newVersion = existing.schemaVersion + 1; // Simplify versioning for now

  const updated = await prisma.tripReport.update({
    where: { id },
    data: {
      ...data,
      formPayload: typeof data.formPayload === 'object' ? JSON.stringify(data.formPayload) : data.formPayload,
      status: newStatus,
      schemaVersion: newVersion,
      updatedAt: new Date(),
    }
  });

  await prisma.tripReportHistory.create({
    data: {
      tripReportId: id,
      version: newVersion,
      actionType: isFinal && existing.status === 'draft' ? 'complete' : 'edit',
      changedFields: JSON.stringify(Object.keys(data)),
      snapshotBefore: JSON.stringify(existing),
      snapshotAfter: JSON.stringify(updated),
    }
  });

  revalidatePath('/');
  return updated;
}

export async function changeStatus(id: string, newStatus: string) {
  const existing = await prisma.tripReport.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

  const actionType = newStatus === 'archived' ? 'archive' : newStatus === 'deleted' ? 'delete' : 'restore';
  const newVersion = existing.schemaVersion + 1;

  await prisma.tripReport.update({
    where: { id },
    data: { 
      status: newStatus, 
      schemaVersion: newVersion,
      ...(newStatus === 'deleted' ? { deletedAt: new Date() } : {}),
      ...(newStatus === 'archived' ? { archivedAt: new Date() } : {})
    }
  });

  await prisma.tripReportHistory.create({
    data: {
      tripReportId: id,
      version: newVersion,
      actionType,
      changedFields: JSON.stringify(['status']),
      snapshotBefore: JSON.stringify({ status: existing.status }),
      snapshotAfter: JSON.stringify({ status: newStatus }),
    }
  });

  revalidatePath('/');
}
