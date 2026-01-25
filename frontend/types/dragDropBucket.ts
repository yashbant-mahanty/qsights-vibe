// Drag & Drop Bucket Question Type Definitions

export interface DragDropItem {
  id: string;
  text: string;
  imageUrl?: string; // Optional image for the item
  value?: string; // Optional custom value (defaults to text if not provided)
}

export interface DragDropBucket {
  id: string;
  label: string;
  color?: string; // Optional color for bucket styling
  imageUrl?: string; // Optional image for bucket header/background
  acceptedItems?: string[]; // For assessment mode: IDs of correct items
}

export interface DragDropSettings {
  items: DragDropItem[];
  buckets: DragDropBucket[];
  allowMultipleInBucket?: boolean; // Allow same item in multiple buckets (default: false)
  allowReorder?: boolean; // Allow reordering within buckets (default: true)
  allowRemove?: boolean; // Allow removing from buckets back to source (default: true)
  requiredMode?: 'all' | 'at-least-one' | 'custom'; // Validation mode
  customRequirement?: string; // Custom requirement message
  mobileMode?: 'drag' | 'tap' | 'both'; // Mobile interaction mode (default: 'both')
  layout?: 'horizontal' | 'vertical' | 'responsive'; // Layout mode (default: 'responsive')
  correctAnswers?: DragDropBucket[]; // For assessments: buckets with their correct items
  partialScoring?: boolean; // Allow partial points for partially correct answers
}

export interface DragDropResponse {
  placements: Array<{
    itemId: string;
    bucketId: string;
    order: number; // Position within the bucket
  }>;
  timestamp?: string;
  unplacedItems?: string[]; // Items not placed in any bucket
}

export interface DragDropQuestionData {
  type: 'drag_and_drop';
  question: string;
  settings: DragDropSettings;
  required?: boolean;
  correctAnswers?: DragDropBucket[]; // For assessment mode
  points?: number; // Points for correct answer
}

// Helper type for validation results
export interface DragDropValidationResult {
  isValid: boolean;
  isCorrect?: boolean; // For assessments
  score?: number; // Calculated score
  correctCount?: number;
  totalItems?: number;
  errors?: string[];
}

// Props for the DragDropBucket component
export interface DragDropBucketProps {
  question: DragDropQuestionData;
  value?: DragDropResponse;
  onChange?: (response: DragDropResponse) => void;
  disabled?: boolean;
  showResults?: boolean; // For displaying results after submission
  isAssessment?: boolean;
  language?: string;
}
