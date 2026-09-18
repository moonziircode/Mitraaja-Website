"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MaaTaskList } from "@/types/tasklist";
import { 
  X, 
  MapPin, 
  Package, 
  Clock, 
  User, 
  Phone, 
  FileText, 
  CreditCard, 
  Loader2, 
  Trash2, 
  Copy, 
  Check, 
  Store, 
  Truck, 
  Compass, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Scale
} from "lucide-react";
import axios from "axios";
import PaymentModal from "@/components/PaymentModal";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasklist: any | null;
  activeTab: string; // "TERTUNDA" | "RIWAYAT_ORDER"
  onActionSuccess?: (code?: string) => void;
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

function getVal(val: any, fallback: string = "-"): string {
  if (val === null || val === undefined || val === "" || val === "null" || val === "undefined") {
    return fallback;
  }
  if (typeof val === "boolean") {
    return val ? "Ya" : "Tidak";
  }
  if (typeof val === "object") {
    try {
      const s = JSON.stringify(val);
      return s === "{}" || s === "[]" ? fallback : s;
    } catch {
      return fallback;
    }
  }
  return String(val);
}

function formatPrice(val: any): string {
  if (val === null || val === undefined || val === "" || val === "null" || isNaN(Number(val))) {
    return "-";
  }
  return `Rp ${Number(val).toLocaleString("id-ID")}`;
}

function InfoField({ 
  label, 
  value, 
  isMono = false,
  fullWidth = false
}: { 
  label: string; 
  value: any; 
  isMono?: boolean;
  fullWidth?: boolean;
}) {
  const displayVal = getVal(value);
  return (
    <div className={`p-2.5 bg-gray-50/90 rounded-xl border border-gray-100 ${fullWidth ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">
        {label}
      </span>
      <span className={`text-xs sm:text-sm font-semibold text-gray-800 break-words block ${isMono ? "font-mono" : ""}`}>
        {displayVal}
      </span>
    </div>
  );
}

export default function TaskDetailModal({ 
  isOpen, 
  onClose, 
  tasklist, 
  activeTab,
  onActionSuccess 
}: TaskDetailModalProps) {
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Payment & Void Actions
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  const firstTask: any = tasklist?.tasks?.[0] || (tasklist?.waybill || tasklist?.waybill_no || tasklist?.task_code ? tasklist : {}) || {};
  const isTertunda = activeTab === "TERTUNDA";

  // Merge tasklist task object with optional orderDetail API
  const t: any = { ...firstTask, ...(orderDetail || {}) };

  const taskCode = t.task_code || t.taskCode || t.booking_id || t.bookingId || "";
  const waybillNo = t.waybill || t.waybill_no || t.waybillNo || "";
  const displayCode = isTertunda 
    ? (waybillNo || taskCode || "-") 
    : (taskCode || waybillNo || "-");

  // 5 Essential Fields for Tertunda
  const serviceType = 
    orderDetail?.product_code ||
    orderDetail?.service_type ||
    firstTask.service_type ||
    firstTask.serviceType ||
    firstTask.product_code ||
    firstTask.productCode ||
    t.product_code ||
    t.service_type ||
    "REG";

  const rawScanTime = 
    orderDetail?.scan_time ||
    orderDetail?.scanTime ||
    firstTask.scan_time ||
    firstTask.scanTime ||
    t.scan_time ||
    t.scanTime ||
    firstTask.updated_timestamp ||
    firstTask.created_timestamp;

  const displayScanTime = formatWibDate(rawScanTime);

  const storeName = 
    orderDetail?.store_name ||
    orderDetail?.storeName ||
    firstTask.store_name ||
    firstTask.storeName ||
    firstTask.ownership_name ||
    tasklist?.owner_name ||
    tasklist?.client_name ||
    t.store_name ||
    t.ownership_name ||
    "-";

  const rawWeight = 
    orderDetail?.weight ??
    orderDetail?.parcel_total_weight ??
    firstTask.weight ??
    firstTask.parcel_total_weight ??
    t.weight ??
    t.parcel_total_weight ??
    (orderDetail?.items?.[0]?.weight);

  const displayWeight = rawWeight !== undefined && rawWeight !== null && !isNaN(Number(rawWeight))
    ? `${Number(rawWeight)} kg`
    : "-";

  const itemName = 
    orderDetail?.item_name ||
    orderDetail?.itemName ||
    firstTask.item_name ||
    firstTask.itemName ||
    orderDetail?.items?.[0]?.item_name ||
    orderDetail?.items?.[0]?.name ||
    firstTask.parcel_content ||
    t.item_name ||
    t.parcel_content ||
    "-";

  // Fetch detailed data whenever modal opens
  useEffect(() => {
    if (isOpen && tasklist) {
      setIsLoadingDetail(true);
      setOrderDetail(null);

      const targetCode = taskCode || displayCode;

      if (targetCode && targetCode !== "-") {
        axios.get(`/api/orders/${encodeURIComponent(targetCode)}/detail`)
          .then(res => {
            if (res.data?.success && res.data?.data) {
              setOrderDetail(res.data.data);
            }
          })
          .catch(() => {})
          .finally(() => {
            setIsLoadingDetail(false);
          });
      } else {
        setIsLoadingDetail(false);
      }
    } else {
      setOrderDetail(null);
      setCopiedCode(false);
    }
  }, [isOpen, tasklist, taskCode, displayCode]);

  if (!tasklist) return null;

  const handleCopyCode = (text: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Parse items from good_description or items array
  let parsedItems: any[] = [];
  if (Array.isArray(t.items) && t.items.length > 0) {
    parsedItems = t.items;
  } else if (typeof t.good_description === "string") {
    try {
      const p = JSON.parse(t.good_description);
      if (Array.isArray(p)) parsedItems = p;
      else if (typeof p === "object" && p !== null) parsedItems = [p];
    } catch {}
  } else if (Array.isArray(t.good_description)) {
    parsedItems = t.good_description;
  }

  // Fallback single item if no array is found
  if (parsedItems.length === 0) {
    parsedItems = [
      {
        item_name: t.item_name || t.itemName || "-",
        item_desc: t.item_desc || t.itemDesc || "-",
        item_category: t.item_category || t.itemCategory || "-",
        declared_value: t.declared_value ?? t.declaredValue ?? t.item_value,
        weight: t.weight ?? t.parcel_total_weight ?? t.parcelTotalWeight,
        width: t.width,
        height: t.height,
        length: t.length,
        fragile: t.fragile,
      }
    ];
  }

  // Raw Payment & Delivery Price
  const rawPaymentStatus = t.payment_status || t.paymentStatus || (isTertunda ? "PAID" : "NOT_PAID");
  const isUnpaid = rawPaymentStatus === "NOT_PAID" || (!isTertunda && rawPaymentStatus !== "PAID");
  const deliveryPrice = Number(t.total_price ?? t.totalPrice ?? t.delivery_price ?? t.total_delivery_price ?? t.totalDeliveryPrice ?? 0);

  // Handle Void / Delete Order
  const handleVoidOrder = async () => {
    const codeToVoid = taskCode || displayCode;
    if (!codeToVoid || codeToVoid === "-") return;

    if (!confirm(`Apakah Anda yakin ingin membatalkan dan menghapus pesanan ini (${codeToVoid})?`)) {
      return;
    }

    setIsActionLoading(true);
    try {
      const response = await axios.post("/api/tasklist/void", {
        taskCode: codeToVoid,
      });

      if (response.data.success) {
        alert("Pesanan berhasil dibatalkan dan dihapus.");
        onClose();
        if (onActionSuccess) onActionSuccess(codeToVoid);
      } else {
        alert(response.data.message || "Gagal membatalkan pesanan.");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Terjadi kesalahan saat membatalkan pesanan.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Payment Initiation
  const handleInitiatePayment = async () => {
    const codeToPay = taskCode || displayCode;
    if (!codeToPay || codeToPay === "-") return;

    setIsActionLoading(true);
    try {
      const response = await axios.post("/api/payment/initiate", {
        taskCode: codeToPay,
        deliveryPrice: deliveryPrice,
        shipperPhone: t.shipper_phone || tasklist.owner_phone || "081234567890",
      });

      if (response.data.success && response.data.paymentUrl) {
        setPaymentUrl(response.data.paymentUrl);
        setIsPaymentModalOpen(true);
      } else {
        alert(response.data.message || "Gagal memulai sesi pembayaran.");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Terjadi kesalahan saat menghubungi gateway pembayaran.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Refresh Payment Status
  const handleRefreshStatus = async () => {
    const codeToCheck = taskCode || displayCode;
    if (!codeToCheck || codeToCheck === "-") return;

    setIsRefreshingStatus(true);
    try {
      const response = await axios.get(`/api/payment/status/${encodeURIComponent(codeToCheck)}`);
      if (response.data.success && (response.data.paymentStatus === "PAID" || response.data.status === "SUCCESS")) {
        alert("Pembayaran berhasil dikonfirmasi! AWB telah terbit.");
        setIsPaymentModalOpen(false);
        onClose();
        if (onActionSuccess) onActionSuccess();
      } else {
        alert("Pembayaran belum terkonfirmasi. Jika Anda baru saja membayar, harap tunggu 10-30 detik lalu refresh kembali.");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Gagal mengecek status pembayaran.");
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
          />

          {/* Centered Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`relative w-full ${isTertunda ? "max-w-2xl" : "max-w-4xl"} bg-white rounded-3xl z-10 overflow-hidden flex flex-col shadow-2xl border border-gray-100 max-h-[90vh] my-auto`}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-50 rounded-xl text-pink-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    Detail Order: <span className="font-mono text-pink-600">{displayCode}</span>
                    {isLoadingDetail && <Loader2 className="w-4 h-4 animate-spin text-pink-500" />}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {isTertunda ? "Informasi ringkas paket tertunda" : "Informasi detail lengkap pesanan sesuai data sistem"}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="p-6 overflow-y-auto no-scrollbar flex-1 space-y-6">
              
              {/* Top Banner: Quick Summary */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50/50 rounded-2xl p-4 border border-pink-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-pink-600 uppercase tracking-wider block">Waybill / AWB</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xl sm:text-2xl font-extrabold text-gray-900">
                      {waybillNo || displayCode}
                    </span>
                    <button
                      onClick={() => handleCopyCode(waybillNo || displayCode)}
                      className="p-1.5 rounded-lg bg-white hover:bg-pink-100 text-gray-500 hover:text-pink-600 transition-colors shadow-2xs border border-pink-100"
                      title="Salin AWB"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-pink-600 shadow-2xs border border-pink-100">
                    {getVal(t.service_type || t.serviceType || t.product_code || "REG")}
                  </span>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200">
                    {(() => {
                      const st = t.order_status || t.orderStatus || t.task_status || "";
                      if (!st || st === "WAITING_FOR_HANDOVER_SERAH") return "Tertunda";
                      return st;
                    })()}
                  </span>
                </div>
              </div>

              {isTertunda ? (
                /* Simplified Detail for Tertunda - EXACTLY 5 Required Fields */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* 1. Service Type */}
                    <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-100 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                          Service Type
                        </span>
                        <span className="text-sm font-bold text-gray-900 truncate block">
                          {serviceType}
                        </span>
                      </div>
                    </div>

                    {/* 2. Waktu Scan */}
                    <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-100 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                          Waktu Scan
                        </span>
                        <span className="text-sm font-bold text-gray-900 font-mono truncate block">
                          {displayScanTime}
                        </span>
                      </div>
                    </div>

                    {/* 3. Store Name */}
                    <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-100 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                          Store Name
                        </span>
                        <span className="text-sm font-bold text-gray-900 truncate block">
                          {storeName}
                        </span>
                      </div>
                    </div>

                    {/* 4. Weight */}
                    <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-100 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <Scale className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                          Weight
                        </span>
                        <span className="text-sm font-bold text-gray-900 truncate block">
                          {displayWeight}
                        </span>
                      </div>
                    </div>

                    {/* 5. Item Name */}
                    <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-100 flex items-start gap-3.5 sm:col-span-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                          Item Name
                        </span>
                        <span className="text-sm font-bold text-gray-900 leading-snug break-words block">
                          {itemName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* [A. INFORMASI ORDER] */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 text-pink-600">
                      <FileText className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                        A. Informasi Order
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      <InfoField label="order_code" value={t.order_code || t.orderCode} isMono />
                      <InfoField label="waybill" value={t.waybill || t.waybill_no || t.waybillNo} isMono />
                      <InfoField label="client_code" value={t.client_code || t.clientCode} />
                      <InfoField label="client_name" value={t.client_name || t.clientName || tasklist.client_name} />
                      <InfoField label="client_order_code" value={t.client_order_code || t.clientOrderCode || t.source_order_no} isMono />
                      <InfoField label="client_invoice_number" value={t.client_invoice_number || t.clientInvoiceNumber || t.invoice_no} isMono />
                      <InfoField label="order_type" value={t.order_type || t.orderType || t.task_type} />
                      <InfoField label="order_tab_menu" value={t.order_tab_menu || t.orderTabMenu} />
                      <InfoField label="order_state" value={t.order_state || t.orderState} />
                      <InfoField label="order_source" value={t.order_source || t.orderSource || tasklist.order_source} />
                      <InfoField label="service_type" value={t.service_type || t.serviceType || t.product_code} />
                      <InfoField label="order_status" value={t.order_status || t.orderStatus || t.task_status} />
                      <InfoField label="payment_status" value={t.payment_status || t.paymentStatus} />
                      <InfoField label="created_timestamp" value={t.created_timestamp || t.createdTimestamp || t.createdAt || t.created_at} />
                      <InfoField label="updated_timestamp" value={t.updated_timestamp || t.updatedTimestamp || t.updatedAt || t.updated_at} />
                    </div>
                  </div>

                  {/* [B. INFORMASI SHIPPER (PENGIRIM)] */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 text-blue-600">
                      <User className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                        B. Informasi Shipper (Pengirim)
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      <InfoField label="shipper_name" value={t.shipper_name || t.shipperName || t.shipper_info?.name} />
                      <InfoField label="shipper_phone" value={t.shipper_phone || t.shipperPhone || t.shipper_info?.phone} isMono />
                      <InfoField label="shipper_city" value={t.shipper_city || t.shipperCity || t.shipper_info?.city_name || t.shipper_info?.city} />
                      <InfoField label="shipper_district_code" value={t.shipper_district_code || t.shipperDistrictCode || t.shipper_info?.district_code} isMono />
                      <InfoField label="shipper_subdistrict" value={t.shipper_subdistrict || t.shipperSubdistrict || t.shipper_info?.district_name} />
                      <InfoField label="shipper_postcode" value={t.shipper_postcode || t.shipperPostcode || t.shipper_info?.postcode || t.shipper_info?.zip} isMono />
                      <InfoField label="shipper_geoloc" value={t.shipper_geoloc || t.shipperGeoloc} />
                      <InfoField label="shipper_address" value={t.shipper_address || t.shipperAddress || t.shipper_info?.address} fullWidth />
                    </div>
                  </div>

                  {/* [C. INFORMASI RECEIVER (PENERIMA)] */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 text-purple-600">
                      <MapPin className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                        C. Informasi Receiver (Penerima)
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      <InfoField label="receiver_name" value={t.receiver_name || t.receiverName || t.receiver_info?.name || t.recipientInfo?.name} />
                      <InfoField label="receiver_phone" value={t.receiver_phone || t.receiverPhone || t.receiver_info?.phone || t.recipientInfo?.phone} isMono />
                      <InfoField label="receiver_customer_id" value={t.receiver_customer_id || t.receiverCustomerId} isMono />
                      <InfoField label="receiver_city" value={t.receiver_city || t.receiverCity || t.receiver_info?.city_name || t.receiver_info?.city || t.recipientInfo?.city} />
                      <InfoField label="receiver_district_code" value={t.receiver_district_code || t.receiverDistrictCode || t.receiver_info?.district_code} isMono />
                      <InfoField label="receiver_subdistrict" value={t.receiver_subdistrict || t.receiverSubdistrict || t.receiver_info?.district_name} />
                      <InfoField label="receiver_postcode" value={t.receiver_postcode || t.receiverPostcode || t.receiver_info?.postcode || t.receiver_info?.zip} isMono />
                      <InfoField label="receiver_geoloc" value={t.receiver_geoloc || t.receiverGeoloc} />
                      <InfoField label="receiver_label" value={t.receiver_label || t.receiverLabel} />
                      <InfoField label="receiver_note" value={t.receiver_note || t.receiverNote} />
                      <InfoField label="receiver_address" value={t.receiver_address || t.receiverAddress || t.receiver_info?.address || t.recipientInfo?.address} fullWidth />
                    </div>
                  </div>

                  {/* [D. INFORMASI TOKO / STORE] */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 text-amber-600">
                      <Store className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                        D. Informasi Toko / Ownership
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      <InfoField label="store_name" value={t.store_name || t.storeName || tasklist.owner_name} />
                      <InfoField label="ownership_name" value={t.ownership_name || t.ownershipName || tasklist.owner_name} />
                      <InfoField label="ownership_phone" value={t.ownership_phone || t.ownershipPhone || tasklist.owner_phone} isMono />
                      <InfoField label="owner_name" value={tasklist.owner_name || t.owner_name} />
                      <InfoField label="owner_phone" value={tasklist.owner_phone || t.owner_phone} isMono />
                    </div>
                  </div>

                  {/* [E. INFORMASI BIAYA & PEMBAYARAN] */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 text-emerald-600">
                      <CreditCard className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                        E. Informasi Biaya & Pembayaran
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      <InfoField label="delivery_price" value={formatPrice(t.delivery_price || t.deliveryPrice)} />
                      <InfoField label="insurance" value={formatPrice(t.insurance || t.insurance_price)} />
                      <InfoField label="platform_fee" value={formatPrice(t.platform_fee || t.platformFee)} />
                      <InfoField label="service_fee" value={formatPrice(t.service_fee || t.serviceFee)} />
                      <InfoField label="voucher" value={formatPrice(t.voucher)} />
                      <InfoField label="total_price" value={formatPrice(t.total_price || t.totalPrice || deliveryPrice)} />
                      <InfoField label="payment_type" value={t.payment_type || t.paymentType} />
                      <InfoField label="payment_status" value={t.payment_status || t.paymentStatus} />
                      <InfoField label="transaction_id" value={t.transaction_id || t.transactionId} isMono />
                      <InfoField label="va_number" value={t.va_number || t.vaNumber} isMono />
                    </div>
                  </div>

                  {/* [F. DETAIL BARANG] */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 text-rose-600">
                      <Package className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                        F. Detail Barang ({parsedItems.length} Item)
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      {parsedItems.map((it: any, idx: number) => {
                        const itemName = it.item_name || it.itemName || it.name || "-";
                        const itemDesc = it.item_desc || it.itemDesc || it.desc || "-";
                        const itemCategory = it.item_category || it.itemCategory || it.category || "-";
                        const declaredVal = it.declared_value || it.declaredValue || it.price || 0;
                        const weightVal = it.weight ? `${it.weight} kg` : "-";
                        const widthVal = it.width ? `${it.width} cm` : "-";
                        const heightVal = it.height ? `${it.height} cm` : "-";
                        const lengthVal = it.length ? `${it.length} cm` : "-";
                        const fragileVal = it.fragile ? "Ya" : "Tidak";

                        return (
                          <div key={idx} className="p-4 bg-gray-50/70 rounded-xl border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-gray-800">Item #{idx + 1}</span>
                              {it.fragile && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md">
                                  Fragile
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                              <InfoField label="item_name" value={itemName} />
                              <InfoField label="item_desc" value={itemDesc} />
                              <InfoField label="item_category" value={itemCategory} />
                              <InfoField label="declared_value" value={declaredVal > 0 ? formatPrice(declaredVal) : "-"} />
                              <InfoField label="weight" value={weightVal} />
                              <InfoField label="width" value={widthVal} />
                              <InfoField label="height" value={heightVal} />
                              <InfoField label="length" value={lengthVal} />
                              <InfoField label="fragile" value={fragileVal} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* [G. INFORMASI OPERASIONAL & TRACKING] */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 text-indigo-600">
                      <Truck className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                        G. Informasi Operasional & Tracking
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      <InfoField label="pickup" value={t.pickup} />
                      <InfoField label="pickup_sla" value={t.pickup_sla || t.pickupSla} />
                      <InfoField label="delivery_sla" value={t.delivery_sla || t.deliverySla} />
                      <InfoField label="jabatan_54" value={t.jabatan_54 || t.jabatan54} />
                      <InfoField label="54_id" value={t["54_id"] || t["54Id"]} isMono />
                      <InfoField label="52_tm" value={t["52_tm"] || t["52Tm"]} />
                      <InfoField label="56_tm" value={t["56_tm"] || t["56Tm"]} />
                      <InfoField label="59_tm" value={t["59_tm"] || t["59Tm"]} />
                      <InfoField label="order_time" value={t.order_time || t.orderTime} />
                      <InfoField label="expect_finish_tm" value={t.expect_finish_tm || t.expectFinishTm} />
                      <InfoField label="staging_origin" value={t.staging_origin || t.stagingOrigin} isMono />
                      <InfoField label="staging_delivery" value={t.staging_delivery || t.stagingDelivery} isMono />
                      <InfoField label="flag_drop_off" value={t.flag_drop_off || t.flagDropOff} />
                      <InfoField label="exception_remark" value={t.exception_remark || t.exceptionRemark} />
                      <InfoField label="exception_info" value={t.exception_info || t.exceptionInfo} />
                      <InfoField label="retrieval_code" value={t.retrieval_code || t.retrievalCode} isMono />
                      <InfoField label="op80" value={t.op80} />
                      <InfoField label="op90" value={t.op90} />
                    </div>
                  </div>

                  {/* [H. LOKASI & TRACKING TAMBAHAN] */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 text-cyan-600">
                      <Compass className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                        H. Lokasi & Tracking Tambahan
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      <InfoField label="latitude_59" value={t.latitude_59 || t.latitude59} isMono />
                      <InfoField label="longitude_59" value={t.longitude_59 || t.longitude59} isMono />
                      <InfoField label="shipper_geoloc" value={t.shipper_geoloc || t.shipperGeoloc} />
                      <InfoField label="receiver_geoloc" value={t.receiver_geoloc || t.receiverGeoloc} />
                      <InfoField label="city" value={t.city} />
                      <InfoField label="staging_origin" value={t.staging_origin || t.stagingOrigin} isMono />
                      <InfoField label="staging_delivery" value={t.staging_delivery || t.stagingDelivery} isMono />
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Modal Sticky Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)]">
              {!isTertunda && (
                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3">
                  <span className="text-xs text-gray-500">Total Tarif:</span>
                  <span className="text-lg font-bold text-pink-600">
                    {deliveryPrice > 0 ? formatPrice(deliveryPrice) : "-"}
                  </span>
                </div>
              )}

              <div className={`w-full ${isTertunda ? "flex justify-end" : "sm:w-auto flex items-center gap-2.5"}`}>
                {isUnpaid && !isTertunda ? (
                  <>
                    <button
                      onClick={handleVoidOrder}
                      disabled={isActionLoading}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm transition-colors disabled:opacity-50"
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      <span>Hapus Order</span>
                    </button>

                    <button
                      onClick={handleInitiatePayment}
                      disabled={isActionLoading}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold text-sm shadow-md shadow-pink-200 transition-all disabled:opacity-50"
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                      <span>Lanjut ke Pembayaran</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-colors"
                  >
                    Tutup
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

          {/* Payment Modal for Checkout & QRIS */}
          <PaymentModal 
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            paymentUrl={paymentUrl}
            onRefreshStatus={handleRefreshStatus}
            isRefreshing={isRefreshingStatus}
          />
        </>
      )}
    </AnimatePresence>
  );
}

