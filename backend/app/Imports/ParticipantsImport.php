<?php

namespace App\Imports;

use App\Models\Participant;
use App\Models\Program;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Illuminate\Support\Facades\Validator;

class ParticipantsImport implements ToCollection, WithHeadingRow
{
    protected int $successCount = 0;
    protected int $skippedCount = 0;
    protected array $skippedRows = [];

    public function collection(Collection $rows)
    {
        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2; // +2 because: +1 for 0-index, +1 for header row

            // Validate required fields
            $validator = Validator::make($row->toArray(), [
                'name' => 'required|string|max:255',
                'email' => 'required|email',
                'program_id' => 'nullable|uuid',
            ]);

            if ($validator->fails()) {
                $this->skippedCount++;
                $this->skippedRows[] = [
                    'rowNumber' => $rowNumber,
                    'reason' => $validator->errors()->first()
                ];
                continue;
            }

            // Check for duplicate email
            if (Participant::where('email', $row['email'])->exists()) {
                $this->skippedCount++;
                $this->skippedRows[] = [
                    'rowNumber' => $rowNumber,
                    'reason' => "Email '{$row['email']}' already exists"
                ];
                continue;
            }

            // Validate program_id if provided
            if (!empty($row['program_id'])) {
                if (!Program::where('id', $row['program_id'])->exists()) {
                    $this->skippedCount++;
                    $this->skippedRows[] = [
                        'rowNumber' => $rowNumber,
                        'reason' => "Program ID '{$row['program_id']}' not found"
                    ];
                    continue;
                }
            }

            try {
                // Auto-assign organization_id from program if not provided
                $organizationId = !empty($row['organization_id']) ? $row['organization_id'] : null;
                if (!$organizationId && !empty($row['program_id'])) {
                    $program = Program::find($row['program_id']);
                    if ($program && $program->organization_id) {
                        $organizationId = $program->organization_id;
                    }
                }

                // Create participant
                $participant = Participant::create([
                    'id' => Str::uuid(),
                    'organization_id' => $organizationId,
                    'name' => $row['name'],
                    'email' => $row['email'],
                    'phone' => $row['phone'] ?? null,
                    'avatar' => $row['avatar'] ?? null,
                    'notes' => $row['notes'] ?? null,
                    'status' => !empty($row['status']) && in_array($row['status'], ['active', 'inactive']) 
                        ? $row['status'] 
                        : 'active',
                ]);

                // Attach program if provided
                if (!empty($row['program_id'])) {
                    $participant->programs()->attach($row['program_id'], [
                        'id' => Str::uuid()
                    ]);
                    
                    // Also link to all activities in this program
                    $program = Program::with('activities')->find($row['program_id']);
                    if ($program && $program->activities->isNotEmpty()) {
                        $activitySyncData = $program->activities->mapWithKeys(function($activity) {
                            return [$activity->id => ['created_at' => now(), 'updated_at' => now()]];
                        });
                        $participant->activities()->attach($activitySyncData);
                    }
                }

                $this->successCount++;
            } catch (\Exception $e) {
                $this->skippedCount++;
                $this->skippedRows[] = [
                    'rowNumber' => $rowNumber,
                    'reason' => 'Failed to create participant: ' . $e->getMessage()
                ];
            }
        }
    }

    public function getSuccessCount(): int
    {
        return $this->successCount;
    }

    public function getSkippedCount(): int
    {
        return $this->skippedCount;
    }

    public function getSkippedRows(): array
    {
        return $this->skippedRows;
    }

    public function headingRow(): int
    {
        return 1;
    }
}
