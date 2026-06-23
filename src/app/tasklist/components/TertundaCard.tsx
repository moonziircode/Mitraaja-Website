"use client";

import React from "react";
import { MaaTaskList } from "@/types/tasklist";
import { MapPin, Phone, Package, ExternalLink, Clock, User, FileText, Truck } from "lucide-react";

interface TertundaCardProps {
  tasklist: MaaTaskList;
  onClickDetail: () => void;
}

export default function TertundaCard({ tasklist, onClickDetail }: TertundaCardProps) {
  const taskCount = tasklist.tasks?.length || 0;
  
  // Use the first task as representative for the group
  const firstTask: any = tasklist.tasks?.[0] || {};
  const waybill = firstTask.waybill_no || firstTask.waybillNo || firstTask.task_code || "-";
  const serviceType = firstTask.product_code || firstTask.productCode || "SD";
  const status = firstTask.task_status || firstTask.taskStatus || "MENUNGGU PICKUP";
  
  const shipperCity = firstTask.shipperInfo?.city || firstTask.shipper_info?.city || "-";
  const recipientCity = firstTask.recipientInfo?.city || firstTask.recipient_info?.city || "-";
  
  const createdAt = new Date(firstTask.createdAt || firstTask.created_at || Date.now());
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60)) % 60;
  const waitingTime = diffHours > 0 ? `${diffHours}j ${diffMinutes}m` : `${diffMinutes}m`;

  return (
    <div 
      className="bg-white/80 backdrop-blur-md rounded-2xl p-5 mb-4 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-pink-200 transition-all duration-300 cursor-pointer group"
      onClick={onClickDetail}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-pink-50 text-pink-600">
              {tasklist.order_source || "Dropoff"}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {waitingTime}
            </span>
          </div>
          <h3 className="font-mono font-bold text-gray-800 text-lg group-hover:text-pink-600 transition-colors">
            {waybill}
          </h3>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <User className="w-3.5 h-3.5 mr-1.5" />
            <span>{tasklist.owner_name || tasklist.client_name || "Tanpa Nama"}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="bg-pink-50 p-2 rounded-lg text-center min-w-[60px]">
            <span className="block text-xs text-pink-600 font-bold">{serviceType}</span>
            {taskCount > 1 && <span className="block text-[10px] text-pink-500 mt-0.5">{taskCount} Paket</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 p-2.5 bg-gray-50 rounded-xl text-xs text-gray-600">
        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="truncate">{shipperCity}</span>
        <span className="text-gray-300 font-bold">→</span>
        <span className="truncate">{recipientCity}</span>
      </div>

      <div className="border-t border-gray-100 pt-3 mt-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-orange-600 font-medium">
          <Truck className="w-4 h-4" />
          <span>{status.replace(/_/g, " ")}</span>
        </div>
        <div className="flex items-center text-pink-600 font-medium text-sm group-hover:underline">
          Detail
          <ExternalLink className="w-3.5 h-3.5 ml-1" />
        </div>
      </div>
    </div>
  );
}
