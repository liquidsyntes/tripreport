import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Papa from 'papaparse';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format'); 

  const reports = await prisma.tripReport.findMany({
    orderBy: { sessionDate: 'desc' },
  });

  if (format === 'csv') {
    const csvData = reports.map(r => ({
      id: r.id,
      status: r.status,
      date: r.sessionDate ? new Date(r.sessionDate).toISOString().split('T')[0] : '',
      psychedelic: r.psychedelicType,
      dosage: r.dosageGrams,
      strain: r.mushroomStrain,
      method: r.intakeMethod,
      location: r.location,
      notes: r.notes
    }));
    const csv = Papa.unparse(csvData);
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="trips-export.csv"',
      },
    });
  }

  // Default to JSON
  return new NextResponse(JSON.stringify(reports, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="trips-export.json"',
    },
  });
}
