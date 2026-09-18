import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { anterajaClient } from '@/lib/anteraja-client';
import { saveScanRecord, logActivity } from '@/lib/scan-records-db';

export const preferredRegion = 'sin1';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Check authentication
    if (!session.isLoggedIn || !session.token) {
      return NextResponse.json({ success: false, message: 'Tidak terautentikasi' }, { status: 401 });
    }
    
    const body = await request.json().catch(() => ({}));
    const awbList: string[] = [];

    if (typeof body.awb === 'string' && body.awb.trim()) {
      awbList.push(body.awb.trim());
    }
    if (Array.isArray(body.awbs)) {
      body.awbs.forEach((a: unknown) => {
        if (typeof a === 'string' && a.trim()) awbList.push(a.trim());
      });
    }
    if (Array.isArray(body.orders)) {
      body.orders.forEach((o: any) => {
        const key = o?.claim_key || o?.awb;
        if (typeof key === 'string' && key.trim()) awbList.push(key.trim());
      });
    }

    if (awbList.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada nomor AWB yang diberikan.' }, { status: 400 });
    }

    // Deduplicate preserving order
    const uniqueAwbs = Array.from(new Set(awbList));
    const agentStaffId = session.nia;
    const token = session.token;

    // Process each AWB through full 5-phase lifecycle
    const results = [];
    for (const awb of uniqueAwbs) {
      if (!/^[0-9]{14}$/.test(awb)) {
        results.push({
          awb,
          claim_key: awb,
          success: false,
          is_already_claimed: false,
          claim_status: 'FAILED',
          claim_message: 'AWB gagal di-claim',
          final_result: 'FAILED',
        });
        continue;
      }

      const lifecycleResult = await anterajaClient.processFullClaimLifecycle(awb, agentStaffId, token);
      
      // 1. Save scan record and log activity reliably to Supabase
      try {
        const logTasks = [];
        if (lifecycleResult.success || lifecycleResult.isAlreadyClaimed) {
          logTasks.push(
            saveScanRecord({
              awb: lifecycleResult.awb,
              storeName: session.storeName || session.name || 'Mitra',
              serviceType: 'REG',
              scanTime: new Date(),
              weight: 0,
              itemName: '-',
              status: lifecycleResult.finalTaskStatus || (lifecycleResult.success ? 'WAITING_FOR_HANDOVER_SERAH' : 'ALREADY_CLAIMED'),
              packageDetails: {
                taskCode: lifecycleResult.taskCode,
                shipperName: lifecycleResult.shipperName,
                receiverName: lifecycleResult.receiverName,
                destinationCity: lifecycleResult.destinationCity,
                opcode: lifecycleResult.opcode,
                trackingCode: lifecycleResult.trackingCode,
              },
            })
          );
        }

        logTasks.push(
          logActivity({
            action: 'BATCH_CLAIM_DROP_OFF',
            status: lifecycleResult.success ? 'SUCCESS' : (lifecycleResult.isAlreadyClaimed ? 'ALREADY_CLAIMED' : 'FAILED'),
            awb: lifecycleResult.awb,
            userNia: session.nia,
            userName: session.name,
            storeName: session.storeName || session.name || 'Mitra',
            errorMessage: lifecycleResult.success ? undefined : lifecycleResult.message,
            metadata: {
              taskCode: lifecycleResult.taskCode,
              trackingCode: lifecycleResult.trackingCode,
              opcode: lifecycleResult.opcode,
            },
          })
        );

        await Promise.allSettled(logTasks);
      } catch (dbErr) {
        console.error('[POST /api/parcels/claim] DB logging error:', dbErr);
      }

      results.push({
        awb: lifecycleResult.awb,
        claim_key: lifecycleResult.awb,
        success: lifecycleResult.success,
        is_already_claimed: lifecycleResult.isAlreadyClaimed || false,
        claim_status: lifecycleResult.success ? 'SUCCESS' : 'FAILED',
        claim_message: lifecycleResult.message,
        task_code: lifecycleResult.taskCode,
        tracking_code: lifecycleResult.trackingCode,
        opcode: lifecycleResult.opcode,
        final_task_status: lifecycleResult.finalTaskStatus,
        final_result: lifecycleResult.finalResult,
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      message: `Proses klaim selesai: ${successCount} berhasil, ${failedCount} gagal.`,
      content: {
        orders: results,
      },
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failedCount,
      },
    }, { status: 200 });
  } catch (err: any) {
    console.error('[POST /api/parcels/claim] Error:', err);
    return NextResponse.json({ success: false, message: 'AWB gagal di-claim' }, { status: 500 });
  }
}
