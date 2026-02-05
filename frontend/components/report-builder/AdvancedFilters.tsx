'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Calendar, Filter } from 'lucide-react';

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string | string[];
  type: 'demographic' | 'response' | 'time' | 'status';
}

interface AdvancedFiltersProps {
  availableFields: {
    demographics: Array<{ id: string; name: string; type: string }>;
    questions: Array<{ id: string; question: string; type: string }>;
  };
  onFiltersChange: (filters: FilterCondition[]) => void;
}

const OPERATORS = {
  text: [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'not_equals', label: 'Not equals' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'between', label: 'Between' },
  ],
  select: [
    { value: 'in', label: 'Is any of' },
    { value: 'not_in', label: 'Is none of' },
  ],
  date: [
    { value: 'on', label: 'On' },
    { value: 'after', label: 'After' },
    { value: 'before', label: 'Before' },
    { value: 'between', label: 'Between' },
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_90_days', label: 'Last 90 days' },
  ],
};

export default function AdvancedFilters({ availableFields, onFiltersChange }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [showQuickFilters, setShowQuickFilters] = useState(true);

  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: `filter-${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
      type: 'demographic',
    };
    const updated = [...filters, newFilter];
    setFilters(updated);
    onFiltersChange(updated);
  };

  const removeFilter = (id: string) => {
    const updated = filters.filter((f) => f.id !== id);
    setFilters(updated);
    onFiltersChange(updated);
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    const updated = filters.map((f) => (f.id === id ? { ...f, ...updates } : f));
    setFilters(updated);
    onFiltersChange(updated);
  };

  const getOperatorsForField = (field: string) => {
    const demographicField = availableFields.demographics.find((f) => f.id === field);
    const questionField = availableFields.questions.find((q) => q.id === field);

    if (demographicField) {
      if (demographicField.type === 'date') return OPERATORS.date;
      if (demographicField.type === 'number') return OPERATORS.number;
      if (demographicField.type === 'select') return OPERATORS.select;
    }

    if (questionField) {
      if (questionField.type === 'multiple_choice' || questionField.type === 'checkbox') {
        return OPERATORS.select;
      }
      if (questionField.type === 'rating' || questionField.type === 'number') {
        return OPERATORS.number;
      }
    }

    return OPERATORS.text;
  };

  const clearAllFilters = () => {
    setFilters([]);
    onFiltersChange([]);
  };

  // Quick filter presets
  const applyQuickFilter = (preset: string) => {
    let newFilters: FilterCondition[] = [];

    switch (preset) {
      case 'completed':
        newFilters = [
          {
            id: `filter-${Date.now()}`,
            field: 'status',
            operator: 'equals',
            value: 'completed',
            type: 'status',
          },
        ];
        break;
      case 'incomplete':
        newFilters = [
          {
            id: `filter-${Date.now()}`,
            field: 'status',
            operator: 'equals',
            value: 'incomplete',
            type: 'status',
          },
        ];
        break;
      case 'last_7_days':
        newFilters = [
          {
            id: `filter-${Date.now()}`,
            field: 'submitted_at',
            operator: 'last_7_days',
            value: '',
            type: 'time',
          },
        ];
        break;
      case 'last_30_days':
        newFilters = [
          {
            id: `filter-${Date.now()}`,
            field: 'submitted_at',
            operator: 'last_30_days',
            value: '',
            type: 'time',
          },
        ];
        break;
    }

    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-qsights-cyan" />
            <CardTitle>Advanced Filters</CardTitle>
          </div>
          {filters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Filters */}
        {showQuickFilters && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Quick Filters</Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-qsights-cyan hover:text-white"
                onClick={() => applyQuickFilter('completed')}
              >
                Completed Only
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-qsights-cyan hover:text-white"
                onClick={() => applyQuickFilter('incomplete')}
              >
                Incomplete Only
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-qsights-cyan hover:text-white"
                onClick={() => applyQuickFilter('last_7_days')}
              >
                Last 7 Days
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-qsights-cyan hover:text-white"
                onClick={() => applyQuickFilter('last_30_days')}
              >
                Last 30 Days
              </Badge>
            </div>
          </div>
        )}

        {/* Custom Filters */}
        <div className="space-y-3">
          {filters.map((filter) => (
            <div key={filter.id} className="flex gap-2 items-end p-3 border rounded-lg bg-gray-50">
              <div className="flex-1 grid grid-cols-3 gap-2">
                {/* Field Selection */}
                <div>
                  <Label className="text-xs">Field</Label>
                  <Select
                    value={filter.field}
                    onValueChange={(value) => updateFilter(filter.id, { field: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500">Demographics</div>
                      {availableFields.demographics.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.name}
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500 border-t mt-1 pt-2">
                        Questions
                      </div>
                      {availableFields.questions.slice(0, 10).map((question) => (
                        <SelectItem key={question.id} value={question.id}>
                          {question.question.substring(0, 50)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Operator Selection */}
                <div>
                  <Label className="text-xs">Operator</Label>
                  <Select
                    value={filter.operator}
                    onValueChange={(value) => updateFilter(filter.id, { operator: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getOperatorsForField(filter.field).map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Value Input */}
                <div>
                  <Label className="text-xs">Value</Label>
                  <Input
                    placeholder="Enter value"
                    value={filter.value as string}
                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter(filter.id)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add Filter Button */}
        <Button variant="outline" size="sm" onClick={addFilter} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Filter Condition
        </Button>

        {/* Active Filters Summary */}
        {filters.length > 0 && (
          <div className="pt-3 border-t">
            <div className="text-xs text-gray-600 mb-2">Active Filters ({filters.length})</div>
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => {
                const field =
                  availableFields.demographics.find((f) => f.id === filter.field) ||
                  availableFields.questions.find((q) => q.id === filter.field);
                return (
                  <Badge key={filter.id} variant="secondary" className="text-xs">
                    {field?.name || filter.field} {filter.operator} {filter.value}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
