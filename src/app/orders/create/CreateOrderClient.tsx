'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { ContactInfo, PackageInfo, ServiceInfo } from '@/lib/types';
import SearchableDistrictSelect from '@/components/SearchableDistrictSelect';

interface User {
  name: string;
  nia: string;
  districtCode?: string;
  postalCode?: string;
  districtName?: string;
  cityCode?: string;
  cityName?: string;
  provinceCode?: string;
  provinceName?: string;
  isJabodetabek?: boolean;
}

const JABODETABEK_CITIES = [
  'Jakarta Pusat', 'Jakarta Utara', 'Jakarta Barat', 'Jakarta Selatan', 'Jakarta Timur', 'Kepulauan Seribu',
  'Bogor', 'Depok', 'Tangerang', 'Tangerang Selatan', 'Bekasi'
];

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
        className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none"
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
        className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none"
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

  // ── Step 1 State: Sender & Recipient ──
  const [sender, setSender] = useState<ContactInfo>({
    name: '',
    phone: '',
    address: '',
    district: '',
    postalCode: '',
    districtCode: ''
  });

  const [recipient, setRecipient] = useState<ContactInfo>({
    name: '',
    phone: '',
    address: '',
    district: '',
    postalCode: '',
    districtCode: ''
  });

  // Sender region selections state
  const [senderProvince, setSenderProvince] = useState<string>('');
  const [senderCity, setSenderCity] = useState<string>('');
  const [senderKecamatan, setSenderKecamatan] = useState<string>('');
  const [senderKelurahan, setSenderKelurahan] = useState<{ name: string; postalCode: string; districtCode: string } | null>(null);

  const [provinceList, setProvinceList] = useState<Array<{ name: string; code: string }>>([]);
  const [cityList, setCityList] = useState<string[]>([]);
  const [kecamatanList, setKecamatanList] = useState<Array<{ name: string; code: string }>>([]);
  const [kelurahanList, setKelurahanList] = useState<Array<{ name: string; postalCode: string; districtCode: string }>>([]);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingKecamatans, setLoadingKecamatans] = useState(false);
  const [loadingKelurahans, setLoadingKelurahans] = useState(false);

  // ── Step 4 State: Promo Engine ──
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    promo_code: string;
    total_promo: number;
    task: Array<{
      task_code: string;
      base_price: number;
      total_price: number;
      promo_amount: number;
    }>;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Checkbox states for saving to address book
  const [saveSenderAddress, setSaveSenderAddress] = useState(false);
  const [saveRecipientAddress, setSaveRecipientAddress] = useState(false);

  // Address Book state
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [addressBookTarget, setAddressBookTarget] = useState<'sender' | 'recipient' | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  const formatPhone = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('62')) {
      digits = '0' + digits.substring(2);
    }
    return digits;
  };

  const handleSelectSenderDistrict = (opt: any) => {
    setSender(prev => ({
      ...prev,
      district: opt.name,
      districtCode: opt.district_code,
      postalCode: opt.postal_code || ''
    }));
  };

  const handleSelectRecipientDistrict = (opt: any) => {
    setRecipient(prev => ({
      ...prev,
      district: opt.name,
      districtCode: opt.district_code,
      postalCode: opt.postal_code || ''
    }));
  };

  // Fetch provinces
  useEffect(() => {
    async function loadProvinces() {
      setLoadingProvinces(true);
      try {
        const res = await fetch('/api/regions');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          let list = json.data;
          if (user.isJabodetabek) {
            list = list.filter((p: any) => ['DKI JAKARTA', 'JAWA BARAT', 'BANTEN'].includes(p.name.toUpperCase()));
          } else if (user.provinceName) {
            list = list.filter((p: any) => p.name.toUpperCase() === user.provinceName?.toUpperCase());
          }
          setProvinceList(list);

          // Auto-select province if locked
          if (!user.isJabodetabek && user.provinceName) {
            const matched = list.find((p: any) => p.name.toUpperCase() === user.provinceName?.toUpperCase());
            if (matched) {
              setSenderProvince(matched.name);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load provinces:', err);
      } finally {
        setLoadingProvinces(false);
      }
    }
    loadProvinces();
  }, [user.isJabodetabek, user.provinceName]);

  // Fetch cities when province changes
  useEffect(() => {
    if (!senderProvince) {
      setCityList([]);
      setSenderCity('');
      return;
    }

    async function loadCities() {
      setLoadingCities(true);
      try {
        const res = await fetch(`/api/regions?province=${encodeURIComponent(senderProvince)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          let list = json.data;
          
          if (user.isJabodetabek) {
            const allowedJabo = [
              'BEKASI', 'BOGOR', 'DEPOK',
              'TANGERANG', 'TANGERANG SELATAN',
              'JAKARTA BARAT', 'JAKARTA PUSAT', 'JAKARTA SELATAN', 'JAKARTA TIMUR', 'JAKARTA UTARA', 'KEPULAUAN SERIBU'
            ];
            list = list.filter((c: string) => allowedJabo.includes(c.toUpperCase()));
          } else if (user.cityName) {
            const normalizedUserCity = user.cityName.toUpperCase()
              .replace(/^(KABUPATEN|KAB\.|KOTA)\s+/i, '')
              .replace(/\s+(KOTA|KABUPATEN)$/i, '')
              .trim();
            list = list.filter((c: string) => c.toUpperCase() === normalizedUserCity);
          }
          
          setCityList(list);

          // Auto-select city if locked
          if (!user.isJabodetabek && user.cityName) {
            const normalizedUserCity = user.cityName.toUpperCase()
              .replace(/^(KABUPATEN|KAB\.|KOTA)\s+/i, '')
              .replace(/\s+(KOTA|KABUPATEN)$/i, '')
              .trim();
            const matched = list.find((c: string) => c.toUpperCase() === normalizedUserCity);
            if (matched) {
              setSenderCity(matched);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load cities:', err);
      } finally {
        setLoadingCities(false);
      }
    }
    loadCities();
  }, [senderProvince, user.isJabodetabek, user.cityName]);

  // Fetch kecamatans when city changes
  useEffect(() => {
    if (!senderProvince || !senderCity) {
      setKecamatanList([]);
      setSenderKecamatan('');
      return;
    }

    async function loadKecamatans() {
      setLoadingKecamatans(true);
      try {
        const res = await fetch(`/api/regions?province=${encodeURIComponent(senderProvince)}&city=${encodeURIComponent(senderCity)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setKecamatanList(json.data);
        }
      } catch (err) {
        console.error('Failed to load kecamatans:', err);
      } finally {
        setLoadingKecamatans(false);
      }
    }
    loadKecamatans();
  }, [senderProvince, senderCity]);

  // Fetch kelurahans when kecamatan changes
  useEffect(() => {
    if (!senderProvince || !senderCity || !senderKecamatan) {
      setKelurahanList([]);
      setSenderKelurahan(null);
      return;
    }

    async function loadKelurahans() {
      setLoadingKelurahans(true);
      try {
        const res = await fetch(`/api/regions?province=${encodeURIComponent(senderProvince)}&city=${encodeURIComponent(senderCity)}&kecamatan=${encodeURIComponent(senderKecamatan)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setKelurahanList(json.data);
        }
      } catch (err) {
        console.error('Failed to load kelurahans:', err);
      } finally {
        setLoadingKelurahans(false);
      }
    }
    loadKelurahans();
  }, [senderProvince, senderCity, senderKecamatan]);

  const handleSelectSenderKelurahan = (kelValStr: string) => {
    if (!kelValStr) {
      setSenderKelurahan(null);
      setSender(prev => ({
        ...prev,
        district: '',
        districtCode: '',
        postalCode: ''
      }));
      return;
    }
    const [name, postalCode, districtCode] = kelValStr.split('|');
    const kelObj = { name, postalCode, districtCode };
    setSenderKelurahan(kelObj);

    setSender(prev => ({
      ...prev,
      district: `Kec. ${senderKecamatan}, ${senderCity}, ${senderProvince}`,
      districtCode: districtCode,
      postalCode: postalCode
    }));
  };

  const resolveSenderLocation = async (code: string, targetPostalCode: string) => {
    if (!code) return;
    try {
      const res = await fetch(`/api/regions?code=${encodeURIComponent(code)}`);
      const json = await res.json();
      if (json.success && json.data) {
        const { province, city, kecamatan } = json.data;
        setSenderProvince(province);
        setSenderCity(city);
        setSenderKecamatan(kecamatan);

        const kelRes = await fetch(`/api/regions?province=${encodeURIComponent(province)}&city=${encodeURIComponent(city)}&kecamatan=${encodeURIComponent(kecamatan)}`);
        const kelJson = await kelRes.json();
        if (kelJson.success && Array.isArray(kelJson.data)) {
          setKelurahanList(kelJson.data);
          const matchedKel = kelJson.data.find((k: any) => k.postalCode === targetPostalCode);
          if (matchedKel) {
            setSenderKelurahan(matchedKel);
          } else if (kelJson.data.length > 0) {
            setSenderKelurahan(kelJson.data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to resolve sender location:', err);
    }
  };

  // Auto resolve sender's districtCode to populate province, city, kecamatan, kelurahan dropdowns
  useEffect(() => {
    if (sender.districtCode && !senderProvince) {
      resolveSenderLocation(sender.districtCode, sender.postalCode);
    }
  }, [sender.districtCode]);

  // Promo handling
  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) {
      setPromoError('Masukkan kode promo terlebih dahulu.');
      return;
    }
    setIsValidatingPromo(true);
    setPromoError(null);
    try {
      const payload = {
        promo_code: promoCodeInput.trim().toUpperCase(),
        task: [
          {
            task_code: 'DUMMY-TASK-CODE',
            base_price: selectedService?.delivery_price || 0,
            total_price: selectedService?.delivery_price || 0,
            promo_amount: 0
          }
        ]
      };

      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.status === 0 && data.content) {
        setAppliedPromo(data.content);
        setPromoError(null);
      } else {
        setAppliedPromo(null);
        setPromoError(data.info || 'Kode promo tidak dapat digunakan.');
      }
    } catch (err: any) {
      console.error('Failed to validate promo:', err);
      setPromoError('Gagal memvalidasi kode promo.');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setPromoError(null);
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
      // Check if the address is allowed
      if (user.isJabodetabek) {
        const isInJabodetabek = JABODETABEK_CITIES.some(city => addr.district.toLowerCase().includes(city.toLowerCase()));
        if (!isInJabodetabek) {
          alert(`Buku alamat ini berada di luar wilayah Jabodetabek. Agen Jabodetabek hanya dapat mengirim dari wilayah Jabodetabek.`);
          return;
        }
      } else {
        if (user.cityName && !addr.district.toLowerCase().includes(user.cityName.toLowerCase())) {
          alert(`Buku alamat ini berada di luar wilayah operasi Anda (${user.cityName}). Pengirim harus berada di kota yang sama.`);
          return;
        }
      }
      setSender(info);
      resolveSenderLocation(addr.districtCode, addr.postalCode);
    } else if (addressBookTarget === 'recipient') {
      setRecipient(info);
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

  // ── Draft System ──
  const isInitialMount = useRef(true);

  useEffect(() => {
    try {
      const draftStr = localStorage.getItem('mitraaja_draft_order');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (window.confirm('Anda memiliki draft order yang belum selesai. Lanjutkan draft ini?')) {
          if (draft.sender) setSender(draft.sender);
          if (draft.recipient) setRecipient(draft.recipient);
          if (draft.packageInfo) setPackageInfo(draft.packageInfo);
          if (draft.step) setStep(draft.step);
        } else {
          localStorage.removeItem('mitraaja_draft_order');
        }
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    }
    isInitialMount.current = false;
  }, []);

  useEffect(() => {
    if (isInitialMount.current) return;
    const timer = setTimeout(() => {
      const draft = { sender, recipient, packageInfo, step };
      localStorage.setItem('mitraaja_draft_order', JSON.stringify(draft));
    }, 1000);
    return () => clearTimeout(timer);
  }, [sender, recipient, packageInfo, step]);
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
  const [paymentTrxId, setPaymentTrxId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'SUCCESS' | 'ERROR' | 'TIMEOUT'>('PENDING');
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
          originCode: sender.districtCode || user.districtCode, // Use sender's selected location code, fallback to agent's code
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
      if (!sender.name.trim() || !sender.phone.trim() || !sender.address.trim() || !senderProvince || !senderCity || !senderKecamatan || !senderKelurahan) {
        alert('Mohon lengkapi seluruh data pengirim, termasuk memilih Provinsi, Kota/Kabupaten, Kecamatan, dan Kelurahan.');
        return;
      }
      if (!recipient.name.trim() || !recipient.phone.trim() || !recipient.address.trim() || !recipient.district.trim() || !recipient.postalCode.trim()) {
        alert('Mohon lengkapi seluruh data penerima.');
        return;
      }

      // Duplicate Detection
      if (
        sender.name.toLowerCase().trim() === recipient.name.toLowerCase().trim() &&
        sender.phone.trim() === recipient.phone.trim()
      ) {
        alert('Data pengirim dan penerima tidak boleh sama.');
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

      // Max weight validation
      if (packageInfo.weight > 15) {
        alert('Berat aktual melebihi batas maksimal 15 kg untuk layanan Reguler/Next Day.');
        return;
      }
      
      const volumetricWeightCalc = (packageInfo.dimensions.length * packageInfo.dimensions.width * packageInfo.dimensions.height) / 6000;
      if (volumetricWeightCalc > 30) {
        alert('Berat volumetrik melebihi batas maksimal 30 kg.');
        return;
      }

      const chargeableWeightCalc = Math.max(packageInfo.weight, volumetricWeightCalc);
      if (chargeableWeightCalc > 300) {
        alert('Berat tertagih melebihi batas maksimal 300 kg');
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
    let attempts = 0;
    const maxAttempts = 60; // 3 minutes timeout (60 * 3s)

    const interval = setInterval(async () => {
      attempts++;
      progress = Math.min(progress + 2, 95); // Slower progress
      setPaymentProgress(progress);

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setPaymentStatus('TIMEOUT');
        return;
      }

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
        }
      } catch (err) {
        console.error('Polling status error:', err);
      }
    }, 3000);

    pollingIntervalRef.current = interval;
  };

  // ── Initiate GoPay QR Payment ──
  const handleInitiatePayment = async (taskCode: string, deliveryPrice: number, promoCode?: string, discount?: number) => {
    setPaymentTrxId(taskCode);
    setPaymentQrUrl(null);
    setPaymentStatus('PENDING');
    setPaymentProgress(0);
    setPaymentModalOpen(true);
    setOrderError(null);

    const promoCodeVal = promoCode !== undefined ? promoCode : (appliedPromo ? appliedPromo.promo_code : undefined);
    const discountVal = discount !== undefined ? discount : (appliedPromo ? appliedPromo.total_promo : 0);

    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskCode,
          deliveryPrice,
          shipperPhone: sender.phone,
          promoCode: promoCodeVal,
          discount: discountVal
        })
      });

      const data = await res.json();
      if (data.success && data.paymentUrl) {
        setPaymentQrUrl(data.paymentUrl);
        startPollingPayment(taskCode);
      } else {
        setPaymentStatus('ERROR');
        setOrderError(data.message || 'Gagal memulai pembayaran.');
      }
    } catch (err) {
      setPaymentStatus('ERROR');
      setOrderError('Gagal terhubung ke server pembayaran.');
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
        const promoCode = appliedPromo ? appliedPromo.promo_code : undefined;
        const discount = appliedPromo ? appliedPromo.total_promo : 0;
        await handleInitiatePayment(data.taskCode, actualPrice, promoCode, discount);
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
    
    // Clear states
    setSender({ name: '', phone: '', address: '', district: '', postalCode: '', districtCode: '' });
    setRecipient({ name: '', phone: '', address: '', district: '', postalCode: '', districtCode: '' });
    setPackageInfo({ itemName: '', category: '', weight: 0, dimensions: { length: 0, width: 0, height: 0 }, value: 0 });
    localStorage.removeItem('mitraaja_draft_order');
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
                              ? 'bg-primary text-white'
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
                            className="absolute inset-y-0 left-0 bg-primary transition-all duration-500 ease-out"
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
                          <span className="material-symbols-outlined text-primary text-[20px]" style={FILL}>
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
                            className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none"
                            value={sender.name}
                            onChange={(e) => setSender({ ...sender, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nomor Telepon</label>
                          <input
                            type="text"
                            placeholder="Contoh: 081234567890"
                            className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none"
                            value={sender.phone}
                            onChange={(e) => setSender({ ...sender, phone: formatPhone(e.target.value) })}
                          />
                        </div>
                        {/* Provinsi */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Provinsi {loadingProvinces && <span className="animate-pulse text-primary font-normal text-[10px] lowercase">(memuat...)</span>}
                          </label>
                          <select
                            value={senderProvince}
                            onChange={(e) => {
                              setSenderProvince(e.target.value);
                              setSenderCity('');
                              setSenderKecamatan('');
                              setSenderKelurahan(null);
                            }}
                            disabled={!user.isJabodetabek && !!user.provinceName}
                            className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none disabled:opacity-75 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Pilih Provinsi</option>
                            {provinceList.map((p) => (
                              <option key={p.code} value={p.name}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Kota/Kabupaten */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Kota / Kabupaten {loadingCities && <span className="animate-pulse text-primary font-normal text-[10px] lowercase">(memuat...)</span>}
                          </label>
                          <select
                            value={senderCity}
                            onChange={(e) => {
                              setSenderCity(e.target.value);
                              setSenderKecamatan('');
                              setSenderKelurahan(null);
                            }}
                            disabled={(!user.isJabodetabek && !!user.cityName) || !senderProvince}
                            className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none disabled:opacity-75 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Pilih Kota/Kabupaten</option>
                            {cityList.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        {/* Kecamatan */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Kecamatan {loadingKecamatans && <span className="animate-pulse text-primary font-normal text-[10px] lowercase">(memuat...)</span>}
                          </label>
                          <select
                            value={senderKecamatan}
                            onChange={(e) => {
                              setSenderKecamatan(e.target.value);
                              setSenderKelurahan(null);
                            }}
                            disabled={!senderCity}
                            className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none disabled:opacity-75 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Pilih Kecamatan</option>
                            {kecamatanList.map((k) => (
                              <option key={k.code} value={k.name}>{k.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Kelurahan */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Kelurahan / Desa {loadingKelurahans && <span className="animate-pulse text-primary font-normal text-[10px] lowercase">(memuat...)</span>}
                          </label>
                          <select
                            value={senderKelurahan ? `${senderKelurahan.name}|${senderKelurahan.postalCode}|${senderKelurahan.districtCode}` : ''}
                            onChange={(e) => handleSelectSenderKelurahan(e.target.value)}
                            disabled={!senderKecamatan}
                            className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none disabled:opacity-75 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Pilih Kelurahan</option>
                            {kelurahanList.map((k, idx) => (
                              <option key={idx} value={`${k.name}|${k.postalCode}|${k.districtCode}`}>
                                {k.name} / {k.postalCode}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Alamat Lengkap */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Alamat Lengkap</label>
                          <textarea
                            rows={3}
                            placeholder="Nama Jalan, Nomor Rumah, RT/RW, Blok, Gang, dll. (tanpa mengulang Provinsi/Kota/Kecamatan/Kelurahan)"
                            className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none resize-none"
                            value={sender.address}
                            onChange={(e) => setSender({ ...sender, address: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="save-sender-chk"
                            className="w-4 h-4 text-primary border-gray-200 rounded focus:ring-primary/20"
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
                          <span className="material-symbols-outlined text-primary text-[20px]" style={FILL}>
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
                            className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none"
                            value={recipient.name}
                            onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nomor Telepon</label>
                          <input
                            type="text"
                            placeholder="Contoh: 085712345678"
                            className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none"
                            value={recipient.phone}
                            onChange={(e) => setRecipient({ ...recipient, phone: formatPhone(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-4 p-4 bg-gray-50/50 border border-gray-150 rounded-2xl">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Wilayah Pengiriman</span>
                          </div>

                          <SearchableDistrictSelect
                            label="Kecamatan / Kelurahan Penerima"
                            value={recipient.district}
                            onChange={handleSelectRecipientDistrict}
                            placeholder="Ketik minimal 3 huruf (Cth: Pasar Minggu)"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kode Pos</label>
                          <input
                            type="text"
                            placeholder="Contoh: 11480"
                            className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none"
                            value={recipient.postalCode}
                            onChange={(e) => setRecipient({ ...recipient, postalCode: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Alamat Lengkap</label>
                          <textarea
                            rows={3}
                            placeholder="Nama Jalan, Blok, RT/RW, No. Rumah"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none resize-none"
                            value={recipient.address}
                            onChange={(e) => setRecipient({ ...recipient, address: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="save-recipient-chk"
                            className="w-4 h-4 text-primary border-gray-200 rounded focus:ring-primary/20"
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
                    <span className="material-symbols-outlined text-primary text-[20px]" style={FILL}>
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
                          className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none"
                          value={packageInfo.itemName}
                          onChange={(e) => setPackageInfo({ ...packageInfo, itemName: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kategori</label>
                          <select
                            className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none"
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
                            className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none"
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
                            className="w-full h-11 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white outline-none"
                            value={packageInfo.weight}
                            onChange={(e) => setPackageInfo({ ...packageInfo, weight: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">P (cm)</label>
                          <input
                            type="number"
                            className="w-full h-11 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white outline-none"
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
                            className="w-full h-11 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white outline-none"
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
                            className="w-full h-11 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white outline-none"
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
                          <span className="text-sm font-extrabold text-primary">Berat Dikenakan (Chargeable)</span>
                          <p className="text-[10px] text-gray-400 font-semibold">Diambil nilai tertinggi</p>
                        </div>
                        <span className="text-xl font-mono font-extrabold text-primary bg-primary/5 px-3 py-1 rounded-xl">
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
                    <span className="material-symbols-outlined text-primary text-[20px]" style={FILL}>
                      local_shipping
                    </span>
                    <h3 className="font-bold text-gray-900 text-[15px]">Pilih Layanan Pengiriman</h3>
                  </div>

                  {isRatesLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <div className="w-9 h-9 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
                          const minPrice = Math.min(...services.map(s => s.delivery_price));
                          const isCheapest = srv.delivery_price === minPrice;
                          
                          // Determine fastest by code priority: SDS > NDS
                          const hasSds = services.some(s => s.product_code === 'SDS');
                          const hasNds = services.some(s => s.product_code === 'NDS');
                          const fastestCode = hasSds ? 'SDS' : (hasNds ? 'NDS' : null);
                          const isFastest = srv.product_code === fastestCode;

                          return (
                            <div
                              key={srv.product_code}
                              onClick={() => setSelectedService(srv)}
                              className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center justify-between overflow-hidden ${
                                isSelected
                                  ? 'border-primary bg-primary/5 ring-2 ring-primary/10 shadow-sm'
                                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                              }`}
                            >
                              {/* Recommendation Badges */}
                              {(isCheapest || isFastest) && (
                                <div className="absolute top-0 right-0 flex">
                                  {isCheapest && (
                                    <div className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-1 uppercase tracking-wider rounded-bl-lg">
                                      Paling Murah
                                    </div>
                                  )}
                                  {isFastest && !isCheapest && (
                                    <div className="bg-amber-500 text-white text-[9px] font-bold px-2 py-1 uppercase tracking-wider rounded-bl-lg">
                                      Paling Cepat
                                    </div>
                                  )}
                                  {isFastest && isCheapest && (
                                    <div className="bg-blue-500 text-white text-[9px] font-bold px-2 py-1 uppercase tracking-wider rounded-bl-lg ml-px">
                                      Paling Cepat
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-4 mt-2">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[20px]" style={FILL}>
                                    local_post_office
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                    {srv.product_name}
                                  </h4>
                                  <p className="text-xs text-gray-400 font-semibold mt-0.5">Estimasi: {srv.duration}</p>
                                </div>
                              </div>
                              <div className="text-right mt-2">
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
                    <span className="material-symbols-outlined text-primary text-[20px]" style={FILL}>
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
                        <div className="bg-white border border-gray-100 rounded-lg p-3 text-xs space-y-1 mt-2 shadow-sm">
                          <div className="flex justify-between text-gray-500">
                            <span>Berat Aktual</span>
                            <span>{packageInfo.weight} kg</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Berat Volumetrik</span>
                            <span>{volumetricWeight} kg</span>
                          </div>
                          <div className="flex justify-between font-bold text-gray-800 mt-1 pt-1 border-t border-gray-50">
                            <span>Berat Dikenakan (Chargeable)</span>
                            <span className="text-primary">{chargeableWeight} kg</span>
                          </div>
                        </div>
                        <p className="text-gray-800 mt-3 flex justify-between items-center">
                          <strong>Layanan Terpilih:</strong> 
                          <span className="font-bold text-sm">{selectedService?.product_name}</span>
                        </p>
                      </div>
                    </div>

                    {/* PAYMENT PANEL */}
                    <div className="border border-gray-100 p-6 rounded-2xl flex flex-col justify-between items-center text-center bg-gray-50/20 space-y-4">
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">TOTAL TAGIHAN</span>
                        {appliedPromo ? (
                          <div className="space-y-1">
                            <span className="text-xs text-gray-500 font-semibold line-through block">
                              Rp {selectedService?.delivery_price.toLocaleString('id-ID')}
                            </span>
                            <h2 className="text-3xl font-mono font-extrabold text-primary">
                              Rp {Math.max(0, (selectedService?.delivery_price || 0) - appliedPromo.total_promo).toLocaleString('id-ID')}
                            </h2>
                            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg inline-block">
                              Hemat Rp {appliedPromo.total_promo.toLocaleString('id-ID')} ({appliedPromo.promo_code})
                            </span>
                          </div>
                        ) : (
                          <h2 className="text-3xl font-mono font-extrabold text-primary">
                            Rp {selectedService?.delivery_price.toLocaleString('id-ID')}
                          </h2>
                        )}
                        <p className="text-xs text-gray-400 font-medium">Pembayaran online dengan GoPay QR Code</p>
                      </div>

                      {/* Promo Input Box */}
                      <div className="w-full bg-white p-4 rounded-xl border border-gray-150 space-y-2.5 text-left">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Kode Promo / Voucher
                        </label>
                        {appliedPromo ? (
                          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                            <div>
                              <span className="text-xs font-bold text-emerald-700 block">{appliedPromo.promo_code}</span>
                              <span className="text-[10px] text-emerald-600 font-medium">Diskon Rp {appliedPromo.total_promo.toLocaleString('id-ID')} berhasil dipasang</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemovePromo}
                              className="text-gray-400 hover:text-rose-500 text-xs font-bold transition-colors"
                            >
                              Hapus
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Masukkan kode promo"
                              value={promoCodeInput}
                              onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                              className="flex-1 h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 outline-none focus:border-primary/20 focus:bg-white transition-all uppercase"
                            />
                            <button
                              type="button"
                              onClick={handleApplyPromo}
                              disabled={isValidatingPromo}
                              className="h-9 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center"
                            >
                              {isValidatingPromo ? '...' : 'Gunakan'}
                            </button>
                          </div>
                        )}
                        {promoError && (
                          <p className="text-[10px] text-rose-500 font-bold leading-normal mt-1">{promoError}</p>
                        )}
                      </div>

                      <div className="w-full mt-2 space-y-3">
                        <button
                          onClick={handleCreateOrder}
                          disabled={isCreatingOrder}
                          className="w-full h-12 bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-all duration-300 disabled:opacity-60"
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
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
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
                        className="h-11 px-6 bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary text-white font-bold rounded-xl text-sm transition-all"
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
                              className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-primary flex items-center justify-center transition-colors"
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
                          onClick={() => window.open(`/orders/${orderTaskCode || createdAwb}/label?autoprint=true`, '_blank')}
                          className="h-11 px-5 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-1.5 shadow-md shadow-gray-900/10"
                        >
                          <span className="material-symbols-outlined text-[18px]">print</span>
                          Cetak Label Shipping
                        </button>
                        <button
                          onClick={() => router.push(`/tracking?awb=${createdAwb}`)}
                          className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all"
                        >
                          Lacak Pengiriman
                        </button>
                        <button
                          onClick={() => router.push('/dashboard')}
                          className="h-11 px-5 bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary text-white font-bold rounded-xl text-sm transition-all"
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
                      className="h-10 px-4 bg-primary hover:bg-primary-light text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary/10 transition-colors disabled:opacity-40"
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

                  {(paymentStatus === 'ERROR' || paymentStatus === 'TIMEOUT') && (
                    <div className="absolute inset-0 bg-rose-500/95 text-white flex flex-col items-center justify-center space-y-4 animate-fade-in z-10 p-6 text-center">
                      <span className="material-symbols-outlined text-[48px]" style={FILL}>
                        {paymentStatus === 'TIMEOUT' ? 'timer_off' : 'error'}
                      </span>
                      <div>
                        <span className="text-lg font-bold block mb-1">
                          {paymentStatus === 'TIMEOUT' ? 'Waktu Pembayaran Habis' : 'Pembayaran Gagal'}
                        </span>
                        <p className="text-xs text-white/80 font-medium max-w-[280px]">
                          {orderError || 'Silakan coba buat kode QR baru untuk melanjutkan pembayaran.'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (paymentTrxId && selectedService) {
                            handleInitiatePayment(paymentTrxId, selectedService.delivery_price);
                          }
                        }}
                        className="h-10 px-6 bg-white text-rose-600 font-bold rounded-xl text-sm shadow-md hover:scale-105 active:scale-95 transition-all mt-2"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full max-w-[480px] h-[320px] mx-auto bg-gray-50 rounded-2xl flex items-center justify-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-400 font-semibold">Menghasilkan kode pembayaran...</p>
                </div>
              </div>
            )}

            {/* STATUS AND SIMULATOR PROGRESS */}
            {paymentStatus === 'PENDING' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                  <span>STATUS GOPAY: PENDING</span>
                  <span>{paymentProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 ease-out"
                    style={{ width: `${paymentProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 text-center font-semibold uppercase tracking-wider">
                  Menunggu pembayaran selesai...
                </p>
              </div>
            )}

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
              Tutup & Batalkan Pembayaran
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
                    className="p-3.5 border border-gray-100 hover:border-primary/20 hover:bg-red-50/10 rounded-2xl cursor-pointer transition-all flex items-start justify-between group"
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
