"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { MaaTaskList } from "@/types/tasklist";
import TertundaCard from "./components/TertundaCard";
import TaskDetailModal from "./components/TaskDetailModal";
import PrintAWBModal from "./components/PrintAWBModal";
import Sidebar from "@/components/Sidebar";
import { Loader2, Search, XCircle, AlertCircle, Package, RefreshCw } from "lucide-react";
import { useDebounce } from "use-debounce";

interface TasklistClientProps {
  user: {
    name: string;
    nia: string;
  };
}

export default function TasklistClient({ user }: TasklistClientProps) {
  const [tasks, setTasks] = useState<MaaTaskList[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 800);

  const [selectedTask, setSelectedTask] = useState<MaaTaskList | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [taskToPrint, setTaskToPrint] = useState<MaaTaskList | null>(null);

  const openDetail = (task: MaaTaskList) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const openPrint = (task: MaaTaskList) => {
    setTaskToPrint(task);
    setIsPrintModalOpen(true);
  };

  // Auto refresh interval for real-time updates (every 5 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchTasks(true, true); // reset=true, isBackground=true
    }, 5000);

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const fetchTasks = async (reset: boolean = false, isBackground: boolean = false) => {
    if ((isLoading && !isBackground) || (!hasMore && !reset)) return;
    
    if (!isBackground) setIsLoading(true);
    setIsError(null);
    
    try {
      const currentPage = reset ? 0 : page;
      
      const response = await axios.get("/api/tasklist", {
        params: {
          state: "TERTUNDA",
          page: currentPage,
          size: 10,
          key: debouncedSearch,
          grouped: true,
        },
      });

      const rawTasks: any[] = response.data?.content || [];
      
      // Strict client-side filter: only keep tasks with WAITING_FOR_HANDOVER_SERAH
      const filteredTasks = rawTasks.map((group: any) => {
        if (!group.tasks) return null;
        const validSubTasks = group.tasks.filter((t: any) => {
          const st = String(t.order_status || t.orderStatus || t.task_status || t.taskStatus || t.status || "").trim().toUpperCase();
          return st === "WAITING_FOR_HANDOVER_SERAH";
        });
        if (validSubTasks.length === 0) return null;
        return { ...group, tasks: validSubTasks };
      }).filter(Boolean);
      
      if (reset) {
        setTasks(filteredTasks);
      } else {
        setTasks((prev) => [...prev, ...filteredTasks]);
      }
      
      setHasMore(rawTasks.length === 10);
      setPage(currentPage + 1);
      
    } catch (error: any) {
      if (!isBackground) {
        if (error.response?.status === 401) {
          setIsError("Sesi kedaluwarsa. Harap login kembali.");
        } else {
          setIsError(error.response?.data?.message || "Gagal memuat daftar tugas.");
        }
      }
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  };

  // Reset when search changes
  useEffect(() => {
    fetchTasks(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

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
    [hasMore, isLoading, page, debouncedSearch]
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
    <div className="flex h-screen bg-background">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto bg-surface">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                Tertunda
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-100 text-xs font-semibold text-pink-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                  Real-time
                </span>
              </h1>
              <p className="text-gray-500 mt-1">Daftar paket tertunda</p>
            </div>
            <button
              onClick={() => fetchTasks(true, false)}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-pink-600 hover:border-pink-200 transition-all shadow-xs flex items-center gap-2 text-sm font-semibold disabled:opacity-60"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-pink-600" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-shadow shadow-sm"
              placeholder=""
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
              <TertundaCard 
                key={task.group || index} 
                tasklist={task} 
                onClickDetail={() => openDetail(task)} 
                onPrint={() => openPrint(task)}
              />
            ))}

            {!isLoading && tasks.length === 0 && !isError && (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200 mt-4">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-800">Tidak ada paket tertunda</h3>
                <p className="text-gray-500 mt-1 max-w-xs mx-auto text-sm">
                  Saat ini tidak ada paket tertunda.
                </p>
              </div>
            )}

            <div ref={observerTarget} className="h-10 w-full flex items-center justify-center mt-4">
              {isLoading && (
                <div className="flex items-center gap-2 text-pink-600 font-medium">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memuat data...</span>
                </div>
              )}
            </div>
          </div>

      <TaskDetailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tasklist={selectedTask}
        activeTab={"TERTUNDA"}
      />
      
      <PrintAWBModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        tasklist={taskToPrint}
      />
        </div>
      </main>
    </div>
  );
}
