'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canCreate } from '@/lib/permissions';

interface Event {
  id: number;
  title: string;
  activity_type: string;
  start_date: string;
  end_date: string;
  status: string;
}

export default function ProgramEventsPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const programId = params?.programId as string;
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`/api/activities?program_id=${programId}`);
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        }
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [programId]);

  const canCreateEvent = canCreate(currentUser, 'event');

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        {canCreateEvent && (
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create Event
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No events found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {events.map((event) => (
              <div key={event.id} className="p-4 hover:bg-gray-50">
                <h3 className="font-medium text-gray-900">{event.title}</h3>
                <div className="text-sm text-gray-600 mt-1">
                  Type: {event.activity_type} | Status: {event.status}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
