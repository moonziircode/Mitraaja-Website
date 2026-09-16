"use client";

import React, { useState } from "react";
import { MaaTaskList } from "@/types/tasklist";
import { MapPin, User, Store, Copy, Check, ChevronRight } from "lucide-react";

interface TertundaCardProps {
  tasklist: MaaTaskList;
  onClickDetail: () => void;
  onPrint?: () => void;
}

export default function TertundaCard({ tasklist, onClickDetail, onPrint }: TertundaCardProps) {
  const [copied, setCopied] = useState(false);
  const firstTask: any = tasklist.tasks?.[0] || {};
  if (!firstTask || Object.keys(firstTask).length === 0) return null;

  const waybill = (
    firstTask.waybill || 
    firstTask.waybill_no || 
    firstTask.waybillNo || 
    firstTask.order_code || 
    firstTask.task_code || 
    "-"
  ).trim();

  const storeName = (
    firstTask.store_name || 
    firstTask.storeName || 
    tasklist.owner_name || 
    firstTask.ownership_name || 
    tasklist.client_name || 
    "-"
  ).trim();

  const receiverName = (
    firstTask.receiver_name || 
    firstTask.receiverName || 
    firstTask.recipientInfo?.name || 
    firstTask.recipient_info?.name || 
    "-"
  ).trim();
  
  const originCity = (
    firstTask.shipper_city || 
    firstTask.shipperCity || 
    firstTask.shipperInfo?.city || 
    firstTask.city || 
    "-"
  ).trim();

  const destinationCity = (
    firstTask.receiver_city || 
    firstTask.receiverCity || 
    firstTask.recipientInfo?.city || 
    firstTask.staging_delivery || 
    "-"
  ).trim();
  
  const serviceType = (
    firstTask.service_type || 
    firstTask.serviceType || 
    firstTask.product_code || 
    firstTask.productCode || 
    "REG"
  ).trim();
  
  // Strict status for Menu Tertunda
  const status = "Tertunda";

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (waybill !== "-") {
      navigator.clipboard.writeText(waybill);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      onClick={onClickDetail}
      className="bg-white rounded-2xl p-4 sm:p-5 mb-3 border border-gray-100 shadow-sm hover:shadow-md hover:border-pink-200 transition-all duration-200 cursor-pointer group"
    >
      {/* Header: AWB / Waybill + Service + WAITING_FOR_HANDOVER_SERAH */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-gray-900 text-base sm:text-lg group-hover:text-pink-600 transition-colors">
            {waybill}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded-md text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
            title="Salin AWB"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-pink-50 text-pink-600 border border-pink-100">
            {serviceType}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {status}
          </span>
        </div>
      </div>

      {/* Store Name & Receiver */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-gray-500">Nama Pengusaha:</span>
          <span className="font-semibold text-gray-900 truncate">{storeName}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-gray-500">Receiver:</span>
          <span className="font-semibold text-gray-900 truncate">{receiverName}</span>
        </div>
      </div>

      {/* Route (Origin City -> Destination City) */}
      <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <MapPin className="w-3.5 h-3.5 text-pink-500 shrink-0" />
          <span className="font-medium text-gray-700 truncate">{originCity}</span>
          <span className="text-gray-300 font-bold">→</span>
          <span className="font-medium text-gray-700 truncate">{destinationCity}</span>
        </div>
        <div className="flex items-center gap-1 text-pink-600 font-medium shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
          <span>Detail</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
