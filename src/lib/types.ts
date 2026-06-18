export interface ContactInfo {
  name: string;
  phone: string;
  address: string;
  district: string;
  postalCode: string;
}

export interface PackageInfo {
  itemName: string;
  category: string;
  weight: number; // in kg
  dimensions: {
    length: number; // in cm
    width: number;  // in cm
    height: number; // in cm
  };
  value: number; // item value in IDR
}

export interface ServiceInfo {
  product_code: string;
  product_name: string;
  duration: string;
  delivery_price: number;
  pickup_start?: string | null;
  pickup_end?: string | null;
  status: string;
}

export interface CreateOrderPayload {
  sender: ContactInfo;
  recipient: ContactInfo;
  package: PackageInfo;
  selectedService: ServiceInfo;
}
