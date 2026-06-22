import React from "react";
import TasklistClient from "./TasklistClient";

export const metadata = {
  title: "Tasklist - Mitraaja",
  description: "Kelola daftar tugas penjemputan paket Anteraja",
};

export default function TasklistPage() {
  return <TasklistClient />;
}
