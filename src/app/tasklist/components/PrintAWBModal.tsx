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

  const [extraData, setExtraData] = useState<{
    shipperName?: string;
    shipperPhone?: string;
    shipperAddress?: string;
    shipperCity?: string;
    shipperZip?: string;
    recipientName?: string;
    recipientPhone?: string;
    recipientAddress?: string;
    recipientCity?: string;
    recipientZip?: string;
    serviceCode?: string;
    weight?: number;
    bookingId?: string;
    sourceOrderNo?: string;
    orderSource?: string;
    invoice?: string;
    itemName?: string;
    itemQty?: number;
    codAmount?: number;
    routingCode?: string;
  } | null>(null);
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
  const serviceType = firstTask.product_code || firstTask.productCode || firstTask.service || "REG";
  
  const initialShipperName = firstTask.shipperInfo?.name || firstTask.shipper_info?.name || tasklist?.owner_name || tasklist?.client_name || "-";
  const initialShipperPhone = firstTask.shipperInfo?.phone || firstTask.shipper_info?.phone || tasklist?.owner_phone || "-";
  
  const initialRecipientName = firstTask.recipientInfo?.name || firstTask.recipient_info?.name || "-";
  const initialRecipientPhone = firstTask.recipientInfo?.phone || firstTask.recipient_info?.phone || "-";
  const initialRecipientAddress = firstTask.recipientInfo?.address || firstTask.recipient_info?.address || "-";
  
  const weight = tasklist?.tasks?.reduce((acc, t: any) => acc + (t.parcel_total_weight || t.parcelTotalWeight || 0), 0) || 900; // default 0.9kg

  useEffect(() => {
    if (isOpen && awb !== "-") {
      setLoadingExtra(true);
      fetch(`/api/awb/${awb}`)
        .then(res => res.json())
        .then(res => {
          if (res.success && res.data) {
            const d = res.data;
            setExtraData({
              shipperName: d.shipperInfo?.name || d.shipperName,
              shipperPhone: d.shipperInfo?.phone,
              shipperAddress: d.shipperInfo?.address,
              shipperCity: d.shipperInfo?.city_name || d.shipperInfo?.city,
              shipperZip: d.shipperInfo?.zip || d.shipperInfo?.postcode,
              recipientName: d.receiverInfo?.name || d.receiverName,
              recipientPhone: d.receiverInfo?.phone,
              recipientAddress: d.receiverInfo?.address || d.destinationCity,
              recipientCity: d.receiverInfo?.city_name || d.receiverInfo?.city,
              recipientZip: d.receiverInfo?.zip || d.receiverInfo?.postcode,
              serviceCode: d.serviceCode,
              weight: d.weight,
              bookingId: d.sourceOrderNo || d.invoice || d.waybill,
              sourceOrderNo: d.sourceOrderNo,
              orderSource: d.orderSource,
              invoice: d.invoice,
              itemName: d.items?.[0]?.item_name || d.items?.[0]?.itemName || d.items?.[0]?.description,
              itemQty: d.items?.[0]?.quantity || d.items?.[0]?.qty || 1,
              codAmount: d.codAmount,
            });
          } else {
            return axios.post('/api/track', { awb }).then(trackRes => {
              if (trackRes.data) {
                setExtraData({
                  shipperName: trackRes.data.sender !== '-' ? trackRes.data.sender : undefined,
                  recipientName: trackRes.data.receiver !== '-' ? trackRes.data.receiver : undefined,
                  recipientAddress: trackRes.data.destination !== '-' ? trackRes.data.destination : undefined,
                  serviceCode: trackRes.data.service !== '-' ? trackRes.data.service : undefined,
                });
              }
            });
          }
        })
        .catch(err => console.error("Gagal load detail AWB:", err))
        .finally(() => setLoadingExtra(false));
    }
  }, [isOpen, awb]);

  if (!tasklist || !isOpen) return null;

  const shipperName = extraData?.shipperName || initialShipperName;
  const shipperPhone = extraData?.shipperPhone || initialShipperPhone;
  const recipientName = extraData?.recipientName || initialRecipientName;
  const recipientPhone = extraData?.recipientPhone || initialRecipientPhone;
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
                serviceType={extraData?.serviceCode || serviceType}
                shipperName={shipperName}
                shipperPhone={shipperPhone}
                shipperAddress={extraData?.shipperAddress || firstTask.shipperInfo?.address}
                shipperCity={extraData?.shipperCity || firstTask.shipperInfo?.city || firstTask.shipperInfo?.city_name}
                shipperZip={extraData?.shipperZip || firstTask.shipperInfo?.zipCode || firstTask.shipperInfo?.postcode}
                recipientName={recipientName}
                recipientPhone={recipientPhone}
                recipientAddress={recipientAddress}
                recipientCity={extraData?.recipientCity || firstTask.recipientInfo?.city || firstTask.recipientInfo?.city_name}
                recipientZip={extraData?.recipientZip || firstTask.recipientInfo?.zipCode || firstTask.recipientInfo?.postcode}
                weight={extraData?.weight || weight}
                bookingId={extraData?.bookingId || firstTask.source_order_no || firstTask.sourceOrderNo || firstTask.task_code || firstTask.taskCode}
                sourceOrderNo={extraData?.sourceOrderNo || firstTask.source_order_no || firstTask.sourceOrderNo}
                orderSource={extraData?.orderSource || firstTask.order_source || firstTask.orderSource || tasklist.order_source || tasklist.client_name || "Mitraaja"}
                invoice={extraData?.invoice || firstTask.invoice_no || firstTask.invoiceNo}
                itemName={extraData?.itemName || firstTask.items?.[0]?.itemDesc || firstTask.item_name || "Barang Kiriman"}
                itemQty={extraData?.itemQty || firstTask.items?.[0]?.qty || 1}
                codAmount={extraData?.codAmount || firstTask.payment?.amount || firstTask.cod_amount || 0}
                notes={firstTask.note}
                routingCode={extraData?.routingCode || firstTask.routing_code || "0001"}
              />
            </div>
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
