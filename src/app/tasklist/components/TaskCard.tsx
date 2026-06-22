"use client";

import React from "react";
import { MaaTaskList } from "@/types/tasklist";
import { MapPin, Phone, Package, ExternalLink, Box } from "lucide-react";

interface TaskCardProps {
  tasklist: MaaTaskList;
  onClickDetail: () => void;
}

export default function TaskCard({ tasklist, onClickDetail }: TaskCardProps) {
  // We should also use the correct property for parcel_total_weight if MaaTask uses snake_case.
  // In Java: @c(a = "parcel_total_weight") private Double parcelTotalWeight;
  // If the API returns snake_case, it's `parcel_total_weight`.
  const totalWeight = tasklist.tasks?.reduce((acc, task: any) => acc + (task.parcel_total_weight || task.parcelTotalWeight || 0), 0) || 0;
  const taskCount = tasklist.tasks?.length || 0;

  return (
    <div 
      className="bg-white/80 backdrop-blur-md rounded-2xl p-5 mb-4 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 cursor-pointer group"
      onClick={onClickDetail}
    >
      <div className="flex justify-between items-start mb-3">
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

      <div className="border-t border-gray-100 pt-3 mt-3 flex items-center justify-between text-sm">
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
    </div>
  );
}
