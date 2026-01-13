"use client";

import React, { useState } from "react";
import {
  GripVertical,
  Plus,
  X,
  Mail,
  User,
  Phone,
  MapPin,
  Building,
  Calendar,
  Hash,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FormField {
  id: string;
  name?: string;
  type: "text" | "email" | "phone" | "number" | "date" | "textarea" | "select" | "address" | "organization";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select fields
  order: number;
  isMandatory?: boolean; // For Name and Email fields
}

interface RegistrationFormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

const FIELD_TYPES = [
  { type: "text" as const, label: "Text Field", icon: FileText, color: "bg-blue-100 text-blue-600" },
  { type: "phone" as const, label: "Phone Number", icon: Phone, color: "bg-green-100 text-green-600" },
  { type: "number" as const, label: "Number", icon: Hash, color: "bg-purple-100 text-purple-600" },
  { type: "date" as const, label: "Date", icon: Calendar, color: "bg-orange-100 text-orange-600" },
  { type: "textarea" as const, label: "Long Text", icon: FileText, color: "bg-pink-100 text-pink-600" },
  { type: "select" as const, label: "Dropdown", icon: ChevronDown, color: "bg-indigo-100 text-indigo-600" },
  { type: "address" as const, label: "Address", icon: MapPin, color: "bg-yellow-100 text-yellow-600" },
  { type: "organization" as const, label: "Organization", icon: Building, color: "bg-teal-100 text-teal-600" },
];

export default function RegistrationFormBuilder({
  fields,
  onChange,
}: RegistrationFormBuilderProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  // Separate mandatory and custom fields
  const mandatoryFields = fields.filter((f) => f.isMandatory);
  const customFields = fields.filter((f) => !f.isMandatory);

  const addField = (type: FormField["type"]) => {
    const newId = `field_${Date.now()}`;
    const newField: FormField = {
      id: newId,
      name: newId,
      type,
      label: `New ${type} field`,
      placeholder: "",
      required: false,
      order: fields.length,
      isMandatory: false,
    };

    if (type === "select") {
      newField.options = ["Option 1", "Option 2", "Option 3"];
    }

    onChange([...fields, newField]);
    setShowFieldPicker(false);
    setExpandedField(newField.id);
  };

  const removeField = (id: string) => {
    const updatedFields = fields.filter((f) => f.id !== id);
    // Re-order
    const reordered = updatedFields.map((f, idx) => ({ ...f, order: idx }));
    onChange(reordered);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    const updatedFields = fields.map((f) =>
      f.id === id ? { ...f, ...updates } : f
    );
    onChange(updatedFields);
  };

  const toggleRequired = (id: string) => {
    const field = fields.find((f) => f.id === id);
    if (field && !field.isMandatory) {
      updateField(id, { required: !field.required });
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...customFields];
    const draggedField = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedField);

    // Combine with mandatory fields and re-order
    const allFields = [
      ...mandatoryFields,
      ...newFields.map((f, idx) => ({ ...f, order: mandatoryFields.length + idx })),
    ];
    
    onChange(allFields);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const addSelectOption = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (field && field.options) {
      updateField(fieldId, {
        options: [...field.options, `Option ${field.options.length + 1}`],
      });
    }
  };

  const updateSelectOption = (fieldId: string, optionIndex: number, value: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (field && field.options) {
      const newOptions = [...field.options];
      newOptions[optionIndex] = value;
      updateField(fieldId, { options: newOptions });
    }
  };

  const removeSelectOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (field && field.options && field.options.length > 1) {
      const newOptions = field.options.filter((_, idx) => idx !== optionIndex);
      updateField(fieldId, { options: newOptions });
    }
  };

  const renderFieldIcon = (type: FormField["type"]) => {
    const fieldType = FIELD_TYPES.find((ft) => ft.type === type);
    if (!fieldType) {
      if (type === "email") return <Mail className="w-4 h-4" />;
      return <FileText className="w-4 h-4" />;
    }
    const Icon = fieldType.icon;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Mandatory Fields Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Mandatory Fields (Always Required)
          </h3>
        </div>
        <div className="space-y-2">
          {mandatoryFields.map((field) => (
            <div
              key={field.id}
              className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {field.type === "email" ? (
                    <Mail className="w-4 h-4 text-blue-600" />
                  ) : (
                    <User className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{field.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {field.type === "email" ? "Email validation enabled" : "Full name required"}
                  </p>
                </div>
                <div className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  Required
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Fields Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Custom Fields ({customFields.length})
          </h3>
          <button
            onClick={() => setShowFieldPicker(!showFieldPicker)}
            className="flex items-center gap-2 px-3 py-1.5 bg-qsights-blue text-white rounded-lg text-xs font-medium hover:bg-qsights-blue/90 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Field
          </button>
        </div>

        {/* Field Type Picker */}
        {showFieldPicker && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-3">Select Field Type:</p>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map((fieldType) => {
                const Icon = fieldType.icon;
                return (
                  <button
                    key={fieldType.type}
                    onClick={() => addField(fieldType.type)}
                    className={`flex items-center gap-2 p-3 ${fieldType.color} rounded-lg hover:opacity-80 transition-all text-left`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{fieldType.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Fields List */}
        {customFields.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No custom fields added yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Click "Add Field" to create custom registration fields
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {customFields.map((field, index) => {
              const isExpanded = expandedField === field.id;
              return (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white border-2 rounded-lg transition-all ${
                    draggedIndex === index
                      ? "border-blue-400 shadow-lg opacity-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* Field Header */}
                  <div className="p-3 flex items-center gap-3">
                    <button className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {renderFieldIcon(field.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {field.label || "Untitled Field"}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{field.type}</p>
                    </div>
                    <button
                      onClick={() => toggleRequired(field.id)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        field.required
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {field.required ? "Required" : "Optional"}
                    </button>
                    <button
                      onClick={() =>
                        setExpandedField(isExpanded ? null : field.id)
                      }
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={() => removeField(field.id)}
                      className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Field Configuration (Expanded) */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t border-gray-200">
                      <div className="mt-3 space-y-3">
                        {/* Label */}
                        <div>
                          <Label className="text-xs text-gray-700 mb-1.5">
                            Field Label
                          </Label>
                          <Input
                            value={field.label}
                            onChange={(e) =>
                              updateField(field.id, { label: e.target.value })
                            }
                            placeholder="Enter field label"
                            className="text-sm"
                          />
                        </div>

                        {/* Placeholder */}
                        <div>
                          <Label className="text-xs text-gray-700 mb-1.5">
                            Placeholder Text
                          </Label>
                          <Input
                            value={field.placeholder || ""}
                            onChange={(e) =>
                              updateField(field.id, {
                                placeholder: e.target.value,
                              })
                            }
                            placeholder="Enter placeholder"
                            className="text-sm"
                          />
                        </div>

                        {/* Select Options */}
                        {field.type === "select" && field.options && (
                          <div>
                            <Label className="text-xs text-gray-700 mb-1.5">
                              Dropdown Options
                            </Label>
                            <div className="space-y-2">
                              {field.options.map((option, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <Input
                                    value={option}
                                    onChange={(e) =>
                                      updateSelectOption(
                                        field.id,
                                        optIdx,
                                        e.target.value
                                      )
                                    }
                                    placeholder={`Option ${optIdx + 1}`}
                                    className="text-sm flex-1"
                                  />
                                  <button
                                    onClick={() =>
                                      removeSelectOption(field.id, optIdx)
                                    }
                                    disabled={field.options!.length <= 1}
                                    className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => addSelectOption(field.id)}
                                className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Add Option
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Total Fields:</span>
          <span className="font-semibold text-gray-900">{fields.length}</span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-gray-600">Required Fields:</span>
          <span className="font-semibold text-gray-900">
            {fields.filter((f) => f.required || f.isMandatory).length}
          </span>
        </div>
      </div>
    </div>
  );
}
