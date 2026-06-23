"use client";

import React, { useState } from "react";
import { MaaTaskList } from "@/types/tasklist";
import { MapPin, Phone, Package, ExternalLink, Box, Calendar, Clock, ArrowRight } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";

interface RiwayatOrderCardProps {
  tasklist: MaaTaskList;
  onClickDetail: () => void;
  onActionSuccess?: () => void;
}

export default function RiwayatOrderCard({ tasklist, onClickDetail, onActionSuccess }: RiwayatOrderCardProps) {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const router = useRouter();

  // For Riwayat Order, it is mostly NOT_PAID tasks. We use the first task as representative.
  const firstTask: any = tasklist.tasks?.[0] || {};
  const bookingCode = firstTask.task_code || "-";
  
  const senderName = firstTask.shipperInfo?.name || firstTask.shipper_info?.name || tasklist.owner_name || "-";
  const recipientName = firstTask.recipientInfo?.name || firstTask.recipient_info?.name || "-";
  
  const createdAt = new Date(firstTask.createdAt || firstTask.created_at || Date.now());
  const dateStr = createdAt.toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = createdAt.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });

  const totalPayment = firstTask.total_delivery_price || firstTask.totalDeliveryPrice || 0;

  const handlePayment = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActionLoading(true);
    try {
      const response = await axios.post("/api/payment/initiate", {
        taskCode: bookingCode,
        deliveryPrice: totalPayment,
        shipperPhone: tasklist.owner_phone || "081234567890",
      });
      if (response.data.success && response.data.paymentUrl) {
        window.open(response.data.paymentUrl, "_blank");
        if (onActionSuccess) onActionSuccess();
      } else {
        alert(response.data.message || "Gagal memulai pembayaran.");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Terjadi kesalahan saat memulai pembayaran.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleVoid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!bookingCode) return;
    if (!confirm("Apakah Anda yakin ingin membatalkan kode booking ini?")) return;
    
    setIsActionLoading(true);
    try {
      const response = await axios.post("/api/tasklist/void", {
        taskCode: bookingCode,
      });
      if (response.data.success) {
        alert("Berhasil membatalkan kode booking.");
        if (onActionSuccess) onActionSuccess();
      } else {
        alert(response.data.message || "Gagal membatalkan kode booking.");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Terjadi kesalahan saat membatalkan kode booking.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 mb-4 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300">
      <div 
        className="flex justify-between items-start mb-4 cursor-pointer group"
        onClick={onClickDetail}
      >
        <div className="flex flex-col">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-yellow-50 text-yellow-700 mb-2 w-fit">
            Menunggu Pembayaran
          </span>
          <h3 className="font-mono font-bold text-gray-800 text-lg group-hover:text-pink-600 transition-colors underline decoration-dashed underline-offset-4">
            {bookingCode}
          </h3>
          <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeStr}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl text-sm text-gray-700" onClick={onClickDetail}>
        <div className="flex-1 truncate font-medium text-right">{senderName}</div>
        <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
        <div className="flex-1 truncate font-medium">{recipientName}</div>
      </div>

      <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-4 text-sm">
          <span className="text-gray-500">Total Pembayaran:</span>
          <span className="font-bold text-pink-600 text-lg">Rp {totalPayment.toLocaleString("id-ID")}</span>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={handleVoid}
            disabled={isActionLoading}
            className="flex-1 sm:flex-none bg-white hover:bg-red-50 text-red-600 border border-red-200 py-2 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Hapus
          </button>
          <button 
            onClick={handlePayment}
            disabled={isActionLoading}
            className="flex-1 sm:flex-none bg-pink-600 hover:bg-pink-700 text-white py-2 px-4 rounded-xl text-sm font-semibold shadow-md shadow-pink-200 transition-colors disabled:opacity-50"
          >
            Bayar
          </button>
        </div>
      </div>
    </div>
  );
}
