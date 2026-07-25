"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, Loader2 } from "lucide-react";
import AWBLabel from "@/components/awb/AWBLabel";
import { MaaTaskList } from "@/types/tasklist";
import axios from "axios";

interface PrintAWBModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasklist: MaaTaskList | null;
}

export default function PrintAWBModal({ isOpen, onClose, tasklist }: PrintAWBModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const [extraData, setExtraData] = useState<{ shipperName?: string, recipientName?: string, recipientAddress?: string } | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(false);

  // Focus lock or escape key to close can be added here
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Reset extraData when modal closes or tasklist changes
  useEffect(() => {
    if (!isOpen) {
      setExtraData(null);
    }
  }, [isOpen]);

  const firstTask: any = tasklist?.tasks?.[0] || {};
  const awb = firstTask.waybill_no || firstTask.waybillNo || firstTask.task_code || "-";
  const serviceType = firstTask.product_code || firstTask.productCode || firstTask.service || "SD";
  
  const initialShipperName = firstTask.shipperInfo?.name || firstTask.shipper_info?.name || tasklist?.owner_name || tasklist?.client_name || "-";
  const initialShipperPhone = firstTask.shipperInfo?.phone || firstTask.shipper_info?.phone || tasklist?.owner_phone || "-";
  
  const initialRecipientName = firstTask.recipientInfo?.name || firstTask.recipient_info?.name || "-";
  const initialRecipientPhone = firstTask.recipientInfo?.phone || firstTask.recipient_info?.phone || "-";
  const initialRecipientAddress = firstTask.recipientInfo?.address || firstTask.recipient_info?.address || "-";
  
  const weight = tasklist?.tasks?.reduce((acc, t: any) => acc + (t.parcel_total_weight || t.parcelTotalWeight || 0), 0) || 900; // default 0.9kg

  useEffect(() => {
    if (isOpen && awb !== "-" && (initialShipperName === "-" || initialRecipientName === "-")) {
      setLoadingExtra(true);
      axios.post('/api/track', { awb })
        .then(res => {
          if (res.data) {
            setExtraData({
              shipperName: res.data.sender !== '-' ? res.data.sender : undefined,
              recipientName: res.data.receiver !== '-' ? res.data.receiver : undefined,
              recipientAddress: res.data.destination !== '-' ? res.data.destination : undefined,
            });
          }
        })
        .catch(err => console.error("Gagal load tracking detail:", err))
        .finally(() => setLoadingExtra(false));
    }
  }, [isOpen, awb, initialShipperName, initialRecipientName]);

  if (!tasklist || !isOpen) return null;

  const shipperName = extraData?.shipperName || initialShipperName;
  const shipperPhone = initialShipperPhone;
  const recipientName = extraData?.recipientName || initialRecipientName;
  const recipientPhone = initialRecipientPhone;
  const recipientAddress = extraData?.recipientAddress || initialRecipientAddress;

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
            <div id="printable-label-modal" className="p-4 bg-white rounded-xl shadow-sm inline-block relative print:p-0 print:shadow-none print:rounded-none">
              {loadingExtra && (
                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 rounded-xl backdrop-blur-sm print:hidden">
                  <Loader2 className="w-8 h-8 animate-spin text-pink-600 mb-2" />
                  <span className="text-sm font-semibold text-gray-700">Mengambil data detail...</span>
                </div>
              )}
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
              disabled={loadingExtra}
              className="px-5 py-2.5 rounded-xl font-semibold bg-pink-600 text-white hover:bg-pink-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> Cetak Resi
            </button>
          </div>
        </motion.div>
      </motion.div>
      
      {/* ── Direct Print Styles Override ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide everything except the label */
          body * {
            visibility: hidden !important;
          }
          #printable-label-modal, #printable-label-modal * {
            visibility: visible !important;
          }
          /* Position label at the top-left of printable page */
          #printable-label-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100mm !important;
            height: 150mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          /* Control page dimensions (A6) */
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
          /* Disable default headers and footers */
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}} />
    </AnimatePresence>
  );
}
