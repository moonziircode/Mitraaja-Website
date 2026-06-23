"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import SearchableDistrictSelect from "@/components/SearchableDistrictSelect";
import { Package, MapPin, Calculator, Loader2, AlertCircle } from "lucide-react";
import axios from "axios";

interface RatesClientProps {
  user: {
    name: string;
    nia: string;
  };
}

interface ServiceRate {
  product_code: string;
  product_name: string;
  duration: string;
  weight: number;
  delivery_price: number;
}

export default function RatesClient({ user }: RatesClientProps) {
  const [origin, setOrigin] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [weight, setWeight] = useState<string>("1");
  const [rates, setRates] = useState<ServiceRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckRates = async () => {
    if (!origin || !destination || !weight) {
      setError("Silakan lengkapi asal, tujuan, dan berat barang.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setRates([]);

    try {
      const response = await axios.post("/api/rates/check", {
        origin: origin.name,
        destination: destination.name,
        weight: Number(weight),
        originCode: origin.code || origin.district_code,
        destinationCode: destination.code || destination.district_code,
      });

      if (response.data.success && response.data.content) {
        setRates(response.data.content);
      } else {
        setError(response.data.info || "Gagal mendapatkan tarif.");
      }
    } catch (err: any) {
      setError(err.response?.data?.info || "Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto bg-surface">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              Cek Ongkir
            </h1>
            <p className="text-gray-500 mt-1">Cek estimasi tarif pengiriman Anteraja berdasarkan asal dan tujuan</p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="relative">
                <div className="flex items-center gap-2 mb-2 text-pink-600">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-bold">Kecamatan Asal</span>
                </div>
                <SearchableDistrictSelect
                  label=""
                  value={origin?.name || ""}
                  onChange={(opt) => setOrigin(opt)}
                  placeholder="Cari kecamatan asal..."
                />
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-2 text-blue-600">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-bold">Kecamatan Tujuan</span>
                </div>
                <SearchableDistrictSelect
                  label=""
                  value={destination?.name || ""}
                  onChange={(opt) => setDestination(opt)}
                  placeholder="Cari kecamatan tujuan..."
                />
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2 text-gray-700">
                <Package className="w-4 h-4" />
                <span className="text-sm font-bold">Berat Barang (kg)</span>
              </div>
              <input
                type="number"
                min="1"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full sm:w-1/3 h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-pink-500 focus:ring-4 focus:ring-pink-50 transition-all outline-none"
              />
            </div>

            <button
              onClick={handleCheckRates}
              disabled={isLoading || !origin || !destination || !weight}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menghitung...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  Cek Tarif
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-red-800">Gagal Memuat Tarif</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {rates.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Layanan Tersedia</h3>
              {rates.map((rate, index) => (
                <div key={index} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-lg">
                        {rate.product_code}
                      </span>
                      <h4 className="font-bold text-gray-900">{rate.product_name}</h4>
                    </div>
                    <p className="text-sm text-gray-500">Estimasi Pengiriman: {rate.duration}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Total Biaya ({rate.weight} kg)</p>
                    <p className="text-2xl font-black text-gray-900">
                      Rp {rate.delivery_price.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
