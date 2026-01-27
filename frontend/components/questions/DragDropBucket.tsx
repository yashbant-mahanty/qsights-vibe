"use client";

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Image as ImageIcon, 
  X, 
  CheckCircle, 
  XCircle,
  AlertCircle 
} from 'lucide-react';
import {
  DragDropItem,
  DragDropBucket as BucketType,
  DragDropResponse,
  DragDropBucketProps,
} from '@/types/dragDropBucket';

// Sortable Item Component
interface SortableItemProps {
  item: DragDropItem;
  isDragging?: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
  disabled?: boolean;
  onRemove?: () => void;
  inBucket?: boolean;
}

function SortableItem({ 
  item, 
  isDragging, 
  isCorrect, 
  isIncorrect, 
  disabled, 
  onRemove,
  inBucket 
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id, disabled });

  // Debug logging
  console.log('🎯 [DRAG_DROP_ITEM]', { id: item.id, text: item.text, imageUrl: item.imageUrl, hasImage: !!item.imageUrl });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-3 rounded-lg border-2 transition-all
        ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-move hover:shadow-md'}
        ${isDragging ? 'shadow-lg scale-105 z-50' : ''}
        ${isCorrect ? 'border-green-500 bg-green-50' : ''}
        ${isIncorrect ? 'border-red-500 bg-red-50' : ''}
        ${!isCorrect && !isIncorrect ? 'border-gray-300 bg-white hover:border-qsights-blue' : ''}
      `}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
      
      {item.imageUrl && (
        <img 
          src={item.imageUrl} 
          alt={item.text}
          className="w-12 h-12 object-cover rounded"
          onLoad={() => console.log('✅ [DRAG_DROP_ITEM] Image loaded:', item.id)}
          onError={(e) => console.error('❌ [DRAG_DROP_ITEM] Image error:', item.id, item.imageUrl, e)}
        />
      )}
      
      <span className="flex-1 text-sm font-medium text-gray-700">
        {item.text}
      </span>

      {isCorrect && <CheckCircle className="w-5 h-5 text-green-600" />}
      {isIncorrect && <XCircle className="w-5 h-5 text-red-600" />}
      
      {inBucket && onRemove && !disabled && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          type="button"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      )}
    </div>
  );
}

// Droppable Bucket Component
interface DroppableBucketProps {
  bucket: BucketType;
  items: DragDropItem[];
  disabled?: boolean;
  showResults?: boolean;
  correctItemIds?: string[];
  onRemove?: (itemId: string) => void;
}

function DroppableBucket({ 
  bucket, 
  items, 
  disabled, 
  showResults,
  correctItemIds,
  onRemove 
}: DroppableBucketProps) {
  const itemIds = items.map(item => item.id);
  
  // Debug logging
  console.log('🪣 [DRAG_DROP_BUCKET]', { id: bucket.id, label: bucket.label, imageUrl: bucket.imageUrl, hasImage: !!bucket.imageUrl });
  
  const { setNodeRef, isOver } = useDroppable({
    id: bucket.id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`
        flex-1 min-w-0 p-4 rounded-xl border-2 border-dashed transition-all
        ${disabled ? 'bg-gray-50' : 'bg-white hover:border-qsights-blue'}
        ${isOver ? 'border-qsights-blue bg-blue-50 scale-105' : ''}
      `}
      style={{ 
        borderColor: isOver ? '#3b82f6' : (bucket.color || '#e5e7eb'),
        backgroundColor: items.length > 0 && !disabled ? `${bucket.color}10` : undefined 
      }}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b-2" style={{ borderColor: bucket.color || '#d1d5db' }}>
        {bucket.imageUrl && (
          <img 
            src={bucket.imageUrl} 
            alt={bucket.label}
            className="w-8 h-8 object-cover rounded"
            onLoad={() => console.log('✅ [DRAG_DROP_BUCKET] Image loaded:', bucket.id)}
            onError={(e) => console.error('❌ [DRAG_DROP_BUCKET] Image error:', bucket.id, bucket.imageUrl, e)}
          />
        )}
        <h4 className="font-semibold text-sm flex-1">
          {bucket.label}
        </h4>
      </div>
      
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px]">
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
              Drop items here
            </div>
          ) : (
            items.map((item) => {
              const isCorrect = showResults && correctItemIds?.includes(item.id);
              const isIncorrect = showResults && !correctItemIds?.includes(item.id);
              
              return (
                <SortableItem
                  key={item.id}
                  item={item}
                  disabled={disabled}
                  isCorrect={isCorrect}
                  isIncorrect={isIncorrect}
                  inBucket={true}
                  onRemove={onRemove ? () => onRemove(item.id) : undefined}
                />
              );
            })
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Droppable Source Items Component
interface SourceItemsProps {
  items: DragDropItem[];
  disabled?: boolean;
  required?: boolean;
  tapSelectedItem?: string | null;
  onTapItem?: (itemId: string) => void;
}

function SourceItems({ 
  items, 
  disabled, 
  required, 
  tapSelectedItem,
  onTapItem 
}: SourceItemsProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'source-items',
  });

  return (
    <div className="flex-1 min-w-0">
      <h4 className="font-semibold mb-3 text-sm text-gray-700">
        Available Items {required && <span className="text-red-500">*</span>}
      </h4>
      
      <SortableContext 
        items={items.map(item => item.id)} 
        strategy={verticalListSortingStrategy}
      >
        <div 
          ref={setNodeRef}
          className={`space-y-2 p-4 rounded-xl border-2 border-dashed min-h-[150px] transition-all
            ${isOver ? 'border-qsights-blue bg-blue-50 scale-105' : 'border-gray-300 bg-gray-50'}
          `}
        >
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              All items placed
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => onTapItem?.(item.id)}
                className={tapSelectedItem === item.id ? 'ring-2 ring-blue-500 rounded-lg' : ''}
              >
                <SortableItem
                  item={item}
                  disabled={disabled}
                />
              </div>
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Main DragDropBucket Component
export function DragDropBucket({
  question,
  value,
  onChange,
  disabled = false,
  showResults = false,
  isAssessment = false,
  language = 'EN',
}: DragDropBucketProps) {
  const settings = question.settings;
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Initialize state from value or create empty state
  const [placements, setPlacements] = useState<DragDropResponse['placements']>(
    value?.placements || []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Long press on mobile
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get unplaced items (items not in any bucket)
  const placedItemIds = new Set(placements.map(p => p.itemId));
  const unplacedItems = settings.items.filter(item => !placedItemIds.has(item.id));

  // Get items for each bucket
  const getBucketItems = (bucketId: string): DragDropItem[] => {
    return placements
      .filter(p => p.bucketId === bucketId)
      .sort((a, b) => a.order - b.order)
      .map(p => settings.items.find(item => item.id === p.itemId)!)
      .filter(Boolean);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeItemId = active.id as string;
    const overContainerId = over.id as string;

    // Check if dropping back to source
    if (overContainerId === 'source-items') {
      // Remove from any bucket (return to source)
      const newPlacements = placements.filter(p => p.itemId !== activeItemId);
      setPlacements(newPlacements);
      
      if (onChange) {
        onChange({
          placements: newPlacements,
          timestamp: new Date().toISOString(),
          unplacedItems: settings.items
            .filter(item => !newPlacements.find(p => p.itemId === item.id))
            .map(item => item.id),
        });
      }
      return;
    }

    // Find if dropping over a bucket
    const targetBucket = settings.buckets.find(b => b.id === overContainerId);

    if (targetBucket) {
      // Remove from previous location
      const newPlacements = placements.filter(p => p.itemId !== activeItemId);
      
      // Add to new bucket
      const bucketItems = newPlacements.filter(p => p.bucketId === targetBucket.id);
      newPlacements.push({
        itemId: activeItemId,
        bucketId: targetBucket.id,
        order: bucketItems.length,
      });

      setPlacements(newPlacements);
      
      if (onChange) {
        onChange({
          placements: newPlacements,
          timestamp: new Date().toISOString(),
          unplacedItems: settings.items
            .filter(item => !newPlacements.find(p => p.itemId === item.id))
            .map(item => item.id),
        });
      }
    }
  };

  // Remove item from bucket
  const handleRemove = (bucketId: string, itemId: string) => {
    const newPlacements = placements.filter(
      p => !(p.itemId === itemId && p.bucketId === bucketId)
    );
    
    // Reorder remaining items in the bucket
    const bucketPlacements = newPlacements
      .filter(p => p.bucketId === bucketId)
      .map((p, index) => ({ ...p, order: index }));
    
    const otherPlacements = newPlacements.filter(p => p.bucketId !== bucketId);
    const finalPlacements = [...otherPlacements, ...bucketPlacements];
    
    setPlacements(finalPlacements);
    
    if (onChange) {
      onChange({
        placements: finalPlacements,
        timestamp: new Date().toISOString(),
        unplacedItems: settings.items
          .filter(item => !finalPlacements.find(p => p.itemId === item.id))
          .map(item => item.id),
      });
    }
  };

  // Mobile tap mode - tap item then tap bucket
  const [tapSelectedItem, setTapSelectedItem] = useState<string | null>(null);

  const handleTapItem = (itemId: string) => {
    if (disabled) return;
    setTapSelectedItem(tapSelectedItem === itemId ? null : itemId);
  };

  const handleTapBucket = (bucketId: string) => {
    if (!tapSelectedItem || disabled) return;
    
    // Remove from previous location
    const newPlacements = placements.filter(p => p.itemId !== tapSelectedItem);
    
    // Add to new bucket
    const bucketItems = newPlacements.filter(p => p.bucketId === bucketId);
    newPlacements.push({
      itemId: tapSelectedItem,
      bucketId: bucketId,
      order: bucketItems.length,
    });

    setPlacements(newPlacements);
    setTapSelectedItem(null);
    
    if (onChange) {
      onChange({
        placements: newPlacements,
        timestamp: new Date().toISOString(),
        unplacedItems: settings.items
          .filter(item => !newPlacements.find(p => p.itemId === item.id))
          .map(item => item.id),
      });
    }
  };

  // Get correct items for each bucket (for results display)
  const getCorrectItemIds = (bucketId: string): string[] | undefined => {
    if (!showResults || !question.correctAnswers) return undefined;
    const correctBucket = question.correctAnswers.find(b => b.id === bucketId);
    return correctBucket?.acceptedItems || [];
  };

  const layout = settings.layout || 'responsive';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const useVerticalLayout = layout === 'vertical' || (layout === 'responsive' && isMobile);

  return (
    <div className="space-y-4">
      {/* Mobile Tap Mode Indicator */}
      {tapSelectedItem && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          <span className="text-sm text-blue-800">
            Item selected. Tap a bucket to place it there.
          </span>
          <button
            onClick={() => setTapSelectedItem(null)}
            className="ml-auto text-blue-600 hover:text-blue-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={`flex ${useVerticalLayout ? 'flex-col' : 'flex-row flex-wrap'} gap-4 w-full`}>
          {/* Source Items */}
          <SourceItems
            items={unplacedItems}
            disabled={disabled}
            required={question.required}
            tapSelectedItem={tapSelectedItem}
            onTapItem={handleTapItem}
          />

          {/* Buckets */}
          <div className={`flex-[2] flex ${useVerticalLayout ? 'flex-col' : 'flex-row'} gap-4`}>
            {settings.buckets.map((bucket) => (
              <div
                key={bucket.id}
                onClick={() => handleTapBucket(bucket.id)}
                className={tapSelectedItem ? 'cursor-pointer' : ''}
              >
                <DroppableBucket
                  bucket={bucket}
                  items={getBucketItems(bucket.id)}
                  disabled={disabled}
                  showResults={showResults}
                  correctItemIds={getCorrectItemIds(bucket.id)}
                  onRemove={(itemId) => handleRemove(bucket.id, itemId)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? (
            <div className="cursor-grabbing">
              <SortableItem
                item={settings.items.find(i => i.id === activeId)!}
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Validation Message */}
      {question.required && unplacedItems.length > 0 && !disabled && (
        <div className="text-sm text-amber-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Please place all items in the buckets</span>
        </div>
      )}
    </div>
  );
}

// Export default settings for consistency with other question types
export const DEFAULT_DRAG_DROP_SETTINGS = {
  items: [],
  buckets: [],
  allowMultipleInBucket: false,
  allowReorder: true,
  allowRemove: true,
  requiredMode: 'all' as const,
  mobileMode: 'both' as const,
  layout: 'responsive' as const,
  partialScoring: false,
};
