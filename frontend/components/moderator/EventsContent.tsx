"use client";

export default function EventsContent() {
  // This will render the actual activities page in an iframe-like fashion
  // Or we can import the activities page content directly
  
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
