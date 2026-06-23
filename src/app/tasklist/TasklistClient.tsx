"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { MaaTaskList } from "@/types/tasklist";
import TasklistTabs from "./components/TasklistTabs";
import TaskCard from "./components/TaskCard";
import { Loader2, Search, XCircle, AlertCircle, Package, RefreshCw } from "lucide-react";
import { useDebounce } from "use-debounce";

export default function TasklistClient() {
  const [activeTab, setActiveTab] = useState("ACTIVE");
  const [tasks, setTasks] = useState<MaaTaskList[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 800);

  // Auto refresh interval for "Real-time" feel
  useEffect(() => {
    // Only auto-refresh if on ACTIVE tab and at the first page
    if (activeTab !== "ACTIVE" || page > 1) return;
    
    const intervalId = setInterval(() => {
      fetchTasks(true, true); // true for reset, true for isBackground
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, searchQuery]);

  const fetchTasks = async (reset: boolean = false, isBackground: boolean = false) => {
    if ((isLoading && !isBackground) || (!hasMore && !reset)) return;
    
    if (!isBackground) setIsLoading(true);
    setIsError(null);
    
    try {
      const currentPage = reset ? 0 : page;
      
      const response = await axios.get("/api/tasklist", {
        params: {
          state: activeTab,
          page: currentPage,
          size: 10,
          key: debouncedSearch,
          grouped: true,
        },
      });

      const newTasks = response.data?.content || [];
      
      if (reset) {
        setTasks(newTasks);
      } else {
        setTasks((prev) => [...prev, ...newTasks]);
      }
      
      setHasMore(newTasks.length === 10);
      setPage(currentPage + 1);
      
    } catch (error: any) {
      if (error.response?.status === 401) {
        setIsError("Sesi kedaluwarsa. Harap login kembali.");
      } else {
        setIsError(error.response?.data?.message || "Gagal memuat daftar tugas.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Reset when tab or search changes
  useEffect(() => {
    fetchTasks(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedSearch]);

  // Observer for Infinite Scroll
  const observerTarget = useRef(null);
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !isLoading) {
        fetchTasks(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasMore, isLoading, page, activeTab, debouncedSearch]
  );

  useEffect(() => {
    const element = observerTarget.current;
    const option = { threshold: 0 };
    const observer = new IntersectionObserver(handleObserver, option);
    if (element) observer.observe(element);
    return () => {
      if (element) observer.unobserve(element);
    };
  }, [handleObserver]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            Tasklist
            {activeTab === "ACTIVE" && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-100 text-xs font-semibold text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Real-time
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-1">Kelola dan pantau daftar tugas penjemputan paket</p>
        </div>
        <button
          onClick={() => fetchTasks(true)}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm flex items-center justify-center"
          title="Muat ulang"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow shadow-sm"
          placeholder="Cari nama pengirim atau no resi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>

      <TasklistTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {isError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Terjadi Kesalahan</h3>
            <p className="text-sm text-red-600 mt-1">{isError}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col">
        {tasks.map((task, index) => (
          <TaskCard 
            key={index} 
            tasklist={task} 
            onClickDetail={() => {
              // Open bottom sheet
              console.log("Detail clicked", task);
            }} 
          />
        ))}

        {!isLoading && tasks.length === 0 && !isError && (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200 mt-4">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800">Tidak ada tugas</h3>
            <p className="text-gray-500 mt-1 max-w-xs mx-auto">
              Belum ada tugas {activeTab === "ACTIVE" ? "hari ini" : activeTab === "DELAY" ? "yang tertunda" : "di riwayat"}.
            </p>
          </div>
        )}

        <div ref={observerTarget} className="h-10 w-full flex items-center justify-center mt-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-blue-600 font-medium">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memuat data...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
