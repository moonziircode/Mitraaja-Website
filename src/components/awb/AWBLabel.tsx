"use client";

import React, { forwardRef } from "react";
import AwbLabelTemplate, { LabelData } from "@/components/AwbLabelTemplate";

export interface AWBLabelProps {
  awb: string;
  serviceType: string; // e.g. "REG", "SD", "ND"
  shipperName: string;
  shipperPhone?: string;
  shipperAddress?: string;
  shipperCity?: string;
  shipperZip?: string;
  recipientName: string;
  recipientPhone?: string;
  recipientAddress: string;
  recipientCity?: string;
  recipientZip?: string;
  weight: number;
  routingCode?: string; // e.g. "33.10" or "0001"
  bookingId?: string;
  sourceOrderNo?: string;
  orderSource?: string;
  invoice?: string;
  itemName?: string;
  itemQty?: number;
  codAmount?: number;
  notes?: string;
  printDate?: string;
  paperSize?: '100x150' | '80x100' | '80mm';
}

const AWBLabel = forwardRef<HTMLDivElement, AWBLabelProps>((props, ref) => {
  const {
    awb,
    serviceType,
    shipperName,
    shipperPhone,
    shipperAddress,
    shipperCity,
    shipperZip,
    recipientName,
    recipientPhone,
    recipientAddress,
    recipientCity,
    recipientZip,
    weight,
    routingCode = "0001",
    bookingId,
    sourceOrderNo,
    orderSource,
    invoice,
    itemName,
    itemQty,
    codAmount,
    notes,
    printDate,
    paperSize = "100x150",
  } = props;

  const labelData: LabelData = {
    awb,
    serviceCode: serviceType || "REG",
    sourceOrderNo: sourceOrderNo || bookingId,
    orderSource: orderSource || "Mitraaja",
    invoice,
    bookingId,
    shippedDate: printDate,
    weight: weight > 0 ? weight : 1,
    codAmount,
    routingCode,
    notes,
    shipper: {
      name: shipperName || "PENGIRIM",
      address: shipperAddress || "-",
      phone: shipperPhone,
      city: shipperCity || "-",
      zip: shipperZip,
    },
    receiver: {
      name: recipientName || "PENERIMA",
      address: recipientAddress || "-",
      phone: recipientPhone,
      city: recipientCity || "-",
      zip: recipientZip,
    },
    items: [
      {
        item_name: itemName || "Barang Kiriman",
        qty: itemQty || 1,
      },
    ],
  };

  return <AwbLabelTemplate ref={ref} data={labelData} paperSize={paperSize} />;
});

AWBLabel.displayName = "AWBLabel";

export default AWBLabel;

