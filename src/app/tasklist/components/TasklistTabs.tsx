"use client";

import React from "react";
import { motion } from "framer-motion";

interface TasklistTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TABS = [
  { id: "ACTIVE", label: "Hari Ini" },
  { id: "DELAY", label: "Tertunda" },
  { id: "COMPLETED", label: "Riwayat" },
];

export default function TasklistTabs({ activeTab, setActiveTab }: TasklistTabsProps) {
  return (
    <div className="flex gap-2 p-1.5 bg-gray-100/80 backdrop-blur-md rounded-2xl mb-6 overflow-x-auto no-scrollbar">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap z-10 ${
              isActive ? "text-blue-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 bg-white shadow-sm rounded-xl -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
