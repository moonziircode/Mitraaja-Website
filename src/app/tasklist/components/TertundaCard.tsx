"use client";

import React, { useState, useEffect } from "react";
import { MaaTaskList } from "@/types/tasklist";
import axios from "axios";
import { MapPin, Phone, Package, ExternalLink, Clock, User, FileText, Truck } from "lucide-react";

interface TertundaCardProps {
  tasklist: MaaTaskList;
  onClickDetail: () => void;
  onPrint?: () => void;
}

export default function TertundaCard({ tasklist, onClickDetail, onPrint }: TertundaCardProps) {
  const taskCount = tasklist.tasks?.length || 0;
  
  // Use the first task as representative for the group
  const firstTask: any = tasklist.tasks?.[0] || {};
  if (!firstTask) return null;
  
  const waybill = firstTask.waybill_no || firstTask.waybillNo || firstTask.task_code || "-";
  const serviceType = firstTask.product_code || firstTask.productCode || firstTask.service || "SD";
  const status = firstTask.task_status || firstTask.taskStatus || firstTask.order_status || "MENUNGGU PICKUP";
  
  const initialShipperName = firstTask.shipperInfo?.name || firstTask.shipper_info?.name || tasklist.owner_name || tasklist.client_name || "Tanpa Nama";
  const initialRecipientName = firstTask.recipientInfo?.name || firstTask.recipient_info?.name || "Penerima -";
  
  const [extraData, setExtraData] = useState<{ shipperName?: string, recipientName?: string } | null>(null);

  useEffect(() => {
    if (waybill !== "-" && (initialShipperName === "Tanpa Nama" || initialRecipientName === "Penerima -")) {
      axios.post('/api/track', { awb: waybill })
        .then(res => {
          if (res.data) {
            setExtraData({
              shipperName: res.data.sender !== '-' ? res.data.sender : undefined,
              recipientName: res.data.receiver !== '-' ? res.data.receiver : undefined,
            });
          }
        })
        .catch(() => {});
    }
  }, [waybill, initialShipperName, initialRecipientName]);

  const shipperName = extraData?.shipperName || initialShipperName;
  const recipientName = extraData?.recipientName || initialRecipientName;
  
  const shipperCity = firstTask.shipperInfo?.city || firstTask.shipper_info?.city || "-";
  const recipientCity = firstTask.recipientInfo?.city || firstTask.recipient_info?.city || "-";
  
  const createdAt = new Date(firstTask.createdAt || firstTask.created_at || Date.now());
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60)) % 60;
  const waitingTime = diffHours > 0 ? `${diffHours} jam ${diffMinutes} mnt` : `${diffMinutes} menit`;

  return (
    <div 
      className="bg-white/80 backdrop-blur-md rounded-xl p-4 mb-3 border border-gray-100 shadow-sm hover:border-pink-200 transition-all duration-300 cursor-pointer group"
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
          <h3 className="font-mono font-bold text-gray-800 text-base group-hover:text-pink-600 transition-colors">
            {waybill}
          </h3>
          <div className="flex items-center text-xs text-gray-600 mt-1.5 font-medium">
            <User className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            <span>Pengirim: {shipperName}</span>
          </div>
          <div className="flex items-center text-[10px] text-gray-500 mt-0.5">
            <User className="w-3 h-3 mr-1.5 text-gray-300" />
            <span>Penerima: {recipientName}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="bg-pink-50 p-2 rounded-lg text-center min-w-[60px]">
            <span className="block text-xs text-pink-600 font-bold">{serviceType}</span>
            {taskCount > 1 && <span className="block text-[10px] text-pink-500 mt-0.5">{taskCount} Paket</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded-lg text-[11px] text-gray-600">
        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="truncate">{shipperCity}</span>
        <span className="text-gray-300 font-bold">→</span>
        <span className="truncate">{recipientCity}</span>
      </div>

      <div className="border-t border-gray-100 pt-3 mt-2 flex flex-col gap-2">
        <div className="flex items-start justify-between text-xs">
          <div className="flex items-center gap-1 text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded-md">
            <Truck className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wide">{status.replace(/_/g, " ")}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
             <span className="text-[10px] text-gray-400">Tertunda Sejak</span>
             <span className="text-[10px] font-semibold text-gray-700">{waitingTime} lalu</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between w-full mt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onPrint) {
                onPrint();
              } else {
                onClickDetail();
              }
            }}
            className="flex-1 bg-white border border-pink-200 text-pink-600 hover:bg-pink-50 font-medium py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 mr-2"
          >
            <FileText className="w-3 h-3" /> Generate AWB
          </button>
          
          <div className="flex items-center text-pink-600 font-medium text-[11px] bg-white border border-transparent group-hover:border-pink-100 py-1.5 px-2 rounded-lg transition-colors">
            Detail
            <ExternalLink className="w-3 h-3 ml-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
