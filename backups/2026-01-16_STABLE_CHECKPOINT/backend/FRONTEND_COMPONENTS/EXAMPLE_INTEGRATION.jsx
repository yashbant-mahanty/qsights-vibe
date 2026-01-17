/**
 * Example Integration: ActivityLinksMenu in Activities Page
 * 
 * This example shows how to integrate the ActivityLinksMenu component
 * into your activities page, replacing the Preview button.
 */

import React, { useState, useEffect } from 'react';
import { 
  Edit, 
  Trash, 
  BarChart, 
  Users,
  Clock
} from 'lucide-react';
import ActivityLinksMenu from '@/components/activities/ActivityLinksMenu';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get auth token from cookies
  const getAuthToken = () => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('backendToken='))
      ?.split('=')[1];
    return token;
  };

  // Fetch activities
  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/activities', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      setActivities(data.data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (activityId) => {
    // Your edit logic
    window.location.href = `/activities/${activityId}/edit`;
  };

  const handleViewResults = (activityId) => {
    // Your results logic
    window.location.href = `/activities/${activityId}/results`;
  };

  const handleViewParticipants = (activityId) => {
    // Your participants logic
    window.location.href = `/activities/${activityId}/notifications`;
  };

  const handleDelete = async (activityId) => {
    if (confirm('Are you sure you want to delete this activity?')) {
      // Your delete logic
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading activities...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
        <p className="text-gray-600 mt-1">Manage your activities and share links</p>
      </div>

      {/* Activities Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activity Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participants
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Responses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timeline
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.map((activity) => (
              <tr key={activity.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {activity.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {activity.type}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    activity.status === 'live' ? 'bg-green-100 text-green-800' :
                    activity.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    activity.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {activity.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {activity.participants_count || 0}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {activity.responses_count || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {activity.start_date ? new Date(activity.start_date).toLocaleDateString() : 'Not set'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    {/* 
                      ✅ NEW: Activity Links Button 
                      This replaces the old Preview button
                    */}
                    <ActivityLinksMenu 
                      activityId={activity.id}
                      authToken={getAuthToken()}
                      apiUrl="http://localhost:8000/api"
                    />

                    {/* Edit Button */}
                    <button
                      onClick={() => handleEdit(activity.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Activity"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* View Results Button */}
                    <button
                      onClick={() => handleViewResults(activity.id)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="View Results"
                    >
                      <BarChart className="w-4 h-4" />
                    </button>

                    {/* View Participants Button */}
                    <button
                      onClick={() => handleViewParticipants(activity.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="View Participants"
                    >
                      <Users className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(activity.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete Activity"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {activities.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No activities found. Create your first activity to get started.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Integration Notes:
 * 
 * 1. Import the ActivityLinksMenu component at the top
 * 2. Replace any existing Preview button with ActivityLinksMenu
 * 3. Pass required props: activityId and authToken
 * 4. Optionally pass apiUrl if different from default
 * 
 * The component will:
 * - Show a "Links" button in the actions column
 * - Open a dropdown with 3 link types when clicked
 * - Allow one-click copying of each link
 * - Handle all errors and loading states internally
 * 
 * That's it! The rest is handled by the component.
 */
