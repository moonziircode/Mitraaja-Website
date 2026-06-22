export interface SenderRecipient {
  name?: string;
  phone?: string;
  address?: string;
  district?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  districtCode?: string;
}

export interface MaaPayment {
  paymentStatus?: string;
  paymentMethod?: string;
  amount?: number;
  promoCode?: string;
  discount?: number;
}

export interface MaaDropoffItem {
  id?: string;
  itemDesc?: string;
  weight?: number;
  qty?: number;
}

export interface MaaTask {
  taskCode?: string;
  sourceOrderNo?: string;
  invoiceNo?: string;
  sysSource?: string;
  orderSource?: string;
  clientCode?: string;
  clientName?: string;
  waybillNo?: string;
  productCode?: string;
  deliveryPrice?: number;
  parcelTotalWeight?: number;
  note?: string;
  remarkCode?: number;
  remarkMessage?: string;
  taskType?: string;
  paymentStatus?: string;
  taskStatus?: string;
  agentId?: string;
  agentStaffId?: string;
  shipperInfo?: SenderRecipient;
  recipientInfo?: SenderRecipient;
  items?: MaaDropoffItem[];
  createdAt?: string;
  updatedAt?: string;
  useInsurance?: boolean;
  insuranceItemCategory?: string;
  itemValue?: number;
  insurancePrice?: number;
  packing?: string;
  packingPrice?: number;
  flightNumber?: string;
  payment?: MaaPayment;
}

export interface MaaTaskList {
  client?: string;
  client_name?: string;
  group?: string;
  order_source?: string;
  owner_name?: string;
  owner_phone?: string;
  tasks: MaaTask[];
}

export interface TasklistResponseBody {
  status?: number;
  message?: string;
  info?: string;
  content?: MaaTaskList[];
}

export interface TasklistResponseV2 {
  status?: number;
  message?: string;
  data?: {
    content: MaaTaskList[];
  };
}
