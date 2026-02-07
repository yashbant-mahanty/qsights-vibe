"use client";

// This wrapper renders the Activities page content WITHOUT its AppLayout wrapper
// to avoid nested layouts when used in the unified tab interface

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Download,
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
  Mail,
  Palette,
  Link2,
  UserPlus,
  ExternalLink,
  Bell,
  BellRing,
  X,
  QrCode,
} from "lucide-react";
import { activitiesApi, activityApprovalsApi, type Activity, fetchWithAuth } from "@/lib/api";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import DuplicateConfirmationModal from "@/components/duplicate-confirmation-modal";
import { toast } from "@/components/ui/toast";
import { QRCodeModal } from "@/components/ui/qr-code-modal";

export default function ActivitiesContentWrapper() {
  // Import the actual ActivitiesPage component and render its return value
  // This is a workaround to use the same logic without the AppLayout wrapper
  const ActivitiesPage = require("@/app/activities/page").default;
  
  // Render the activities page - it will use our parent layout
  return <ActivitiesPage />;
}
