"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  Activity,
  Calendar,
  FileCheck,
  Search,
} from "lucide-react";
import { programRolesApi } from "@/lib/api";

interface CreateRoleWizardProps {
  programId: string;
  existingRole?: any | null;
  onClose: () => void;
}

interface StepperItem {
  number: number;
  title: string;
  icon: React.ReactNode;
}

export default function CreateRoleWizard({
  programId,
  existingRole,
  onClose,
}: CreateRoleWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableEvents, setAvailableEvents] = useState<any[]>([]);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  
  // Form state
  const [roleName, setRoleName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [description, setDescription] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps: StepperItem[] = [
    { number: 1, title: "Role Details", icon: <User className="w-5 h-5" /> },
    { number: 2, title: "Services", icon: <Activity className="w-5 h-5" /> },
    { number: 3, title: "Events", icon: <Calendar className="w-5 h-5" /> },
    { number: 4, title: "Review", icon: <FileCheck className="w-5 h-5" /> },
  ];

  useEffect(() => {
    console.log("🚀 CreateRoleWizard mounted with programId:", programId);
    if (programId) {
      loadServicesAndEvents();
    } else {
      console.error("❌ No programId provided to wizard!");
    }
    if (existingRole) {
      populateExistingRole();
    }
  }, [existingRole, programId]);

  async function loadServicesAndEvents() {
    console.log("📡 Fetching services and events for programId:", programId);
    try {
      const [services, events] = await Promise.all([
        programRolesApi.getServices(programId),
        programRolesApi.getEvents(programId),
      ]);
      console.log("✅ Received services:", services?.length, "events:", events?.length);
      setAvailableServices(services || []);
      setAvailableEvents(events || []);
    } catch (error) {
      console.error("❌ Failed to load services and events:", error);
      alert(`Failed to load services: ${error}`);
    }
  }

  function populateExistingRole() {
    if (!existingRole) return;
    
    setRoleName(existingRole.role_name || "");
    setUsername(existingRole.username || "");
    setEmail(existingRole.email || "");
    setDescription(existingRole.description || "");
    setSelectedServices(existingRole.activities?.map((a: any) => a.id) || []);
    setSelectedEvents(existingRole.events?.map((e: any) => e.id) || []);
  }

  function validateStep(step: number): boolean {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!roleName.trim()) newErrors.roleName = "Role name is required";
      if (!username.trim()) newErrors.username = "Username is required";
      if (!email.trim()) newErrors.email = "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors.email = "Invalid email format";
      }
      if (!existingRole && !password.trim()) {
        newErrors.password = "Password is required";
      }
      if (password && password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (!validateStep(currentStep)) {
      return;
    }
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  function toggleService(serviceId: string) {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  }

  function toggleEvent(eventId: string) {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  }

  function toggleAllServices(category: string) {
    const servicesInCategory = filteredServices.filter(s => s.category === category);
    const allSelected = servicesInCategory.every(s => selectedServices.includes(s.id));
    
    if (allSelected) {
      setSelectedServices(prev => prev.filter(id => !servicesInCategory.find(s => s.id === id)));
    } else {
      setSelectedServices(prev => [...new Set([...prev, ...servicesInCategory.map(s => s.id)])]);
    }
  }

  const filteredServices = availableServices.filter(service =>
    service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
    service.category.toLowerCase().includes(serviceSearchQuery.toLowerCase())
  );

  const filteredEvents = availableEvents.filter(event =>
    event.name.toLowerCase().includes(eventSearchQuery.toLowerCase())
  );

  const servicesByCategory = filteredServices.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, any[]>);

  async function handleSubmit() {
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }

    try {
      setLoading(true);

      const roleData = {
        role_name: roleName,
        username: username,
        email: email,
        password: password || undefined,
        description: description,
        service_ids: selectedServices,
        event_ids: selectedEvents,
      };

      if (existingRole) {
        await programRolesApi.update(programId, existingRole.id, roleData);
        alert("Role updated successfully!");
      } else {
        await programRolesApi.create(programId, roleData);
        alert("Role created successfully! An email has been sent with credentials.");
      }

      onClose();
    } catch (error: any) {
      console.error("Failed to save role:", error);
      const message = error.response?.data?.message || error.message || "Failed to save role";
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {existingRole ? "Edit Role" : "Create New Role"}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8 px-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    step.number < currentStep
                      ? "bg-green-500 text-white shadow-lg"
                      : step.number === currentStep
                      ? "bg-blue-600 text-white shadow-lg scale-110"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step.number < currentStep ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span
                  className={`text-sm mt-2 font-medium ${
                    step.number === currentStep
                      ? "text-blue-600"
                      : step.number < currentStep
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 rounded-full transition-all ${
                    step.number < currentStep ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-6 px-2">
          {/* Step 1: Role Details */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <h3 className="text-xl font-semibold text-gray-900">Role Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="roleName" className="text-sm font-medium">Role Name *</Label>
                  <Input
                    id="roleName"
                    placeholder="e.g., Trainer, Evaluator, Observer"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className={`mt-1 ${errors.roleName ? "border-red-500" : ""}`}
                  />
                  {errors.roleName && (
                    <p className="text-sm text-red-600 mt-1">{errors.roleName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="username" className="text-sm font-medium">Username *</Label>
                  <Input
                    id="username"
                    placeholder="e.g., trainer.john"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`mt-1 ${errors.username ? "border-red-500" : ""}`}
                  />
                  {errors.username && (
                    <p className="text-sm text-red-600 mt-1">{errors.username}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`mt-1 ${errors.email ? "border-red-500" : ""}`}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password {!existingRole && "*"}
                    {existingRole && " (leave blank to keep current)"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`mt-1 ${errors.password ? "border-red-500" : ""}`}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this role and its responsibilities..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 2: Services */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Assign Services</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Select the system permissions and features this role can access
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-600">
                    Selected: {selectedServices.length} service(s)
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search services..."
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {availableServices.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No services available</p>
                  <p className="text-sm text-gray-500 mt-1">Services will appear here once configured</p>
                </div>
              ) : (
                <div className="max-h-[450px] overflow-y-auto border rounded-lg bg-white">
                  {Object.entries(servicesByCategory).map(([category, services]) => (
                    <div key={category} className="border-b last:border-b-0">
                      <div className="sticky top-0 bg-gray-50 px-4 py-3 flex items-center justify-between border-b z-10">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          {category}
                          <span className="text-xs font-normal text-gray-500">
                            ({(services as any[]).length})
                          </span>
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAllServices(category)}
                          className="h-7 text-xs"
                        >
                          {(services as any[]).every((s: any) => selectedServices.includes(s.id)) ? "Deselect All" : "Select All"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-px bg-gray-200 p-px">
                        {(services as any[]).map((service: any) => (
                          <div
                            key={service.id}
                            className="bg-white p-3 hover:bg-blue-50 cursor-pointer transition-colors"
                            onClick={() => toggleService(service.id)}
                          >
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                checked={selectedServices.includes(service.id)}
                                onCheckedChange={() => toggleService(service.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 leading-tight">
                                  {service.name}
                                </div>
                                {service.description && (
                                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {service.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Events */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Assign Events</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Select which activities/events this role can access
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-600">
                    Selected: {selectedEvents.length} event(s)
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search events..."
                  value={eventSearchQuery}
                  onChange={(e) => setEventSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {availableEvents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No events available</p>
                  <p className="text-sm text-gray-500 mt-1">Create events in this program to assign them to roles</p>
                </div>
              ) : (
                <div className="max-h-[450px] overflow-y-auto border rounded-lg bg-white">
                  <div className="grid grid-cols-2 gap-px bg-gray-200 p-px">
                    {filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        className="bg-white p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => toggleEvent(event.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={selectedEvents.includes(event.id)}
                            onCheckedChange={() => toggleEvent(event.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">
                              {event.name}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                                {event.type}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${
                                event.status === 'live' ? 'bg-green-100 text-green-700' :
                                event.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                                event.status === 'upcoming' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {event.status}
                              </span>
                              {event.start_date && (
                                <span>
                                  {new Date(event.start_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">Review & Confirm</h3>
              
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 space-y-6 border border-gray-200">
                <div className="bg-white rounded-lg p-5 shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Role Information
                  </h4>
                  <dl className="space-y-3">
                    <div className="flex justify-between items-center">
                      <dt className="text-sm text-gray-600">Role Name:</dt>
                      <dd className="text-sm font-semibold text-gray-900">{roleName}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-sm text-gray-600">Username:</dt>
                      <dd className="text-sm font-medium text-gray-900">{username}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-sm text-gray-600">Email:</dt>
                      <dd className="text-sm font-medium text-gray-900">{email}</dd>
                    </div>
                    {description && (
                      <div className="pt-2 border-t">
                        <dt className="text-sm text-gray-600 mb-1">Description:</dt>
                        <dd className="text-sm text-gray-700">{description}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="bg-white rounded-lg p-5 shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    Assigned Services
                    <span className="ml-auto text-sm font-normal bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {selectedServices.length} selected
                    </span>
                  </h4>
                  {selectedServices.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {selectedServices.map((serviceId) => {
                        const service = availableServices.find(s => s.id === serviceId);
                        return service ? (
                          <div key={serviceId} className="text-xs bg-gray-50 px-3 py-2 rounded border border-gray-200">
                            <div className="font-medium text-gray-900">{service.name}</div>
                            <div className="text-gray-500 text-[10px] mt-0.5">{service.category}</div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No services selected</p>
                  )}
                </div>

                <div className="bg-white rounded-lg p-5 shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Assigned Events
                    <span className="ml-auto text-sm font-normal bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {selectedEvents.length} selected
                    </span>
                  </h4>
                  {selectedEvents.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {selectedEvents.map((eventId) => {
                        const event = availableEvents.find(e => e.id === eventId);
                        return event ? (
                          <div key={eventId} className="text-xs bg-gray-50 px-3 py-2 rounded border border-gray-200">
                            <div className="font-medium text-gray-900">{event.name}</div>
                            <div className="text-gray-500 text-[10px] mt-0.5 flex items-center gap-2">
                              <span>{event.type}</span>
                              <span>•</span>
                              <span>{event.status}</span>
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No events selected</p>
                  )}
                </div>
              </div>

              {!existingRole && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 flex items-start gap-2">
                    <span className="text-lg">📧</span>
                    <span>
                      An email will be sent to <strong>{email}</strong> with login credentials
                      after the role is created successfully.
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : handleBack}
            disabled={loading}
            className="px-6"
          >
            {currentStep === 1 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </>
            )}
          </Button>

          <Button
            onClick={currentStep === 4 ? handleSubmit : handleNext}
            disabled={loading}
            className="px-6 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              "Saving..."
            ) : currentStep === 4 ? (
              existingRole ? "Update Role" : "Create Role"
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
