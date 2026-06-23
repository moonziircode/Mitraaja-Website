import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentUrl: string | null;
  onRefreshStatus: () => void;
  isRefreshing: boolean;
}

export default function PaymentModal({ isOpen, onClose, paymentUrl, onRefreshStatus, isRefreshing }: PaymentModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white w-full max-w-4xl h-[90vh] sm:h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
        >
          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Selesaikan Pembayaran</h2>
              <p className="text-xs text-gray-500 mt-0.5">Segera bayar agar pesanan dapat diproses</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onRefreshStatus}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh Status</span>
              </button>
              <button 
                onClick={onClose}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 bg-gray-50 relative">
            {paymentUrl ? (
              <iframe 
                src={paymentUrl} 
                className="w-full h-full border-none absolute inset-0"
                allow="payment"
                title="Payment Gateway"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 font-medium">
                Memuat halaman pembayaran...
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
