"use client";

import React, { forwardRef } from "react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";

interface AWBLabelProps {
  awb: string;
  serviceType: string; // e.g. "REG", "SD", "ND"
  shipperName: string;
  shipperPhone?: string;
  recipientName: string;
  recipientPhone?: string;
  recipientAddress: string;
  weight: number;
  routingCode?: string; // e.g. "33.10"
  printDate?: string;
}

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 4) return phone;
  const first = phone.slice(0, 1);
  const last = phone.slice(-1);
  return `${first}${"*".repeat(phone.length - 2)}${last}`;
};

const maskName = (name: string) => {
  if (!name || name.length < 3) return name;
  const parts = name.split(" ");
  if (parts.length === 1) {
    const n = parts[0];
    return `${n[0]}${"*".repeat(n.length - 2)}${n[n.length - 1]}`;
  }
  return parts.map(p => {
    if (p.length < 3) return p;
    return `${p[0]}${"*".repeat(p.length - 2)}${p[p.length - 1]}`;
  }).join(" ");
};

const AWBLabel = forwardRef<HTMLDivElement, AWBLabelProps>(
  ({ awb, serviceType, shipperName, shipperPhone, recipientName, recipientPhone, recipientAddress, weight, routingCode, printDate }, ref) => {
    const dateStr = printDate || new Date().toLocaleString("id-ID", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    }).replace(/\./g, ":");

    return (
      <div 
        ref={ref} 
        className="bg-white font-sans w-[100mm] min-h-[150mm] border border-gray-300 p-2 text-[11px] flex flex-col mx-auto print:border-none print:w-[100mm] print:h-auto print:m-0"
        style={{ width: "100mm", color: "#3B2C2F" }}
      >
        {/* 1. Header */}
        <div className="flex justify-between items-start border-b-[3px] pb-2 mb-2" style={{ borderColor: "#841945" }}>
          <div className="flex flex-col">
            <img src="/logo-anteraja.png" alt="Anteraja Logo" className="h-6 object-contain" />
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 font-bold text-sm" style={{ color: "#ED0677" }}>
              <span className="material-symbols-outlined text-[15px]">call</span>
              021-5066 3333
            </div>
          </div>
        </div>

        {/* Sub Header info */}
        <div className="flex justify-between items-center text-[10px] font-bold mb-2">
          <div>1D267043521121</div>
          <div className="text-center">ShipE</div>
          <div>{dateStr}</div>
        </div>

        {/* 2. Area Barcode & 3. Jenis Layanan */}
        <div className="flex justify-between items-start border-b-[3px] pb-2 mb-2" style={{ borderColor: "#3B2C2F" }}>
          <div className="flex-1 flex flex-col items-center overflow-hidden pr-2">
            <Barcode 
              value={awb} 
              width={1.8} 
              height={50} 
              fontSize={14} 
              margin={0} 
              displayValue={true}
              lineColor="#3B2C2F"
            />
          </div>
          <div className="w-16 flex items-center justify-center border-l-[3px] pl-2 h-[60px]" style={{ borderColor: "#3B2C2F" }}>
            <span className="text-3xl font-black">{serviceType}</span>
          </div>
        </div>

        {/* 4. Routing / Kode Jalur */}
        <div className="border-b-[3px] pb-2 mb-2 text-center" style={{ borderColor: "#3B2C2F" }}>
          <span className="text-4xl font-black tracking-tight">{routingCode || "33.10"}</span>
        </div>

        {/* 5. Informasi Penerima */}
        <div className="border-b-[3px] pb-2 mb-2 flex-1 min-h-[80px]" style={{ borderColor: "#3B2C2F" }}>
          <div className="font-black text-sm mb-1">PENERIMA:</div>
          <div className="font-bold text-[13px]">
            {maskName(recipientName)}
            {recipientPhone && <span className="ml-2 font-normal">{maskPhone(recipientPhone)}</span>}
          </div>
          <div className="mt-1 leading-snug">
            {recipientAddress}
          </div>
        </div>

        {/* 6. Area Kosong & 7. QR Code */}
        <div className="border-b-[3px] pb-2 mb-2 flex justify-between h-24" style={{ borderColor: "#3B2C2F" }}>
          <div className="flex-1 border-r-[3px] pr-2" style={{ borderColor: "#3B2C2F" }}>
            {/* Area Kosong */}
          </div>
          <div className="w-24 pl-2 flex items-center justify-center">
            <QRCodeSVG value={awb} size={80} level="M" fgColor="#3B2C2F" />
          </div>
        </div>

        {/* 8. Informasi Pengirim & 9. Berat */}
        <div className="flex justify-between items-end">
          <div>
            <div className="font-black mb-1">PENGIRIM:</div>
            <div className="font-bold">{maskName(shipperName)}</div>
            {shipperPhone && <div>{maskPhone(shipperPhone)}</div>}
            
            <div className="mt-2 font-bold text-sm">
              Berat Sebenarnya: {weight > 0 ? (weight / 1000).toFixed(1) : "0.9"} kg
            </div>
          </div>
        </div>
      </div>
    );
  }
);

AWBLabel.displayName = "AWBLabel";

export default AWBLabel;
