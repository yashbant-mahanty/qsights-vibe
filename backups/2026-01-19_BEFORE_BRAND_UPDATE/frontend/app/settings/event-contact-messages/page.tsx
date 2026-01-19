"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import {
  Mail,
  MessageCircle,
  Calendar,
  Eye,
  CheckCircle,
  Clock,
  User,
  FileText,
  Trash2,
  X,
  Reply,
} from "lucide-react";
import { eventContactMessagesApi } from "@/lib/api";

interface EventContactMessage {
  id: string;
  activity_id: string;
  activity_name: string;
  user_type: "participant" | "anonymous";
  participant_id: string | null;
  name: string;
  email: string;
  message: string;
  status: "new" | "read" | "responded";
  created_at: string;
  updated_at: string;
}

export default function EventContactMessagesPage() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<EventContactMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<EventContactMessage | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [statusFilter]);

  async function loadMessages() {
    try {
      setLoading(true);
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const data = await eventContactMessagesApi.getAll(params);
      setMessages(data.data?.data || data.data || []);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(id: string) {
    try {
      await eventContactMessagesApi.markAsRead(id);
      toast({
        title: "Success",
        description: "Message marked as read",
        variant: "success",
      });
      loadMessages();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "error",
      });
    }
  }

  async function handleMarkAsResponded(id: string) {
    try {
      await eventContactMessagesApi.markAsResponded(id);
      toast({
        title: "Success",
        description: "Message marked as responded",
        variant: "success",
      });
      loadMessages();
      if (selectedMessage?.id === id) {
        setSelectedMessage({ ...selectedMessage, status: "responded" });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "error",
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      await eventContactMessagesApi.delete(id);
      toast({
        title: "Success",
        description: "Message deleted successfully",
        variant: "success",
      });
      loadMessages();
      if (selectedMessage?.id === id) {
        setShowModal(false);
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "error",
      });
    }
  }

  function viewMessage(message: EventContactMessage) {
    setSelectedMessage(message);
    setShowModal(true);
    if (message.status === "new") {
      handleMarkAsRead(message.id);
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      new: "bg-yellow-100 text-yellow-700",
      read: "bg-blue-100 text-blue-700",
      responded: "bg-green-100 text-green-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  }

  function getStatusIcon(status: string) {
    const icons: Record<string, any> = {
      new: Clock,
      read: Eye,
      responded: CheckCircle,
    };
    const Icon = icons[status] || Clock;
    return <Icon className="w-4 h-4 inline mr-1" />;
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const stats = {
    new: messages.filter((m) => m.status === "new").length,
    read: messages.filter((m) => m.status === "read").length,
    responded: messages.filter((m) => m.status === "responded").length,
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Event Contact Messages</h1>
            <p className="text-sm text-gray-500 mt-1">
              Messages from participants during events
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue"
          >
            <option value="all">All Messages</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="responded">Responded</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">New</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.new}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Read</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.read}</p>
                </div>
                <Eye className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Responded</p>
                  <p className="text-2xl font-bold text-green-600">{stats.responded}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Messages List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-qsights-blue" />
              Contact Messages ({messages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No messages found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      message.status === "new" ? "bg-yellow-50" : ""
                    }`}
                    onClick={() => viewMessage(message)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{message.name}</span>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              message.user_type === "anonymous"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-indigo-100 text-indigo-600"
                            }`}
                          >
                            {message.user_type === "anonymous" ? "Anonymous" : "Participant"}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                              message.status
                            )}`}
                          >
                            {getStatusIcon(message.status)}
                            {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {message.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {message.activity_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{message.message}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(message.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Detail Modal */}
      {showModal && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Message Details</h2>
                    <p className="text-sm text-white/80">{selectedMessage.activity_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-4">
                {/* Sender Info */}
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedMessage.name}</p>
                      <a
                        href={`mailto:${selectedMessage.email}`}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        {selectedMessage.email}
                      </a>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(
                        selectedMessage.status
                      )}`}
                    >
                      {getStatusIcon(selectedMessage.status)}
                      {selectedMessage.status.charAt(0).toUpperCase() +
                        selectedMessage.status.slice(1)}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(selectedMessage.created_at)}
                    </p>
                  </div>
                </div>

                {/* Event Info */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="w-4 h-4" />
                  <span>Event: {selectedMessage.activity_name}</span>
                  <span className="mx-2">•</span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      selectedMessage.user_type === "anonymous"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-indigo-100 text-indigo-600"
                    }`}
                  >
                    {selectedMessage.user_type === "anonymous" ? "Anonymous User" : "Participant"}
                  </span>
                </div>

                {/* Message */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Message</h4>
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
              <div className="flex items-center gap-3">
                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.activity_name}`}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Reply className="w-4 h-4" />
                  Reply via Email
                </a>
                {selectedMessage.status !== "responded" && (
                  <button
                    onClick={() => handleMarkAsResponded(selectedMessage.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Responded
                  </button>
                )}
              </div>
              <button
                onClick={() => handleDelete(selectedMessage.id)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
