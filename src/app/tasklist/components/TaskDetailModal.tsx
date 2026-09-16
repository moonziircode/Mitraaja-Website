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
  AlertCircle
} from "lucide-react";
import axios from "axios";
import PaymentModal from "@/components/PaymentModal";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasklist: MaaTaskList | null;
  activeTab: string; // "TERTUNDA" | "RIWAYAT_ORDER"
  onActionSuccess?: (code?: string) => void;
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

  const firstTask: any = tasklist?.tasks?.[0] || {};
  const isTertunda = activeTab === "TERTUNDA";

  // Merge tasklist task object with optional orderDetail API
  const t: any = { ...firstTask, ...(orderDetail || {}) };

  const taskCode = t.task_code || t.taskCode || t.booking_id || t.bookingId || "";
  const waybillNo = t.waybill || t.waybill_no || t.waybillNo || "";
  const displayCode = isTertunda 
    ? (waybillNo || taskCode || "-") 
    : (taskCode || waybillNo || "-");

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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 max-h-[92vh] bg-white rounded-t-3xl z-50 overflow-hidden flex flex-col shadow-2xl max-w-4xl mx-auto border border-gray-100"
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
                  <p className="text-xs text-gray-500">Informasi detail lengkap pesanan sesuai data sistem</p>
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
                  <InfoField label="request_pickup_time" value={t.request_pickup_time || t.requestPickupTime} />
                  <InfoField label="expiry_timestamp" value={t.expiry_timestamp || t.expiryTimestamp} />
                </div>
              </div>

              {/* [B. INFORMASI PENGUSAHA / TOKO] */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 text-purple-600">
                  <Store className="w-4 h-4" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                    B. Informasi Pengusaha / Toko
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <InfoField label="nia" value={t.nia || t.agent_nik} isMono />
                  <InfoField label="store_name" value={t.store_name || t.storeName || tasklist.owner_name} />
                  <InfoField label="main_business" value={t.main_business || t.mainBusiness} />
                  <InfoField label="customer_code" value={t.customer_code || t.customerCode} isMono />
                  <InfoField label="ownership_name" value={t.ownership_name || t.ownershipName || tasklist.owner_name} />
                  <InfoField label="ownership_phone" value={t.ownership_phone || t.ownershipPhone || tasklist.owner_phone} />
                  <InfoField label="ownership_id" value={t.ownership_id || t.ownershipId} isMono />
                  <InfoField label="agent_nik" value={t.agent_nik || t.agentNik} isMono />
                  <InfoField label="agent_staff_id" value={t.agent_staff_id || t.agentStaffId} isMono />
                  <InfoField label="shipper_shop_id" value={t.shipper_shop_id || t.shipperShopId} isMono />
                </div>
              </div>

              {/* [C. INFORMASI PENGIRIM (SHIPPER)] */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 text-blue-600">
                  <User className="w-4 h-4" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                    C. Informasi Pengirim (Shipper)
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <InfoField label="shipper_name" value={t.shipper_name || t.shipperName || t.shipperInfo?.name} />
                  <InfoField label="shipper_phone" value={t.shipper_phone || t.shipperPhone || t.shipperInfo?.phone} />
                  <InfoField label="shipper_province" value={t.shipper_province || t.shipperProvince || t.shipperInfo?.province} />
                  <InfoField label="shipper_city" value={t.shipper_city || t.shipperCity || t.shipperInfo?.city} />
                  <InfoField label="shipper_district_code" value={t.shipper_district_code || t.shipperDistrictCode || t.shipperInfo?.districtCode} />
                  <InfoField label="shipper_subdistrict" value={t.shipper_subdistrict || t.shipperSubdistrict || t.shipperInfo?.district} />
                  <InfoField label="shipper_postal_code" value={t.shipper_postal_code || t.shipperPostalCode || t.shipperInfo?.zipCode} />
                  <InfoField label="shipper_geoloc" value={t.shipper_geoloc || t.shipperGeoloc} />
                  <InfoField 
                    label="shipper_address" 
                    value={t.shipper_address || t.shipperAddress || t.shipperInfo?.address} 
                    fullWidth 
                  />
                </div>
              </div>

              {/* [D. INFORMASI PENERIMA (RECEIVER)] */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 text-emerald-600">
                  <MapPin className="w-4 h-4" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                    D. Informasi Penerima (Receiver)
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <InfoField label="receiver_customer_id" value={t.receiver_customer_id || t.receiverCustomerId} isMono />
                  <InfoField label="receiver_name" value={t.receiver_name || t.receiverName || t.recipientInfo?.name} />
                  <InfoField label="receiver_phone" value={t.receiver_phone || t.receiverPhone || t.recipientInfo?.phone} />
                  <InfoField label="receiver_province" value={t.receiver_province || t.receiverProvince || t.recipientInfo?.province} />
                  <InfoField label="receiver_city" value={t.receiver_city || t.receiverCity || t.recipientInfo?.city} />
                  <InfoField label="receiver_district_code" value={t.receiver_district_code || t.receiverDistrictCode || t.recipientInfo?.districtCode} />
                  <InfoField label="receiver_subdistrict" value={t.receiver_subdistrict || t.receiverSubdistrict || t.recipientInfo?.district} />
                  <InfoField label="receiver_postal_code" value={t.receiver_postal_code || t.receiverPostalCode || t.recipientInfo?.zipCode} />
                  <InfoField label="receiver_geoloc" value={t.receiver_geoloc || t.receiverGeoloc} />
                  <InfoField 
                    label="receiver_address" 
                    value={t.receiver_address || t.receiverAddress || t.recipientInfo?.address} 
                    fullWidth 
                  />
                </div>
              </div>

              {/* [E. PEMBAYARAN & TARIF] */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 text-amber-600">
                  <CreditCard className="w-4 h-4" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                    E. Pembayaran & Tarif
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <InfoField label="base_price" value={formatPrice(t.base_price ?? t.basePrice)} />
                  <InfoField label="weight" value={getVal(t.weight ?? t.parcel_total_weight ?? t.parcelTotalWeight ? `${t.weight ?? t.parcel_total_weight ?? t.parcelTotalWeight} kg` : "-")} />
                  <InfoField label="promo_amount" value={formatPrice(t.promo_amount ?? t.promoAmount)} />
                  <InfoField label="total_price" value={formatPrice(t.total_price ?? t.totalPrice ?? t.delivery_price ?? t.total_delivery_price)} />
                  <InfoField label="commision" value={formatPrice(t.commision ?? t.commission)} />
                  <InfoField label="promo_code" value={t.promo_code || t.promoCode} />
                  <InfoField label="payment_status" value={t.payment_status || t.paymentStatus} />
                  <InfoField label="Payment Name" value={t["Payment Name"] || t.payment_name || t.paymentName} />
                  <InfoField label="ba_transaction_no" value={t.ba_transaction_no || t.baTransactionNo} isMono />
                </div>
              </div>

              {/* [F. INFORMASI BARANG / PAKET] */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-orange-600">
                    <Package className="w-4 h-4" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                      F. Informasi Barang / Paket
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                    {parsedItems.length} Item
                  </span>
                </div>

                {/* Raw good_description string if available */}
                <div className="mb-3">
                  <InfoField 
                    label="good_description (raw)" 
                    value={typeof t.good_description === "string" ? t.good_description : (t.good_description ? JSON.stringify(t.good_description) : "-")} 
                    fullWidth 
                  />
                </div>

                {/* Render each item detail */}
                <div className="space-y-3">
                  {parsedItems.map((item: any, idx: number) => {
                    const itemName = item.item_name || item.itemName || item.name || "-";
                    const itemDesc = item.item_desc || item.itemDesc || item.desc || "-";
                    const itemCategory = item.item_category || item.itemCategory || item.category || "-";
                    const declaredVal = item.declared_value ?? item.declaredValue ?? item.item_value ?? 0;
                    const weightVal = item.weight ? `${item.weight} kg` : "-";
                    const widthVal = item.width ? `${item.width} cm` : "-";
                    const heightVal = item.height ? `${item.height} cm` : "-";
                    const lengthVal = item.length ? `${item.length} cm` : "-";
                    const fragileVal = item.fragile === true ? "Ya (Fragile)" : (item.fragile === false ? "Tidak" : "-");

                    return (
                      <div 
                        key={idx} 
                        className="p-3.5 bg-orange-50/40 rounded-xl border border-orange-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-orange-700">
                            Item #{idx + 1}: {itemName}
                          </span>
                          {item.fragile && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">
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

            </div>

            {/* Modal Sticky Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)]">
              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3">
                <span className="text-xs text-gray-500">Total Tarif:</span>
                <span className="text-lg font-bold text-pink-600">
                  {deliveryPrice > 0 ? formatPrice(deliveryPrice) : "-"}
                </span>
              </div>

              <div className="w-full sm:w-auto flex items-center gap-2.5">
                {isUnpaid ? (
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

