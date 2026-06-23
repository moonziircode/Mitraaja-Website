"use client";

import React, { useState } from "react";
import { MaaTaskList } from "@/types/tasklist";
import { MapPin, Phone, Package, ExternalLink, Box } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";

interface TaskCardProps {
  tasklist: MaaTaskList;
  onClickDetail: () => void;
  onActionSuccess?: () => void;
}

export default function TaskCard({ tasklist, onClickDetail, onActionSuccess }: TaskCardProps) {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const router = useRouter();

  const handlePayment = async (task: any) => {
    setIsActionLoading(true);
    try {
      const response = await axios.post("/api/payment/initiate", {
        taskCode: task.task_code,
        deliveryPrice: task.total_delivery_price,
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

  const handleVoid = async (taskCode?: string) => {
    if (!taskCode) return;
    if (!confirm("Apakah Anda yakin ingin membatalkan kode booking ini?")) return;
    
    setIsActionLoading(true);
    try {
      const response = await axios.post("/api/tasklist/void", {
        taskCode,
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
  // We should also use the correct property for parcel_total_weight if MaaTask uses snake_case.
  // In Java: @c(a = "parcel_total_weight") private Double parcelTotalWeight;
  // If the API returns snake_case, it's `parcel_total_weight`.
  const totalWeight = tasklist.tasks?.reduce((acc, task: any) => acc + (task.parcel_total_weight || task.parcelTotalWeight || 0), 0) || 0;
  const taskCount = tasklist.tasks?.length || 0;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 mb-4 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300">
      <div 
        className="flex justify-between items-start mb-3 cursor-pointer group"
        onClick={onClickDetail}
      >
        <div className="flex flex-col">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-600 mb-2 w-fit">
            {tasklist.order_source || "Dropoff"}
          </span>
          <h3 className="font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">
            {tasklist.owner_name || "Tanpa Nama"}
          </h3>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <Phone className="w-3.5 h-3.5 mr-1.5" />
            <span>{tasklist.owner_phone || "-"}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="bg-gray-50 p-2 rounded-lg text-center">
            <span className="block text-xs text-gray-500 font-medium">Total Paket</span>
            <span className="block text-lg font-bold text-gray-800">{taskCount}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3 mt-3 flex items-center justify-between text-sm cursor-pointer group" onClick={onClickDetail}>
        <div className="flex items-center gap-4 text-gray-600">
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{totalWeight.toFixed(2)} kg</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Box className="w-4 h-4 text-gray-400" />
            <span className="truncate max-w-[120px]">{tasklist.client_name || "Reguler"}</span>
          </div>
        </div>
        
        <div className="flex items-center text-blue-600 font-medium text-sm group-hover:underline">
          Detail
          <ExternalLink className="w-3.5 h-3.5 ml-1" />
        </div>
      </div>

      {/* Tampilkan aksi untuk setiap task yang belum dibayar */}
      {tasklist.tasks && tasklist.tasks.some(t => t.payment_status === "NOT_PAID") && (
        <div className="mt-4 pt-4 border-t border-red-50">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tindakan Diperlukan (Belum Dibayar)</h4>
          <div className="space-y-3">
            {tasklist.tasks.filter(t => t.payment_status === "NOT_PAID").map((task, idx) => (
              <div key={idx} className="bg-red-50/50 border border-red-100 rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-sm font-semibold text-gray-800">{task.task_code}</span>
                  <span className="font-bold text-red-600">Rp {task.total_delivery_price?.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePayment(task);
                    }}
                    disabled={isActionLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    Bayar
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVoid(task.task_code);
                    }}
                    disabled={isActionLoading}
                    className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
