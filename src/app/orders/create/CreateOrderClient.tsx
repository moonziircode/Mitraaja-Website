'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { ContactInfo, PackageInfo, ServiceInfo } from '@/lib/types';

interface User {
  name: string;
  nia: string;
  districtCode?: string;
  postalCode?: string;
  districtName?: string;
}

const FILL = { fontVariationSettings: "'FILL' 1" } as const;

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
  district: string;
  districtCode: string;
  postalCode: string;
  label?: string;
}

// ── SearchableSelect Component ──
function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Pilih...'
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery(value || '');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-150 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-gray-50">
          {filtered.map((opt, idx) => (
            <li
              key={idx}
              className="px-3 py-2 hover:bg-gray-50 text-[11px] font-semibold text-gray-700 cursor-pointer transition-colors"
              onMouseDown={() => {
                onChange(opt);
                setQuery(opt);
                setOpen(false);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── SearchableSelectObject Component ──
function SearchableSelectObject({
  label,
  value,
  onChange,
  options,
  placeholder = 'Pilih...'
}: {
  label: string;
  value: any;
  onChange: (opt: any) => void;
  options: { name: string; code: string; [key: string]: any }[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value ? value.name : '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery(value ? value.name : '');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const filtered = options.filter(opt =>
    opt.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-150 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-gray-50">
          {filtered.map((opt, idx) => (
            <li
              key={idx}
              className="px-3 py-2 hover:bg-gray-50 text-[11px] font-semibold text-gray-700 cursor-pointer transition-colors"
              onMouseDown={() => {
                onChange(opt);
                setQuery(opt.name);
                setOpen(false);
              }}
            >
              {opt.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CreateOrderClient({ user }: { user: User }) {
  const router = useRouter();

  // ── Wizard Steps ──
  const [step, setStep] = useState(1);

  // ── Cascading Region States ──
  const [provincesList, setProvincesList] = useState<{name: string, code: string}[]>([]);
  
  // Sender dropdown lists
  const [senderProvince, setSenderProvince] = useState<any>(null);
  const [senderCity, setSenderCity] = useState<any>(null);
  const [senderKecamatan, setSenderKecamatan] = useState<any>(null);
  const [senderKelurahan, setSenderKelurahan] = useState<any>(null);
  
  const [senderCitiesList, setSenderCitiesList] = useState<any[]>([]);
  const [senderKecamatansList, setSenderKecamatansList] = useState<{name: string, code: string}[]>([]);
  const [senderKelurahansList, setSenderKelurahansList] = useState<{name: string, code: string}[]>([]);

  // Recipient dropdown lists
  const [recipientProvince, setRecipientProvince] = useState<any>(null);
  const [recipientCity, setRecipientCity] = useState<any>(null);
  const [recipientKecamatan, setRecipientKecamatan] = useState<any>(null);
  const [recipientKelurahan, setRecipientKelurahan] = useState<any>(null);

  const [recipientCitiesList, setRecipientCitiesList] = useState<any[]>([]);
  const [recipientKecamatansList, setRecipientKecamatansList] = useState<{name: string, code: string}[]>([]);
  const [recipientKelurahansList, setRecipientKelurahansList] = useState<{name: string, code: string}[]>([]);

  // ── Step 1 State: Sender & Recipient ──
  const [sender, setSender] = useState<ContactInfo>({
    name: '',
    phone: '',
    address: '',
    district: user.districtName || '',
    postalCode: user.postalCode || '',
    districtCode: user.districtCode || ''
  });

  const [recipient, setRecipient] = useState<ContactInfo>({
    name: '',
    phone: '',
    address: '',
    district: '',
    postalCode: '',
    districtCode: ''
  });

  // Checkbox states for saving to address book
  const [saveSenderAddress, setSaveSenderAddress] = useState(false);
  const [saveRecipientAddress, setSaveRecipientAddress] = useState(false);

  // Address Book state
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [addressBookTarget, setAddressBookTarget] = useState<'sender' | 'recipient' | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  // Autocomplete states
  const [senderQuery, setSenderQuery] = useState('');
  const [senderSuggestions, setSenderSuggestions] = useState<any[]>([]);
  const [senderLoading, setSenderLoading] = useState(false);
  const [senderShowSuggestions, setSenderShowSuggestions] = useState(false);

  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientSuggestions, setRecipientSuggestions] = useState<any[]>([]);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [recipientShowSuggestions, setRecipientShowSuggestions] = useState(false);

  // Sync display queries when district is loaded from address book
  useEffect(() => {
    if (sender.district) {
      setSenderQuery(sender.district);
    } else {
      setSenderQuery('');
    }
  }, [sender.district]);

  useEffect(() => {
    if (recipient.district) {
      setRecipientQuery(recipient.district);
    } else {
      setRecipientQuery('');
    }
  }, [recipient.district]);

  // ── Cascading Region Loaders & Sync Handlers ──
  // Load provinces on mount
  useEffect(() => {
    fetch('/api/all-regions?type=2')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProvincesList(data.data);
        }
      })
      .catch(err => console.error('Failed to load provinces:', err));
  }, []);

  // Helper to parse "Kel. X, Kec. Y, Z, W" and sync dropdowns
  const parseAndSyncSenderDropdowns = (name: string, pCode: string) => {
    const parts = name.split(',').map(p => p.trim());
    if (parts.length >= 4) {
      const kelName = parts[0].replace(/^Kel\.\s+/i, '');
      const kecName = parts[1].replace(/^Kec\.\s+/i, '');
      const cityName = parts[2];
      const provName = parts[3];

      setSenderProvince(provName);
      setSenderCity(cityName);
      setSenderKecamatan(kecName);
      setSenderKelurahan(kelName);
    }
  };

  const parseAndSyncRecipientDropdowns = (name: string, pCode: string) => {
    const parts = name.split(',').map(p => p.trim());
    if (parts.length >= 4) {
      const kelName = parts[0].replace(/^Kel\.\s+/i, '');
      const kecName = parts[1].replace(/^Kec\.\s+/i, '');
      const cityName = parts[2];
      const provName = parts[3];

      setRecipientProvince(provName);
      setRecipientCity(cityName);
      setRecipientKecamatan(kecName);
      setRecipientKelurahan(kelName);
    }
  };

  // Sender city loader
  useEffect(() => {
    if (!senderProvince) {
      setSenderCitiesList([]);
      setSenderCity(null);
      setSenderKecamatan(null);
      setSenderKelurahan(null);
      return;
    }
    fetch(`/api/all-regions?parent=${senderProvince.code}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSenderCitiesList(data.data);
        }
      })
      .catch(err => console.error('Failed to load sender cities:', err));
  }, [senderProvince]);

  // Sender kecamatan loader
  useEffect(() => {
    if (!senderCity) {
      setSenderKecamatansList([]);
      setSenderKecamatan(null);
      setSenderKelurahan(null);
      return;
    }
    fetch(`/api/all-regions?parent=${senderCity.code}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSenderKecamatansList(data.data);
        }
      })
      .catch(err => console.error('Failed to load sender kecamatans:', err));
  }, [senderCity]);

  // Sender kelurahan loader
  useEffect(() => {
    if (!senderKecamatan) {
      setSenderKelurahansList([]);
      setSenderKelurahan(null);
      return;
    }
    fetch(`/api/all-regions?parent=${senderKecamatan.code}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSenderKelurahansList(data.data);
        }
      })
      .catch(err => console.error('Failed to load sender kelurahans:', err));
  }, [senderKecamatan]);

  // Recipient city loader
  useEffect(() => {
    if (!recipientProvince) {
      setRecipientCitiesList([]);
      setRecipientCity(null);
      setRecipientKecamatan(null);
      setRecipientKelurahan(null);
      return;
    }
    fetch(`/api/all-regions?parent=${recipientProvince.code}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRecipientCitiesList(data.data);
        }
      })
      .catch(err => console.error('Failed to load recipient cities:', err));
  }, [recipientProvince]);

  // Recipient kecamatan loader
  useEffect(() => {
    if (!recipientCity) {
      setRecipientKecamatansList([]);
      setRecipientKecamatan(null);
      setRecipientKelurahan(null);
      return;
    }
    fetch(`/api/all-regions?parent=${recipientCity.code}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRecipientKecamatansList(data.data);
        }
      })
      .catch(err => console.error('Failed to load recipient kecamatans:', err));
  }, [recipientCity]);

  // Recipient kelurahan loader
  useEffect(() => {
    if (!recipientKecamatan) {
      setRecipientKelurahansList([]);
      setRecipientKelurahan(null);
      return;
    }
    fetch(`/api/all-regions?parent=${recipientKecamatan.code}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRecipientKelurahansList(data.data);
        }
      })
      .catch(err => console.error('Failed to load recipient kelurahans:', err));
  }, [recipientKecamatan]);

  const handleSelectSenderKelurahan = (kel: any) => {
    setSenderKelurahan(kel);
    if (kel && senderProvince && senderCity && senderKecamatan) {
      const fullDistrictName = `Kel. ${kel.name}, Kec. ${senderKecamatan.name}, ${senderCity.name}, ${senderProvince.name}`;
      setSender(prev => ({
        ...prev,
        district: fullDistrictName,
        districtCode: kel.code
      }));
      setSenderQuery(fullDistrictName);
    }
  };

  const handleSelectRecipientKelurahan = (kel: any) => {
    setRecipientKelurahan(kel);
    if (kel && recipientProvince && recipientCity && recipientKecamatan) {
      const fullDistrictName = `Kel. ${kel.name}, Kec. ${recipientKecamatan.name}, ${recipientCity.name}, ${recipientProvince.name}`;
      setRecipient(prev => ({
        ...prev,
        district: fullDistrictName,
        districtCode: kel.code
      }));
      setRecipientQuery(fullDistrictName);
    }
  };

  // Address Book actions
  const openAddressBook = (target: 'sender' | 'recipient') => {
    try {
      const stored = localStorage.getItem('mitraaja_address_book');
      const list = stored ? JSON.parse(stored) : [];
      setSavedAddresses(list);
      setAddressBookTarget(target);
      setAddressBookOpen(true);
    } catch (err) {
      console.error('Failed to load address book:', err);
    }
  };

  const selectAddress = (addr: SavedAddress) => {
    const info = {
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      district: addr.district,
      districtCode: addr.districtCode,
      postalCode: addr.postalCode
    };

    if (addressBookTarget === 'sender') {
      setSender(prev => ({
        ...prev,
        name: info.name,
        phone: info.phone,
        address: info.address
        // Do not overwrite district, districtCode, and postalCode for sender
      }));
      // parseAndSyncSenderDropdowns is removed as we don't use dropdowns for sender anymore
    } else if (addressBookTarget === 'recipient') {
      setRecipient(info);
      setRecipientQuery(addr.district);
      parseAndSyncRecipientDropdowns(addr.district, addr.postalCode);
    }

    setAddressBookOpen(false);
    setAddressBookTarget(null);
  };

  const deleteAddress = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = savedAddresses.filter(addr => addr.id !== id);
      localStorage.setItem('mitraaja_address_book', JSON.stringify(updated));
      setSavedAddresses(updated);
    } catch (err) {
      console.error('Failed to delete address:', err);
    }
  };

  const saveToAddressBook = () => {
    try {
      const stored = localStorage.getItem('mitraaja_address_book');
      const addressBook: SavedAddress[] = stored ? JSON.parse(stored) : [];
      const newBook = [...addressBook];

      if (saveSenderAddress && sender.name) {
        const isDup = addressBook.some(
          existing =>
            existing.name.toLowerCase() === sender.name.toLowerCase() &&
            existing.phone === sender.phone &&
            existing.address.toLowerCase() === sender.address.toLowerCase()
        );
        if (!isDup) {
          newBook.push({
            id: `snd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: sender.name,
            phone: sender.phone,
            address: sender.address,
            district: sender.district,
            districtCode: sender.districtCode || '',
            postalCode: sender.postalCode,
            label: `Pengirim: ${sender.name}`
          });
        }
      }

      if (saveRecipientAddress && recipient.name) {
        const isDup = addressBook.some(
          existing =>
            existing.name.toLowerCase() === recipient.name.toLowerCase() &&
            existing.phone === recipient.phone &&
            existing.address.toLowerCase() === recipient.address.toLowerCase()
        );
        if (!isDup) {
          newBook.push({
            id: `rcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: recipient.name,
            phone: recipient.phone,
            address: recipient.address,
            district: recipient.district,
            districtCode: recipient.districtCode || '',
            postalCode: recipient.postalCode,
            label: `Penerima: ${recipient.name}`
          });
        }
      }

      if (newBook.length > addressBook.length) {
        localStorage.setItem('mitraaja_address_book', JSON.stringify(newBook));
      }
      setSaveSenderAddress(false);
      setSaveRecipientAddress(false);
    } catch (err) {
      console.error('Failed to save to address book:', err);
    }
  };

  // ── Step 2 State: Package Detail ──
  const [packageInfo, setPackageInfo] = useState<PackageInfo>({
    itemName: '',
    category: '',
    weight: 0, // kg
    dimensions: {
      length: 0, // cm
      width: 0,
      height: 0
    },
    value: 0 // Rp
  });

  // ── Chargeable Weight Calculation ──
  const volumetricWeight = useMemo(() => {
    const { length, width, height } = packageInfo.dimensions;
    return Number(((length * width * height) / 6000).toFixed(2));
  }, [packageInfo.dimensions]);

  const chargeableWeight = useMemo(() => {
    return Math.max(packageInfo.weight, volumetricWeight);
  }, [packageInfo.weight, volumetricWeight]);

  // ── Step 3 State: Service Rates Selection ──
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [isRatesLoading, setIsRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  // ── Step 4 State: Payment & Confirmation ──
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
  const [paymentTrxId, setPaymentTrxId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'SUCCESS' | 'ERROR'>('PENDING');
  const [paymentProgress, setPaymentProgress] = useState(0);

  // ── Step 5 State: Final Confirmation ──
  const [createdAwb, setCreatedAwb] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderTaskCode, setOrderTaskCode] = useState<string | null>(null);

  // ── Fetch Services Rates ──
  const fetchRates = async () => {
    setIsRatesLoading(true);
    setRatesError(null);
    setSelectedService(null);

    try {
      const res = await fetch('/api/rates/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: sender.district,
          originCode: user.districtCode, // Always use agent's district code for accurate dropoff pricing
          destination: recipient.district,
          destinationCode: recipient.districtCode,
          weight: chargeableWeight
        })
      });

      const data = await res.json();
      if (data.success) {
        setServices(data.content || []);
        if (data.content && data.content.length > 0) {
          setSelectedService(data.content[0]); // Auto select first service
        }
      } else {
        setRatesError(data.info || 'Gagal menghitung tarif.');
      }
    } catch {
      setRatesError('Gagal terhubung ke server untuk kalkulasi tarif.');
    } finally {
      setIsRatesLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!sender.name.trim() || !sender.phone.trim() || !sender.address.trim() || !sender.district.trim() || !sender.postalCode.trim()) {
        alert('Mohon lengkapi seluruh data pengirim.');
        return;
      }
      if (!recipient.name.trim() || !recipient.phone.trim() || !recipient.address.trim() || !recipient.district.trim() || !recipient.postalCode.trim()) {
        alert('Mohon lengkapi seluruh data penerima.');
        return;
      }

      // Validate postal codes (must be exactly 5 digits)
      const postCodeRegex = /^\d{5}$/;
      if (!postCodeRegex.test(sender.postalCode.trim())) {
        alert('Kode pos pengirim harus berupa 5 digit angka (contoh: 40233).');
        return;
      }
      if (!postCodeRegex.test(recipient.postalCode.trim())) {
        alert('Kode pos penerima harus berupa 5 digit angka (contoh: 13740).');
        return;
      }


      // Validate phone numbers (must be numeric and between 9 to 14 digits)
      const phoneRegex = /^\d{9,14}$/;
      if (!phoneRegex.test(sender.phone.trim())) {
        alert('Nomor telepon pengirim harus berupa angka antara 9 hingga 14 digit.');
        return;
      }
      if (!phoneRegex.test(recipient.phone.trim())) {
        alert('Nomor telepon penerima harus berupa angka antara 9 hingga 14 digit.');
        return;
      }

      saveToAddressBook();
    }
    if (step === 2) {
      if (!packageInfo.itemName.trim() || !packageInfo.category || packageInfo.weight <= 0 ||
          packageInfo.dimensions.length <= 0 || packageInfo.dimensions.width <= 0 || packageInfo.dimensions.height <= 0) {
        alert('Mohon lengkapi seluruh detail paket (berat & dimensi harus lebih dari 0).');
        return;
      }
    }
    setStep(step + 1);
  };

  // Trigger rates fetch when transitioning to Step 3
  useEffect(() => {
    if (step === 3) {
      fetchRates();
    }
  }, [step]);

  // Ref to hold the polling interval
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // ── Polling Payment Status ──
  const startPollingPayment = (taskCode: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    let progress = 0;
    const interval = setInterval(async () => {
      progress = Math.min(progress + 5, 95);
      setPaymentProgress(progress);

      try {
        const res = await fetch(`/api/payment/status/${taskCode}`);
        const data = await res.json();

        if (data.status === 'SUCCESS') {
          clearInterval(interval);
          setPaymentProgress(100);
          setPaymentStatus('SUCCESS');
          setCreatedAwb(data.awb || taskCode);

          setTimeout(() => {
            setPaymentModalOpen(false);
            setStep(5);
          }, 1500);
        } else if (data.status === 'ERROR') {
          clearInterval(interval);
          setPaymentStatus('ERROR');
          setOrderError(data.message || 'Pembayaran gagal.');
          setTimeout(() => {
            setPaymentModalOpen(false);
            setStep(5);
          }, 1500);
        }
      } catch (err) {
        console.error('Polling status error:', err);
      }
    }, 3000);

    pollingIntervalRef.current = interval;
  };

  // ── Initiate GoPay QR Payment ──
  const handleInitiatePayment = async (taskCode: string, deliveryPrice: number) => {
    setPaymentTrxId(taskCode);
    setPaymentQrUrl(null);
    setPaymentStatus('PENDING');
    setPaymentProgress(0);
    setPaymentModalOpen(true);

    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskCode,
          deliveryPrice,
          shipperPhone: sender.phone
        })
      });

      const data = await res.json();
      if (data.success && data.paymentUrl) {
        setPaymentQrUrl(data.paymentUrl);
        startPollingPayment(taskCode);
      } else {
        setPaymentStatus('ERROR');
        setOrderError(data.message || 'Gagal memulai pembayaran.');
        setTimeout(() => {
          setPaymentModalOpen(false);
          setStep(5);
        }, 1500);
      }
    } catch (err) {
      setPaymentStatus('ERROR');
      setOrderError('Gagal terhubung ke server pembayaran.');
      setTimeout(() => {
        setPaymentModalOpen(false);
        setStep(5);
      }, 1500);
    }
  };

  // ── Create Order in Anteraja ──
  const handleCreateOrder = async () => {
    setIsCreatingOrder(true);
    setOrderError(null);

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender,
          recipient,
          package: packageInfo,
          selectedService,
        })
      });

      const data = await res.json();
      if (data.success) {
        setOrderTaskCode(data.taskCode || null);
        const actualPrice = data.totalDeliveryPrice ?? data.deliveryPrice ?? selectedService?.delivery_price ?? 0;
        await handleInitiatePayment(data.taskCode, actualPrice);
      } else {
        setStep(5);
        setOrderError(data.message || 'Gagal membuat order.');
        setCreatedAwb(null);
      }
    } catch {
      setStep(5);
      setOrderError('Gagal terhubung ke server Anteraja.');
      setCreatedAwb(null);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // ── Reset Form ──
  const handleReset = () => {
    setStep(1);
    setSelectedService(null);
    setCreatedAwb(null);
    setPaymentTrxId(null);
    setPaymentQrUrl(null);
    setPaymentStatus('PENDING');
    setOrderError(null);
    setOrderTaskCode(null);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Buat Pengiriman Baru</h2>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider hidden sm:block">
              Wizard Pengiriman Manual & Reguler
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
              <span className="material-symbols-outlined text-[16px] text-gray-400">badge</span>
              <span className="text-xs font-semibold text-gray-600">NIA: {user.nia}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-[840px] mx-auto">
            {/* Steps Progress Indicator */}
            {step < 5 && (
              <div className="mb-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between">
                  {[
                    { s: 1, name: 'Kontak', icon: 'contacts' },
                    { s: 2, name: 'Detail Paket', icon: 'box_edit' },
                    { s: 3, name: 'Layanan', icon: 'local_shipping' },
                    { s: 4, name: 'Pembayaran', icon: 'payments' }
                  ].map((item, idx) => (
                    <div key={item.s} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                            step >= item.s
                              ? 'bg-[#b5000b] text-white'
                              : 'bg-gray-100 text-gray-400 border border-gray-200'
                          }`}
                        >
                          {step > item.s ? (
                            <span className="material-symbols-outlined text-[18px]">check</span>
                          ) : (
                            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                          )}
                        </div>
                        <span
                          className={`text-[11px] font-bold mt-2 transition-all duration-300 ${
                            step >= item.s ? 'text-gray-900 font-semibold' : 'text-gray-400'
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>
                      {idx < 3 && (
                        <div className="flex-1 h-0.5 mx-4 bg-gray-100 relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-[#b5000b] transition-all duration-500 ease-out"
                            style={{ width: step > item.s ? '100%' : '0%' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WIZARD CONTAINER */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col justify-between">
              
              {/* STEP 1: Contacts Information */}
              {step === 1 && (
                <div className="p-6 md:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* SENDER INFO */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#b5000b] text-[20px]" style={FILL}>
                            person_pin_circle
                          </span>
                          <h3 className="font-bold text-gray-900 text-[15px]">Data Pengirim</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => openAddressBook('sender')}
                          className="h-7 px-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[12px]">contact_phone</span>
                          Buku Alamat
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nama Pengirim</label>
                          <input
                            type="text"
                            placeholder="Contoh: Ahmad Budi"
                            className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none"
                            value={sender.name}
                            onChange={(e) => setSender({ ...sender, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nomor Telepon</label>
                          <input
                            type="text"
                            placeholder="Contoh: 081234567890"
                            className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none"
                            value={sender.phone}
                            onChange={(e) => setSender({ ...sender, phone: e.target.value })}
                          />
                        </div>
                        <div className="space-y-4 p-4 bg-[#b5000b]/5 border border-[#b5000b]/20 rounded-2xl">
                          <div className="flex items-center justify-between border-b border-[#b5000b]/10 pb-1.5 mb-1">
                            <span className="text-[10px] font-bold text-[#b5000b] uppercase tracking-wider block">Wilayah Pengiriman (Lokasi Agen)</span>
                          </div>
                          
                          <div className="text-sm font-semibold text-gray-800">
                            {user.districtName || 'Wilayah Agen Tidak Ditemukan'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kode Pos</label>
                          <input
                            type="text"
                            placeholder="Sesuai lokasi agen..."
                            readOnly
                            className="w-full h-11 px-3.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-500 outline-none cursor-not-allowed"
                            value={sender.postalCode}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Alamat Lengkap</label>
                          <textarea
                            rows={3}
                            placeholder="Nama Jalan, Blok, RT/RW, No. Rumah"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none resize-none"
                            value={sender.address}
                            onChange={(e) => setSender({ ...sender, address: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="save-sender-chk"
                            className="w-4 h-4 text-[#b5000b] border-gray-200 rounded focus:ring-[#b5000b]/20"
                            checked={saveSenderAddress}
                            onChange={(e) => setSaveSenderAddress(e.target.checked)}
                          />
                          <label htmlFor="save-sender-chk" className="text-[11px] font-bold text-gray-400 cursor-pointer select-none">
                            Simpan ke Buku Alamat
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* RECIPIENT INFO */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#b5000b] text-[20px]" style={FILL}>
                            location_on
                          </span>
                          <h3 className="font-bold text-gray-900 text-[15px]">Data Penerima</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => openAddressBook('recipient')}
                          className="h-7 px-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[12px]">contact_phone</span>
                          Buku Alamat
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nama Penerima</label>
                          <input
                            type="text"
                            placeholder="Contoh: Siti Aminah"
                            className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none"
                            value={recipient.name}
                            onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nomor Telepon</label>
                          <input
                            type="text"
                            placeholder="Contoh: 085712345678"
                            className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none"
                            value={recipient.phone}
                            onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })}
                          />
                        </div>
                        <div className="space-y-4 p-4 bg-gray-50/50 border border-gray-150 rounded-2xl">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Wilayah Pengiriman</span>
                          </div>

                          {/* Manual Selection Cascading Fields */}
                          <div className="grid grid-cols-2 gap-3.5">
                            <SearchableSelectObject
                              label="Provinsi"
                              value={recipientProvince}
                              onChange={setRecipientProvince}
                              options={provincesList}
                              placeholder="Pilih Provinsi..."
                            />
                            <SearchableSelectObject
                              label="Kota / Kabupaten"
                              value={recipientCity}
                              onChange={setRecipientCity}
                              options={recipientCitiesList}
                              placeholder="Pilih Kota..."
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3.5">
                            <SearchableSelectObject
                              label="Kecamatan"
                              value={recipientKecamatan}
                              onChange={setRecipientKecamatan}
                              options={recipientKecamatansList}
                              placeholder="Pilih Kecamatan..."
                            />
                            <SearchableSelectObject
                              label="Kelurahan"
                              value={recipientKelurahan}
                              onChange={handleSelectRecipientKelurahan}
                              options={recipientKelurahansList}
                              placeholder="Pilih Kelurahan..."
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kode Pos</label>
                          <input
                            type="text"
                            placeholder="Contoh: 11480"
                            className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none"
                            value={recipient.postalCode}
                            onChange={(e) => setRecipient({ ...recipient, postalCode: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Alamat Lengkap</label>
                          <textarea
                            rows={3}
                            placeholder="Nama Jalan, Blok, RT/RW, No. Rumah"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none resize-none"
                            value={recipient.address}
                            onChange={(e) => setRecipient({ ...recipient, address: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="save-recipient-chk"
                            className="w-4 h-4 text-[#b5000b] border-gray-200 rounded focus:ring-[#b5000b]/20"
                            checked={saveRecipientAddress}
                            onChange={(e) => setSaveRecipientAddress(e.target.checked)}
                          />
                          <label htmlFor="save-recipient-chk" className="text-[11px] font-bold text-gray-400 cursor-pointer select-none">
                            Simpan ke Buku Alamat
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Package Information */}
              {step === 2 && (
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-2 border-b border-gray-50 pb-2 mb-4">
                    <span className="material-symbols-outlined text-[#b5000b] text-[20px]" style={FILL}>
                      package_2
                    </span>
                    <h3 className="font-bold text-gray-900 text-[15px]">Detail Paket & Barang</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nama Barang</label>
                        <input
                          type="text"
                          className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none"
                          value={packageInfo.itemName}
                          onChange={(e) => setPackageInfo({ ...packageInfo, itemName: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kategori</label>
                          <select
                            className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none"
                            value={packageInfo.category}
                            onChange={(e) => setPackageInfo({ ...packageInfo, category: e.target.value })}
                          >
                            <option value="Dokumen">Dokumen</option>
                            <option value="Pakaian">Pakaian</option>
                            <option value="Elektronik">Elektronik</option>
                            <option value="Makanan">Makanan</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nilai Barang (Rp)</label>
                          <input
                            type="number"
                            className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none"
                            value={packageInfo.value}
                            onChange={(e) => setPackageInfo({ ...packageInfo, value: Number(e.target.value) })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Berat (kg)</label>
                          <input
                            type="number"
                            step="0.1"
                            className="w-full h-11 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white outline-none"
                            value={packageInfo.weight}
                            onChange={(e) => setPackageInfo({ ...packageInfo, weight: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">P (cm)</label>
                          <input
                            type="number"
                            className="w-full h-11 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white outline-none"
                            value={packageInfo.dimensions.length}
                            onChange={(e) => setPackageInfo({
                              ...packageInfo,
                              dimensions: { ...packageInfo.dimensions, length: Number(e.target.value) }
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">L (cm)</label>
                          <input
                            type="number"
                            className="w-full h-11 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white outline-none"
                            value={packageInfo.dimensions.width}
                            onChange={(e) => setPackageInfo({
                              ...packageInfo,
                              dimensions: { ...packageInfo.dimensions, width: Number(e.target.value) }
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">T (cm)</label>
                          <input
                            type="number"
                            className="w-full h-11 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white outline-none"
                            value={packageInfo.dimensions.height}
                            onChange={(e) => setPackageInfo({
                              ...packageInfo,
                              dimensions: { ...packageInfo.dimensions, height: Number(e.target.value) }
                            })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* LIVE WEIGHT SUMMARY CARDS */}
                    <div className="bg-gray-50/70 p-6 rounded-2xl border border-gray-100 flex flex-col justify-center space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <span className="text-sm font-bold text-gray-500">Berat Aktual</span>
                        <span className="text-base font-mono font-extrabold text-gray-900">{packageInfo.weight} kg</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                          <span className="text-sm font-bold text-gray-500">Berat Volumetrik</span>
                          <p className="text-[10px] text-gray-400 font-semibold">(P x L x T) / 6000</p>
                        </div>
                        <span className="text-base font-mono font-extrabold text-gray-900">{volumetricWeight} kg</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="text-sm font-extrabold text-[#b5000b]">Berat Dikenakan (Chargeable)</span>
                          <p className="text-[10px] text-gray-400 font-semibold">Diambil nilai tertinggi</p>
                        </div>
                        <span className="text-xl font-mono font-extrabold text-[#b5000b] bg-[#b5000b]/5 px-3 py-1 rounded-xl">
                          {chargeableWeight} kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Service Selection */}
              {step === 3 && (
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-2 border-b border-gray-50 pb-2 mb-4">
                    <span className="material-symbols-outlined text-[#b5000b] text-[20px]" style={FILL}>
                      local_shipping
                    </span>
                    <h3 className="font-bold text-gray-900 text-[15px]">Pilih Layanan Pengiriman</h3>
                  </div>

                  {isRatesLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <div className="w-9 h-9 border-4 border-[#b5000b] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-bold text-gray-400">Menghubungi API Anteraja untuk kalkulasi ongkir...</p>
                    </div>
                  ) : ratesError ? (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 text-center space-y-3">
                      <span className="material-symbols-outlined text-rose-500 text-[40px]">error</span>
                      <p className="text-sm font-semibold text-rose-700">{ratesError}</p>
                      <button
                        onClick={fetchRates}
                        className="h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Layanan yang tersedia dari {sender.district} ke {recipient.district} ({chargeableWeight} kg):
                      </p>

                      <div className="grid grid-cols-1 gap-3.5">
                        {services.map((srv) => {
                          const isSelected = selectedService?.product_code === srv.product_code;
                          return (
                            <div
                              key={srv.product_code}
                              onClick={() => setSelectedService(srv)}
                              className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center justify-between ${
                                isSelected
                                  ? 'border-[#b5000b] bg-[#b5000b]/5 ring-2 ring-[#b5000b]/10 shadow-sm'
                                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    isSelected ? 'bg-[#b5000b] text-white' : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[20px]" style={FILL}>
                                    local_post_office
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900 text-sm">{srv.product_name}</h4>
                                  <p className="text-xs text-gray-400 font-semibold mt-0.5">Estimasi: {srv.duration}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-base font-mono font-extrabold text-gray-900">
                                  Rp {srv.delivery_price.toLocaleString('id-ID')}
                                </span>
                                {srv.pickup_start && (
                                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                    Pickup: {srv.pickup_start.slice(0, 5)} - {srv.pickup_end?.slice(0, 5)}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Review and Payment */}
              {step === 4 && (
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-2 border-b border-gray-50 pb-2 mb-4">
                    <span className="material-symbols-outlined text-[#b5000b] text-[20px]" style={FILL}>
                      payments
                    </span>
                    <h3 className="font-bold text-gray-900 text-[15px]">Ringkasan Order & Pembayaran</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* SUMMARY DETAILS */}
                    <div className="space-y-4 text-sm">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                        <h4 className="font-bold text-gray-900 border-b border-gray-200 pb-1.5 text-xs uppercase tracking-wider text-gray-500">
                          Rincian Rute & Kontak
                        </h4>
                        <p className="text-gray-800">
                          <strong>Pengirim:</strong> {sender.name} ({sender.phone}) <br />
                          <span className="text-xs text-gray-500 font-semibold">{sender.address}, Kec. {sender.district}</span>
                        </p>
                        <p className="text-gray-800 pt-1">
                          <strong>Penerima:</strong> {recipient.name} ({recipient.phone}) <br />
                          <span className="text-xs text-gray-500 font-semibold">{recipient.address}, Kec. {recipient.district}</span>
                        </p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                        <h4 className="font-bold text-gray-900 border-b border-gray-200 pb-1.5 text-xs uppercase tracking-wider text-gray-500">
                          Rincian Paket & Layanan
                        </h4>
                        <p className="text-gray-800 flex justify-between">
                          <span>Barang: {packageInfo.itemName}</span>
                          <span className="font-semibold text-xs bg-gray-200/60 px-2 py-0.5 rounded-lg text-gray-600">{packageInfo.category}</span>
                        </p>
                        <p className="text-gray-800">
                          <strong>Berat Dikenakan:</strong> {chargeableWeight} kg
                        </p>
                        <p className="text-gray-800">
                          <strong>Layanan Terpilih:</strong> {selectedService?.product_name}
                        </p>
                      </div>
                    </div>

                    {/* PAYMENT PANEL */}
                    <div className="border border-gray-100 p-6 rounded-2xl flex flex-col justify-between items-center text-center bg-gray-50/20">
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">TOTAL TAGIHAN</span>
                        <h2 className="text-3xl font-mono font-extrabold text-[#b5000b]">
                          Rp {selectedService?.delivery_price.toLocaleString('id-ID')}
                        </h2>
                        <p className="text-xs text-gray-400 font-medium">Pembayaran online dengan GoPay QR Code</p>
                      </div>

                      <div className="w-full mt-6 space-y-3">
                        <button
                          onClick={handleCreateOrder}
                          disabled={isCreatingOrder}
                          className="w-full h-12 bg-[#b5000b] hover:bg-[#b5000b]/90 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-[#b5000b]/15 transition-all duration-300 disabled:opacity-60"
                        >
                          {isCreatingOrder ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Memproses...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[20px]">qr_code</span>
                              Lanjut ke Pembayaran
                            </>
                          )}
                        </button>
                        <p className="text-[10px] text-gray-400 font-semibold">Order akan dibuat dan QR Code pembayaran akan muncul</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Confirmation */}
              {step === 5 && (
                <div className="p-8 md:p-12 text-center space-y-6 flex flex-col items-center justify-center min-h-[420px]">
                  {isCreatingOrder ? (
                    <div className="space-y-4">
                      <div className="w-12 h-12 border-4 border-[#b5000b] border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-sm font-semibold text-gray-500">Menyelesaikan pembuatan order dan menghasilkan AWB...</p>
                    </div>
                  ) : orderError ? (
                    <div className="space-y-4 max-w-[400px]">
                      <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <span className="material-symbols-outlined text-[36px]">error</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Pembuatan Order Gagal</h3>
                      <p className="text-sm text-gray-500 font-medium">
                        {orderError}
                      </p>
                      <button
                        onClick={() => { setOrderError(null); setStep(4); }}
                        className="h-11 px-6 bg-[#b5000b] hover:bg-[#b5000b]/95 text-white font-bold rounded-xl text-sm transition-all"
                      >
                        Kembali & Coba Lagi
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6 max-w-[480px] animate-fade-in-up">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <span className="material-symbols-outlined text-[36px]" style={FILL}>
                          check_circle
                        </span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Order Berhasil Dibuat!</h3>
                        <p className="text-sm text-gray-400 font-semibold">
                          Paket reguler Anda siap diserahkan/di-pickup oleh kurir Anteraja.
                        </p>
                      </div>

                      {/* AWB / TASK CODE BOX */}
                      <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl space-y-3">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Kode Order / AWB</span>
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-xl font-mono font-extrabold text-gray-900 tracking-wider">
                              {createdAwb}
                            </span>
                            <button
                              onClick={() => {
                                if (createdAwb) navigator.clipboard.writeText(createdAwb);
                                alert('Kode order disalin ke clipboard');
                              }}
                              className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-[#b5000b] flex items-center justify-center transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">content_copy</span>
                            </button>
                          </div>
                        </div>
                        {orderTaskCode && orderTaskCode !== createdAwb && (
                          <div className="pt-2 border-t border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Task Code: </span>
                            <span className="text-xs font-mono font-bold text-gray-600">{orderTaskCode}</span>
                          </div>
                        )}
                        <p className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-3 py-2 rounded-lg">
                          💡 AWB Anda sudah valid dan aktif. Silakan cetak label dan tempelkan pada paket sebelum diserahkan ke kurir.
                        </p>
                      </div>

                      {/* BOTTOM ACTIONS */}
                      <div className="flex flex-wrap gap-3 justify-center">
                        <button
                          onClick={handleReset}
                          className="h-11 px-5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold rounded-xl text-sm transition-all"
                        >
                          Buat Order Baru
                        </button>
                        <button
                          onClick={() => router.push(`/tracking?awb=${createdAwb}`)}
                          className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all"
                        >
                          Lacak Pengiriman
                        </button>
                        <button
                          onClick={() => router.push('/dashboard')}
                          className="h-11 px-5 bg-[#b5000b] hover:bg-[#b5000b]/90 text-white font-bold rounded-xl text-sm transition-all"
                        >
                          Ke Dashboard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FOOTER WIZARD NAVIGATION BUTTONS */}
              {step < 5 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <button
                    disabled={step === 1}
                    onClick={() => setStep(step - 1)}
                    className="h-10 px-4 border border-gray-200 text-gray-500 hover:bg-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Kembali
                  </button>

                  {step < 4 ? (
                    <button
                      onClick={handleNextStep}
                      disabled={step === 3 && !selectedService}
                      className="h-10 px-4 bg-[#b5000b] hover:bg-[#b5000b]/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-[#b5000b]/10 transition-colors disabled:opacity-40"
                    >
                      Lanjutkan
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* GOPAY QR PAYMENT DIALOG MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-gray-100 p-6 md:p-8 space-y-6 shadow-2xl relative animate-scale-up">
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-gray-900 text-lg">Scan QR untuk Bayar</h3>
              <p className="text-xs text-gray-400 font-semibold">Silakan scan kode QR di bawah dengan aplikasi GoPay</p>
            </div>

            {paymentQrUrl ? (
              <div className="flex flex-col items-center space-y-5 w-full max-w-[480px] mx-auto">
                {/* Payment Iframe */}
                <div className="bg-white border border-gray-150 rounded-2xl shadow-lg relative overflow-hidden flex flex-col items-center w-full h-[450px] mx-auto">
                  <iframe 
                    src={paymentQrUrl}
                    className="w-full h-full border-0"
                    title="Anteraja Payment"
                    allow="payment"
                  />

                  {paymentStatus === 'SUCCESS' && (
                    <div className="absolute inset-0 bg-emerald-500/95 text-white flex flex-col items-center justify-center space-y-2 animate-fade-in z-10">
                      <span className="material-symbols-outlined text-[48px]" style={FILL}>
                        check_circle
                      </span>
                      <span className="text-sm font-bold">Pembayaran Berhasil!</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full max-w-[480px] h-[320px] mx-auto bg-gray-50 rounded-2xl flex items-center justify-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-4 border-[#b5000b] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-400 font-semibold">Menghasilkan kode pembayaran...</p>
                </div>
              </div>
            )}

            {/* STATUS AND SIMULATOR PROGRESS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                <span>STATUS GOPAY: {paymentStatus}</span>
                <span>{paymentProgress}%</span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#b5000b] h-full transition-all duration-300 ease-out"
                  style={{ width: `${paymentProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 text-center font-semibold uppercase tracking-wider">
                Mencari konfirmasi pembayaran real-time dari GoPay...
              </p>
            </div>

            {/* BUTTON CANCEL */}
            <button
              onClick={() => {
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                }
                setPaymentModalOpen(false);
                setPaymentTrxId(null);
                setPaymentStatus('PENDING');
                setStep(5);
                setOrderError('Pembayaran dibatalkan oleh user.');
              }}
              className="w-full h-11 border border-gray-200 text-gray-500 hover:bg-gray-50 font-bold rounded-xl text-xs transition-colors"
            >
              Batalkan Pembayaran
            </button>
          </div>
        </div>
      )}

      {/* ADDRESS BOOK SELECTOR MODAL */}
      {addressBookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl border border-gray-100 p-6 space-y-6 shadow-2xl relative animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-gray-900 text-base">
                Pilih Alamat ({addressBookTarget === 'sender' ? 'Pengirim' : 'Penerima'})
              </h3>
              <button
                onClick={() => setAddressBookOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {savedAddresses.length > 0 ? (
              <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {savedAddresses.map((addr) => (
                  <li
                    key={addr.id}
                    onClick={() => selectAddress(addr)}
                    className="p-3.5 border border-gray-100 hover:border-[#b5000b]/20 hover:bg-red-50/10 rounded-2xl cursor-pointer transition-all flex items-start justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{addr.name}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                          {addr.phone}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                        {addr.address}, Kec. {addr.district}, {addr.postalCode}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteAddress(addr.id, e)}
                      className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center space-y-2">
                <span className="material-symbols-outlined text-gray-300 text-[48px]">
                  contact_phone
                </span>
                <p className="text-xs text-gray-400 font-bold">Buku alamat kosong</p>
                <p className="text-[10px] text-gray-400 font-semibold max-w-[240px] mx-auto">
                  Aktifkan "Simpan ke Buku Alamat" saat mengisi formulir untuk menyimpan alamat baru.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
