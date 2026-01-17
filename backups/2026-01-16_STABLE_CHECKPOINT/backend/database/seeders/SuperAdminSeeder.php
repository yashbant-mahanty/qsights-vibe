<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::create([
            'id' => Str::uuid(),
            'name' => 'Super Admin',
            'email' => 'superadmin@qsights.com',
            'password' => Hash::make('SuperAdmin@123'),
            'role' => 'super-admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->command->info('Super Admin user created successfully!');
        $this->command->info('Email: superadmin@qsights.com');
        $this->command->info('Password: SuperAdmin@123');
    }
}
