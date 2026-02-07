"use client";

export default function ParticipantsContent() {
  return (
    <div className="p-6">
      <iframe
        src="/participants"
        className="w-full h-[calc(100vh-12rem)] border-0"
        title="Participants"
      />
    </div>
  );
}
