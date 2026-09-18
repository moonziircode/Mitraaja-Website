"use client";

import React, { useState } from "react";
import { MaaTaskList } from "@/types/tasklist";
import { 
  Store, 
  Copy, 
  Check, 
  ChevronDown, 
  Clock, 
  Truck, 
  Package, 
  Scale, 
  Eye, 
  Printer 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TertundaCardProps {
  tasklist: MaaTaskList;
  onClickDetail: (task: any) => void;
  onPrint?: (task: any) => void;
}

function formatWibDate(val: any): string {
  if (!val || val === "-" || val === "null" || val === "undefined") return "-";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val.trim())) {
    return val.trim();
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const pad = (n: number) => String(n).padStart(2, "0");
  const utcMs = d.getTime();
  const wibMs = utcMs + 7 * 3600 * 1000;
  const wibDate = new Date(wibMs);
  return `${wibDate.getUTCFullYear()}-${pad(wibDate.getUTCMonth() + 1)}-${pad(wibDate.getUTCDate())} ${pad(wibDate.getUTCHours())}:${pad(wibDate.getUTCMinutes())}:${pad(wibDate.getUTCSeconds())}`;
}

export default function TertundaCard({ tasklist, onClickDetail, onPrint }: TertundaCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [copiedAwb, setCopiedAwb] = useState<string | null>(null);

  const tasks: any[] = tasklist.tasks || [];
  if (tasks.length === 0) return null;

  const firstTask = tasks[0] || {};
  const storeName = (
    tasklist.owner_name || 
    tasklist.client_name || 
    firstTask.store_name || 
    firstTask.storeName || 
    firstTask.ownership_name || 
    "Mitra"
  ).trim();

  const totalAwb = tasks.length;

  const handleCopy = (e: React.MouseEvent, waybill: string) => {
    e.stopPropagation();
    if (waybill && waybill !== "-") {
      navigator.clipboard.writeText(waybill);
      setCopiedAwb(waybill);
      setTimeout(() => setCopiedAwb(null), 2000);
    }
  };

  return (
    <div className="mb-4">
      {/* Accordion Header: Store Name — Total AWB */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs hover:shadow-md hover:border-pink-200 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 group select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 border border-pink-100 group-hover:scale-105 transition-transform">
            <Store className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-gray-900 text-base sm:text-lg group-hover:text-pink-600 transition-colors truncate">
                {storeName}
              </h3>
              <span className="text-gray-300 font-bold">—</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-bold bg-pink-50 text-pink-600 border border-pink-100">
                {totalAwb} AWB
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {isOpen ? "Klik untuk menutup daftar paket" : "Klik untuk menampilkan daftar paket"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className={`w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-pink-600 group-hover:bg-pink-50 transition-all duration-200 ${isOpen ? "rotate-180" : ""}`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Accordion Content: List of AWBs under this Store */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-2.5 space-y-2.5 sm:pl-3">
              {tasks.map((task: any, index: number) => {
                const waybill = (
                  task.waybill || 
                  task.waybill_no || 
                  task.waybillNo || 
                  task.order_code || 
                  task.task_code || 
                  "-"
                ).trim();

                const serviceType = (
                  task.service_type || 
                  task.serviceType || 
                  task.product_code || 
                  task.productCode || 
                  "REG"
                ).trim();

                const rawScanTime = 
                  task.scan_time || 
                  task.scanTime || 
                  task.updated_timestamp || 
                  task.created_timestamp;

                const scanTime = formatWibDate(rawScanTime);

                const rawWeight = task.weight ?? task.parcel_total_weight;
                const weightDisplay = rawWeight !== undefined && rawWeight !== null && !isNaN(Number(rawWeight))
                  ? `${Number(rawWeight)} kg`
                  : "-";

                const itemName = (task.item_name || task.itemName || task.parcel_content || "-").trim();

                return (
                  <div 
                    key={task.task_code || task.waybill || index}
                    onClick={() => onClickDetail(task)}
                    className="bg-white rounded-xl p-3.5 sm:p-4 border border-gray-100 hover:border-pink-200 hover:shadow-sm transition-all duration-150 cursor-pointer group/item"
                  >
                    {/* Header Item: Waybill & Status Badges */}
                    <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900 text-sm sm:text-base group-hover/item:text-pink-600 transition-colors">
                          {waybill}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(e, waybill)}
                          className="p-1 rounded-md text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
                          title="Salin AWB"
                        >
                          {copiedAwb === waybill ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-pink-50 text-pink-600 border border-pink-100">
                          {serviceType}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Tertunda
                        </span>
                      </div>
                    </div>

                    {/* Quick Detail: Scan Time, Weight, Item Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600 bg-gray-50/70 rounded-lg p-2.5 mb-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-gray-400">Scan:</span>
                        <span className="font-medium text-gray-800 font-mono truncate">{scanTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Scale className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-gray-400">Berat:</span>
                        <span className="font-medium text-gray-800 truncate">{weightDisplay}</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Package className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-gray-400">Barang:</span>
                        <span className="font-medium text-gray-800 truncate">{itemName}</span>
                      </div>
                    </div>

                    {/* Actions: Detail & Cetak */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-50">
                      {onPrint && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPrint(task);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:text-pink-600 hover:bg-pink-50 border border-gray-200 hover:border-pink-200 transition-colors flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClickDetail(task);
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-pink-600 hover:bg-pink-50 border border-pink-100 transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
