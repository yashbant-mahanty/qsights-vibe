'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  LayoutGrid,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
} from 'lucide-react';

interface Field {
  id: string;
  name: string;
  type: 'dimension' | 'measure';
  dataType: 'text' | 'number' | 'date' | 'boolean';
  category: 'demographic' | 'question' | 'system';
}

interface SelectedField {
  field: Field;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
}

interface DragDropReportBuilderProps {
  availableFields: {
    dimensions: Field[];
    measures: Field[];
  };
  selectedDimensions: SelectedField[];
  selectedMeasures: SelectedField[];
  onDimensionsChange: (dimensions: SelectedField[]) => void;
  onMeasuresChange: (measures: SelectedField[]) => void;
  onGenerateReport: () => void;
}

export default function DragDropReportBuilder({
  availableFields,
  selectedDimensions,
  selectedMeasures,
  onDimensionsChange,
  onMeasuresChange,
  onGenerateReport,
}: DragDropReportBuilderProps) {
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    // Dropping onto dimensions area
    if (destination.droppableId === 'dimensions') {
      const field = availableFields.dimensions.find(
        (f) => f.id === result.draggableId
      );
      if (field && !selectedDimensions.find((d) => d.field.id === field.id)) {
        onDimensionsChange([...selectedDimensions, { field }]);
      }
    }

    // Dropping onto measures area
    if (destination.droppableId === 'measures') {
      const field = availableFields.measures.find(
        (f) => f.id === result.draggableId
      );
      if (field && !selectedMeasures.find((m) => m.field.id === field.id)) {
        onMeasuresChange([
          ...selectedMeasures,
          { field, aggregation: 'count' },
        ]);
      }
    }

    // Reordering within dimensions
    if (
      source.droppableId === 'dimensions' &&
      destination.droppableId === 'dimensions'
    ) {
      const reordered = Array.from(selectedDimensions);
      const [removed] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, removed);
      onDimensionsChange(reordered);
    }

    // Reordering within measures
    if (
      source.droppableId === 'measures' &&
      destination.droppableId === 'measures'
    ) {
      const reordered = Array.from(selectedMeasures);
      const [removed] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, removed);
      onMeasuresChange(reordered);
    }
  };

  const removeDimension = (fieldId: string) => {
    onDimensionsChange(selectedDimensions.filter((d) => d.field.id !== fieldId));
  };

  const removeMeasure = (fieldId: string) => {
    onMeasuresChange(selectedMeasures.filter((m) => m.field.id !== fieldId));
  };

  const updateMeasureAggregation = (
    fieldId: string,
    aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max'
  ) => {
    onMeasuresChange(
      selectedMeasures.map((m) =>
        m.field.id === fieldId ? { ...m, aggregation } : m
      )
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'demographic':
        return <Users className="w-3 h-3" />;
      case 'question':
        return <LayoutGrid className="w-3 h-3" />;
      case 'system':
        return <Calendar className="w-3 h-3" />;
      default:
        return <LayoutGrid className="w-3 h-3" />;
    }
  };

  const suggestChartType = () => {
    if (selectedDimensions.length === 0 && selectedMeasures.length === 1) {
      return 'card';
    }
    if (selectedDimensions.length === 1 && selectedMeasures.length === 1) {
      const dimension = selectedDimensions[0];
      if (dimension.field.dataType === 'date') return 'line';
      return 'bar';
    }
    if (selectedDimensions.length === 1 && selectedMeasures.length > 1) {
      return 'bar';
    }
    return 'table';
  };

  const chartType = suggestChartType();

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-12 gap-4">
        {/* Fields Panel */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Available Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="dimensions" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dimensions" className="text-xs">
                    Dimensions
                  </TabsTrigger>
                  <TabsTrigger value="measures" className="text-xs">
                    Measures
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dimensions" className="space-y-1 mt-3">
                  {availableFields.dimensions.map((field) => (
                    <Draggable key={field.id} draggableId={field.id} index={0}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`p-2 border rounded text-xs cursor-move hover:bg-blue-50 transition ${
                            snapshot.isDragging ? 'bg-blue-100 shadow-lg' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(field.category)}
                            <span className="flex-1 font-medium">{field.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1">
                              {field.dataType}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                </TabsContent>

                <TabsContent value="measures" className="space-y-1 mt-3">
                  {availableFields.measures.map((field) => (
                    <Draggable key={field.id} draggableId={field.id} index={0}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`p-2 border rounded text-xs cursor-move hover:bg-green-50 transition ${
                            snapshot.isDragging ? 'bg-green-100 shadow-lg' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" />
                            <span className="flex-1 font-medium">{field.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1">
                              {field.dataType}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Report Configuration Panel */}
        <div className="col-span-9 space-y-4">
          {/* Drop Zones */}
          <div className="grid grid-cols-2 gap-4">
            {/* Dimensions Drop Zone */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-blue-500" />
                  Dimensions (Rows/Columns)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="dimensions">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] p-3 border-2 border-dashed rounded-lg transition ${
                        snapshot.isDraggingOver
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedDimensions.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm py-8">
                          Drag dimensions here to group data
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedDimensions.map((dim, index) => (
                            <Draggable
                              key={dim.field.id}
                              draggableId={`dim-${dim.field.id}`}
                              index={index}
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="flex items-center justify-between p-2 bg-blue-100 border border-blue-200 rounded"
                                >
                                  <span className="text-sm font-medium">{dim.field.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeDimension(dim.field.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    ×
                                  </Button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>

            {/* Measures Drop Zone */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Measures (Values)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="measures">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] p-3 border-2 border-dashed rounded-lg transition ${
                        snapshot.isDraggingOver
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedMeasures.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm py-8">
                          Drag measures here to analyze data
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedMeasures.map((measure, index) => (
                            <Draggable
                              key={measure.field.id}
                              draggableId={`measure-${measure.field.id}`}
                              index={index}
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="flex items-center justify-between p-2 bg-green-100 border border-green-200 rounded"
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="text-sm font-medium">
                                      {measure.field.name}
                                    </span>
                                    <select
                                      className="text-xs border rounded px-1 py-0.5"
                                      value={measure.aggregation}
                                      onChange={(e) =>
                                        updateMeasureAggregation(
                                          measure.field.id,
                                          e.target.value as any
                                        )
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <option value="count">Count</option>
                                      <option value="sum">Sum</option>
                                      <option value="avg">Average</option>
                                      <option value="min">Min</option>
                                      <option value="max">Max</option>
                                    </select>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeMeasure(measure.field.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    ×
                                  </Button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>

          {/* Chart Type Suggestion & Generate */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600">Suggested Visualization:</div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {chartType === 'bar' && <BarChart3 className="w-3 h-3" />}
                    {chartType === 'pie' && <PieChart className="w-3 h-3" />}
                    {chartType === 'line' && <LineChart className="w-3 h-3" />}
                    {chartType === 'card' && <TrendingUp className="w-3 h-3" />}
                    <span className="capitalize">{chartType} Chart</span>
                  </Badge>
                </div>

                <Button
                  onClick={onGenerateReport}
                  disabled={selectedMeasures.length === 0}
                  className="bg-gradient-to-r from-qsights-cyan to-blue-600"
                >
                  Generate Report
                </Button>
              </div>

              {selectedMeasures.length === 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  Add at least one measure to generate a report
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DragDropContext>
  );
}
