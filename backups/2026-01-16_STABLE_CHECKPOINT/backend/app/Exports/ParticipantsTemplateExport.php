<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ParticipantsTemplateExport implements FromArray, WithHeadings, WithStyles
{
    public function array(): array
    {
        // Return sample data rows
        return [
            [
                'John Doe',
                'john.doe@example.com',
                '+1234567890',
                '',
                '',
                'Sample participant 1',
                'active',
                ''
            ],
            [
                'Jane Smith',
                'jane.smith@example.com',
                '+0987654321',
                '',
                '',
                'Sample participant 2',
                'active',
                ''
            ],
        ];
    }

    public function headings(): array
    {
        return [
            'name',
            'email',
            'phone',
            'organization_id',
            'program_id',
            'notes',
            'status',
            'avatar'
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            // Style the first row as bold
            1 => ['font' => ['bold' => true]],
        ];
    }
}
