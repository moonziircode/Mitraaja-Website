"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer } from "lucide-react";
import AWBLabel from "@/components/awb/AWBLabel";
import { MaaTaskList } from "@/types/tasklist";

interface PrintAWBModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasklist: MaaTaskList | null;
}

export default function PrintAWBModal({ isOpen, onClose, tasklist }: PrintAWBModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Focus lock or escape key to close can be added here
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!tasklist || !isOpen) return null;

  const firstTask: any = tasklist.tasks?.[0] || {};
  const awb = firstTask.waybill_no || firstTask.waybillNo || firstTask.task_code || "-";
  const serviceType = firstTask.product_code || firstTask.productCode || "SD";
  
  const shipperName = firstTask.shipperInfo?.name || firstTask.shipper_info?.name || tasklist.owner_name || "-";
  const shipperPhone = firstTask.shipperInfo?.phone || firstTask.shipper_info?.phone || tasklist.owner_phone || "-";
  
  const recipientName = firstTask.recipientInfo?.name || firstTask.recipient_info?.name || "-";
  const recipientPhone = firstTask.recipientInfo?.phone || firstTask.recipient_info?.phone || "-";
  const recipientAddress = firstTask.recipientInfo?.address || firstTask.recipient_info?.address || "-";
  
  const weight = tasklist.tasks?.reduce((acc, t: any) => acc + (t.parcel_total_weight || t.parcelTotalWeight || 0), 0) || 900; // default 0.9kg
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 print:bg-transparent print:p-0"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gray-100 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-full print:shadow-none print:w-auto print:max-w-none print:rounded-none print:bg-white"
        >
          {/* Header UI (Hidden in Print) */}
          <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between print:hidden">
            <h2 className="text-lg font-bold text-gray-900">Preview AWB Label</h2>
            <button 
              onClick={onClose}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Label Preview Area */}
          <div className="p-6 overflow-y-auto print:p-0 flex justify-center">
            <div className="print:hidden p-4 bg-white rounded-xl shadow-sm inline-block">
              <AWBLabel
                ref={printRef}
                awb={awb}
                serviceType={serviceType}
                shipperName={shipperName}
                shipperPhone={shipperPhone}
                recipientName={recipientName}
                recipientPhone={recipientPhone}
                recipientAddress={recipientAddress}
                weight={weight}
                routingCode="33.10" // Default for now, as we don't have routing code in MaaTask
              />
            </div>
            {/* The actual element used for printing if we only want to print this.
                However, since we use global window.print(), we can just use CSS media queries
                to hide everything else on the page during print. 
            */}
          </div>

          {/* Footer UI (Hidden in Print) */}
          <div className="bg-white px-6 py-4 border-t border-gray-200 flex justify-end gap-3 print:hidden">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl font-semibold bg-pink-600 text-white hover:bg-pink-700 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Cetak Resi
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
