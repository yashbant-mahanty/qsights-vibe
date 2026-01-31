"use client";

export default function EventsContent() {
  return (
    <div className="p-6">
      <iframe
        src="/activities"
        className="w-full h-[calc(100vh-12rem)] border-0"
        title="Events"
      />
    </div>
  );
}
