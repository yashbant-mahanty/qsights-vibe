"use client";

export default function ReportsContent() {
  return (
    <div className="p-6">
      <iframe
        src="/analytics"
        className="w-full h-[calc(100vh-12rem)] border-0"
        title="Reports"
      />
    </div>
  );
}
