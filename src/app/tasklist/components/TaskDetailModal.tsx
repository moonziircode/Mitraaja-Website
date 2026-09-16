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
  Box, 
  FileText, 
  CreditCard, 
  Loader2, 
  Trash2, 
  Copy, 
  Check, 
  Tag, 
  Layers, 
  AlertCircle,
  ArrowRight,
  ShieldCheck
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

export default function TaskDetailModal({ 
  isOpen, 
  onClose, 
  tasklist, 
  activeTab,
  onActionSuccess 
}: TaskDetailModalProps) {
  const [liveData, setLiveData] = useState<any>(null);
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

  const taskCode = firstTask.task_code || firstTask.taskCode || firstTask.booking_id || firstTask.bookingId || "";
  const waybillNo = firstTask.waybill_no || firstTask.waybillNo || firstTask.waybill || "";
  const displayCode = isTertunda 
    ? (waybillNo || taskCode || "-") 
    : (taskCode || waybillNo || "-");

  // Fetch detailed data whenever modal opens
  useEffect(() => {
    if (isOpen && tasklist) {
      setIsLoadingDetail(true);
      setOrderDetail(null);
      setLiveData(null);

      const targetCode = taskCode || displayCode;

      // 1. Fetch order details from /api/orders/[id]/detail
      if (targetCode && targetCode !== "-") {
        axios.get(`/api/orders/${encodeURIComponent(targetCode)}/detail`)
          .then(res => {
            if (res.data?.success && res.data?.data) {
              setOrderDetail(res.data.data);
            }
          })
          .catch(() => {
            // Ignore if endpoint fails, fallback to tasklist payload
          })
          .finally(() => {
            setIsLoadingDetail(false);
          });
      } else {
        setIsLoadingDetail(false);
      }

      // 2. Fetch live tracking if AWB exists or in TERTUNDA
      const trackCode = waybillNo || (isTertunda ? displayCode : "");
      if (trackCode && trackCode !== "-") {
        axios.post('/api/track', { awb: trackCode })
          .then(res => {
            if (res.data) setLiveData(res.data);
          })
          .catch(() => {});
      }
    } else {
      setOrderDetail(null);
      setLiveData(null);
      setCopiedCode(false);
    }
  }, [isOpen, tasklist, taskCode, waybillNo, displayCode, isTertunda]);

  if (!tasklist) return null;

  // Helper to format full address
  const formatFullAddress = (info: any, fallbackStr?: string) => {
    if (!info) return fallbackStr && fallbackStr !== "-" ? fallbackStr : "-";
    const parts: string[] = [];
    if (info.address && info.address !== "-") parts.push(info.address);
    const district = info.district_name || info.districtName || info.district;
    if (district && district !== "-") parts.push(`Kec. ${district}`);
    const city = info.city_name || info.cityName || info.city;
    if (city && city !== "-") parts.push(city);
    const prov = info.provice_name || info.province_name || info.provinceName || info.province;
    if (prov && prov !== "-") parts.push(prov);
    const zip = info.postcode || info.zip || info.zipCode;
    if (zip && zip !== "-") parts.push(zip);

    if (parts.length > 0) return parts.join(", ");
    return fallbackStr && fallbackStr !== "-" ? fallbackStr : "-";
  };

  // Resolve Shipper / Sender
  const shipper = orderDetail?.shipper_info || orderDetail?.shipperInfo || firstTask.shipper_info || firstTask.shipperInfo || {};
  const senderName = shipper.name || liveData?.sender || tasklist.owner_name || "-";
  const senderPhone = shipper.phone || tasklist.owner_phone || "-";
  const senderAddress = formatFullAddress(shipper, shipper.address);

  // Resolve Receiver / Recipient
  const receiver = orderDetail?.receiver_info || orderDetail?.receiverInfo || firstTask.receiver_info || firstTask.receiverInfo || firstTask.recipient_info || firstTask.recipientInfo || {};
  const recipientName = receiver.name || liveData?.receiver || "-";
  const recipientPhone = receiver.phone || "-";
  const recipientAddress = formatFullAddress(receiver, liveData?.destination || receiver.address);

  // Package & Items
  const itemsList: any[] = (orderDetail?.items && orderDetail.items.length > 0) 
    ? orderDetail.items 
    : (firstTask.items && firstTask.items.length > 0 ? firstTask.items : []);

  const totalWeight = orderDetail?.parcel_total_weight || firstTask.parcel_total_weight || firstTask.parcelTotalWeight || tasklist.tasks?.reduce((acc, t: any) => acc + (t.parcel_total_weight || t.parcelTotalWeight || 0), 0) || 1.0;
  
  const serviceCode = orderDetail?.product_code || firstTask.product_code || firstTask.productCode || liveData?.service || "REG";
  const serviceName = orderDetail?.product_name || firstTask.product_name || (serviceCode === "SD" ? "Same Day" : serviceCode === "ND" ? "Next Day" : "Anteraja Regular");
  
  const deliveryPrice = Number(orderDetail?.delivery_price || firstTask.total_delivery_price || firstTask.totalDeliveryPrice || firstTask.deliveryPrice || firstTask.delivery_price || 0);
  
  const rawPaymentStatus = orderDetail?.payment_status || firstTask.payment_status || firstTask.paymentStatus || (isTertunda ? "PAID" : "NOT_PAID");
  const isUnpaid = rawPaymentStatus === "NOT_PAID" || (!isTertunda && rawPaymentStatus !== "PAID");
  const paymentStatusLabel = isUnpaid ? "Belum Dibayar" : "Sudah Dibayar";

  const createdAt = new Date(firstTask.createdAt || firstTask.created_at || Date.now());
  const dateStr = createdAt.toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = createdAt.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
  
  const rawOperationalStatus = liveData?.history?.[0]?.status || orderDetail?.task_status || firstTask.task_status || firstTask.taskStatus || (isTertunda ? "MENUNGGU PICKUP" : "MENUNGGU PEMBAYARAN");

  const handleCopyCode = (text: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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
        shipperPhone: senderPhone !== "-" ? senderPhone : (tasklist.owner_phone || "081234567890"),
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
        alert("Pembayaran berhasil dikonfirmasi! AWB telah terbit dan pesanan dipindahkan ke menu Tertunda.");
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
            className="fixed bottom-0 left-0 right-0 max-h-[92vh] bg-white rounded-t-3xl z-50 overflow-hidden flex flex-col shadow-2xl max-w-3xl mx-auto border border-gray-100"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-pink-50 rounded-xl text-pink-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    Detail {isTertunda ? "Pengiriman" : "Booking"}
                    {isLoadingDetail && <Loader2 className="w-4 h-4 animate-spin text-pink-500" />}
                  </h2>
                  <p className="text-xs text-gray-500">Informasi lengkap pesanan yang diinput</p>
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
              {/* Header Box: Booking Code & Service */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50/40 rounded-2xl p-5 border border-pink-100/80 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-pink-600 uppercase tracking-wider">
                    {isTertunda ? "Nomor AWB (Resi)" : "Kode Booking (Task Code)"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 bg-white rounded-lg text-xs font-bold text-pink-600 shadow-xs border border-pink-100">
                      {serviceCode}
                    </span>
                    <span className="px-2.5 py-1 bg-pink-100/70 rounded-lg text-xs font-medium text-pink-800">
                      {serviceName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl sm:text-3xl font-mono font-extrabold text-gray-900 tracking-tight">
                    {displayCode}
                  </span>
                  <button
                    onClick={() => handleCopyCode(displayCode)}
                    className="p-1.5 rounded-lg bg-white hover:bg-pink-100 text-gray-500 hover:text-pink-600 transition-colors shadow-2xs border border-pink-100"
                    title="Salin Kode"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {waybillNo && waybillNo !== displayCode && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-3 bg-white/70 px-3 py-1.5 rounded-lg border border-pink-100 w-fit">
                    <span className="font-semibold text-gray-500">No. AWB:</span>
                    <span className="font-mono font-bold text-gray-800">{waybillNo}</span>
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 bg-white/80 p-3 rounded-xl border border-pink-100/60">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-pink-500" />
                    <span>{dateStr} {timeStr}</span>
                  </div>
                  <div className="w-px h-3.5 bg-pink-200 hidden sm:block"></div>
                  <div className="flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-pink-500" />
                    <span>Sumber: <strong className="text-gray-900">{tasklist.order_source || "Dropoff"}</strong></span>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  Status Pesanan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Status Operasional</span>
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      {String(rawOperationalStatus).replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Status Pembayaran</span>
                    <span className={`inline-flex items-center gap-1.5 font-bold text-sm sm:text-base ${isUnpaid ? "text-amber-600" : "text-emerald-600"}`}>
                      {isUnpaid ? (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          Menunggu Pembayaran
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          Lunas (Sudah Dibayar)
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sender & Recipient Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  Pihak Pengirim & Penerima
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sender Card */}
                  <div className="p-4 bg-pink-50/40 rounded-2xl border border-pink-100/70 flex flex-col">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-pink-600 uppercase tracking-wider block">Pengirim</span>
                        <h4 className="font-bold text-gray-900 text-base">{senderName}</h4>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <Phone className="w-3.5 h-3.5 mr-1.5 text-pink-500 shrink-0" />
                      <a href={`tel:${senderPhone}`} className="hover:underline font-medium">
                        {senderPhone}
                      </a>
                    </div>
                    <div className="mt-auto bg-white/90 p-3 rounded-xl border border-pink-100/50 text-xs sm:text-sm text-gray-700 leading-relaxed">
                      <span className="text-[11px] font-semibold text-gray-400 block mb-0.5">Alamat Pengirim:</span>
                      {senderAddress}
                    </div>
                  </div>

                  {/* Recipient Card */}
                  <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100/70 flex flex-col">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">Penerima</span>
                        <h4 className="font-bold text-gray-900 text-base">{recipientName}</h4>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <Phone className="w-3.5 h-3.5 mr-1.5 text-blue-500 shrink-0" />
                      <a href={`tel:${recipientPhone}`} className="hover:underline font-medium">
                        {recipientPhone}
                      </a>
                    </div>
                    <div className="mt-auto bg-white/90 p-3 rounded-xl border border-blue-100/50 text-xs sm:text-sm text-gray-700 leading-relaxed">
                      <span className="text-[11px] font-semibold text-gray-400 block mb-0.5">Alamat Penerima:</span>
                      {recipientAddress}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                  <Box className="w-4 h-4 text-gray-400" />
                  Rincian Barang yang Diinput
                </h3>

                {itemsList.length > 0 ? (
                  <div className="space-y-3">
                    {itemsList.map((item: any, idx: number) => {
                      const itemName = item.item_name || item.itemName || item.item_desc || item.itemDesc || "Barang Pengiriman";
                      const itemCategory = item.item_category || item.itemCategory || "Umum";
                      const itemValue = item.declared_value ?? item.declaredValue ?? 0;
                      const itemWeight = item.weight ? Number(item.weight) : null;
                      const dimensions = (item.length && item.width && item.height) 
                        ? `${item.length} x ${item.width} x ${item.height} cm` 
                        : null;

                      return (
                        <div 
                          key={idx} 
                          className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-white rounded-xl border border-gray-200 text-gray-600 mt-0.5 shrink-0">
                              <Tag className="w-4 h-4 text-pink-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-bold text-gray-900 text-sm sm:text-base">{itemName}</h5>
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-200/80 text-gray-700">
                                  {itemCategory}
                                </span>
                                {item.fragile && (
                                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-100 text-red-600 border border-red-200">
                                    Fragile
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                                {itemWeight && <span>Berat: <strong>{itemWeight.toFixed(2)} kg</strong></span>}
                                {dimensions && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span>Dimensi: <strong>{dimensions}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {itemValue > 0 && (
                            <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200">
                              <span className="text-[11px] text-gray-400 block">Nilai Barang</span>
                              <span className="text-sm font-semibold text-gray-800">
                                Rp {Number(itemValue).toLocaleString("id-ID")}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-600">
                    <div className="font-medium text-gray-800 mb-1">
                      {firstTask.itemName || firstTask.item_name || "Paket Pengiriman Reguler"}
                    </div>
                    <div className="text-xs text-gray-500">
                      Item terdaftar pada order ini dengan estimasi berat {Number(totalWeight).toFixed(2)} kg.
                    </div>
                  </div>
                )}
              </div>

              {/* Package Summary & Price */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  Rincian Biaya & Dimensi
                </h3>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center text-sm pb-2.5 border-b border-gray-200">
                    <span className="text-gray-600">Total Berat Paket</span>
                    <span className="font-semibold text-gray-900">{Number(totalWeight).toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pb-2.5 border-b border-gray-200">
                    <span className="text-gray-600">Jumlah Koli</span>
                    <span className="font-semibold text-gray-900">{tasklist.tasks?.length || 1} koli</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pb-2.5 border-b border-gray-200">
                    <span className="text-gray-600">Layanan Ekspedisi</span>
                    <span className="font-semibold text-gray-900">{serviceName} ({serviceCode})</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-gray-700 font-semibold text-sm">Total Ongkir / Biaya</span>
                    <span className="font-bold text-pink-600 text-xl">
                      Rp {deliveryPrice.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Tracking Timeline (if available) */}
              {liveData?.history && liveData.history.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Riwayat Pelacakan AWB
                  </h3>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-4">
                    {liveData.history.map((h: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 relative">
                        {i !== liveData.history.length - 1 && (
                          <div className="absolute left-2 top-5 bottom-0 w-0.5 bg-gray-200"></div>
                        )}
                        <div className={`w-4 h-4 rounded-full mt-0.5 shrink-0 z-10 ${i === 0 ? "bg-pink-600 ring-4 ring-pink-100" : "bg-gray-300"}`} />
                        <div className="flex-1 text-xs">
                          <div className="font-semibold text-gray-800">{h.status || h.message}</div>
                          <div className="text-gray-400 mt-0.5">{h.timestamp || h.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Sticky Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)]">
              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3">
                <span className="text-xs text-gray-500">Total Tagihan:</span>
                <span className="text-lg font-bold text-pink-600">
                  Rp {deliveryPrice.toLocaleString("id-ID")}
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
