"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MaaTaskList } from "@/types/tasklist";
import { X, MapPin, Package, Clock, User, Phone, Box, FileText, CreditCard } from "lucide-react";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasklist: MaaTaskList | null;
  activeTab: string; // "TERTUNDA" | "RIWAYAT_ORDER"
}

export default function TaskDetailModal({ isOpen, onClose, tasklist, activeTab }: TaskDetailModalProps) {
  if (!tasklist) return null;

  const firstTask: any = tasklist.tasks?.[0] || {};
  const isTertunda = activeTab === "TERTUNDA";

  const code = isTertunda 
    ? (firstTask.waybill_no || firstTask.waybillNo || firstTask.task_code || "-") 
    : (firstTask.task_code || "-");
  
  const senderName = firstTask.shipperInfo?.name || firstTask.shipper_info?.name || tasklist.owner_name || "-";
  const senderPhone = firstTask.shipperInfo?.phone || firstTask.shipper_info?.phone || tasklist.owner_phone || "-";
  const senderAddress = firstTask.shipperInfo?.address || firstTask.shipper_info?.address || "-";
  
  const recipientName = firstTask.recipientInfo?.name || firstTask.recipient_info?.name || "-";
  const recipientPhone = firstTask.recipientInfo?.phone || firstTask.recipient_info?.phone || "-";
  const recipientAddress = firstTask.recipientInfo?.address || firstTask.recipient_info?.address || "-";

  const totalWeight = tasklist.tasks?.reduce((acc, t: any) => acc + (t.parcel_total_weight || t.parcelTotalWeight || 0), 0) || 0;
  const serviceType = firstTask.product_code || firstTask.productCode || "SD";
  const deliveryPrice = firstTask.total_delivery_price || firstTask.totalDeliveryPrice || 0;
  const paymentStatus = firstTask.payment_status || firstTask.paymentStatus || "Belum Dibayar";
  
  const createdAt = new Date(firstTask.createdAt || firstTask.created_at || Date.now());
  const dateStr = createdAt.toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = createdAt.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
  const statusStr = firstTask.task_status || firstTask.taskStatus || (isTertunda ? "MENUNGGU PICKUP" : "NEW");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-3xl z-50 overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Detail {isTertunda ? "Tertunda" : "Booking"}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto no-scrollbar flex-1 pb-20">
              {/* Header Info */}
              <div className="bg-pink-50 rounded-2xl p-5 mb-6 border border-pink-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-pink-500 uppercase tracking-wider">
                    {isTertunda ? "Nomor AWB" : "Booking Code"}
                  </span>
                  <span className="px-2.5 py-1 bg-white rounded-lg text-xs font-bold text-pink-600 shadow-sm border border-pink-100">
                    {serviceType}
                  </span>
                </div>
                <div className="text-2xl font-mono font-bold text-gray-900 mb-4">{code}</div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 bg-white/60 p-3 rounded-xl border border-pink-100/50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-pink-400" />
                    <span>{dateStr} {timeStr}</span>
                  </div>
                  <div className="w-px h-4 bg-pink-200"></div>
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-pink-400" />
                    <span className="font-semibold text-gray-900">{tasklist.order_source || "Dropoff"}</span>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  Status
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Status Operasional</span>
                    <span className="font-semibold text-gray-900">{statusStr.replace(/_/g, " ")}</span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Status Pembayaran</span>
                    <span className={`font-semibold ${paymentStatus === "NOT_PAID" ? "text-yellow-600" : "text-green-600"}`}>
                      {paymentStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sender & Recipient */}
              <div className="relative mb-6">
                <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-100 rounded-full"></div>
                
                {/* Sender */}
                <div className="relative flex gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-pink-100 border-4 border-white flex items-center justify-center shrink-0 z-10 shadow-sm">
                    <User className="w-5 h-5 text-pink-600" />
                  </div>
                  <div className="pt-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pengirim</span>
                    <h4 className="font-bold text-gray-900 text-lg">{senderName}</h4>
                    <div className="flex items-center text-sm text-gray-500 mt-1 mb-2">
                      <Phone className="w-3.5 h-3.5 mr-1.5" />
                      {senderPhone}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {senderAddress}
                    </p>
                  </div>
                </div>

                {/* Recipient */}
                <div className="relative flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 border-4 border-white flex items-center justify-center shrink-0 z-10 shadow-sm">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="pt-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Penerima</span>
                    <h4 className="font-bold text-gray-900 text-lg">{recipientName}</h4>
                    <div className="flex items-center text-sm text-gray-500 mt-1 mb-2">
                      <Phone className="w-3.5 h-3.5 mr-1.5" />
                      {recipientPhone}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {recipientAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Package Details */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  Detail Paket
                </h3>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-3">
                    <span className="text-gray-600">Total Berat</span>
                    <span className="font-semibold text-gray-900">{totalWeight.toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-3">
                    <span className="text-gray-600">Jumlah Paket</span>
                    <span className="font-semibold text-gray-900">{tasklist.tasks?.length || 1} koli</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Ongkir</span>
                    <span className="font-bold text-pink-600 text-lg">Rp {deliveryPrice.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
