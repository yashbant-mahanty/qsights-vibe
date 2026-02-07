<?php
// Fix evaluation program linkage
require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "🔧 Step 1: Updating Roles to inherit program_id from department...\n";
$updated = DB::statement("
    UPDATE evaluation_roles er
    SET program_id = ed.program_id,
        updated_at = NOW()
    FROM evaluation_departments ed
    WHERE er.category = ed.name
      AND er.program_id IS NULL
      AND ed.program_id IS NOT NULL
      AND er.deleted_at IS NULL
      AND ed.deleted_at IS NULL
");
$count1 = DB::table('evaluation_roles as er')
    ->join('evaluation_departments as ed', 'er.category', '=', 'ed.name')
    ->whereNotNull('er.program_id')
    ->whereNull('er.deleted_at')
    ->whereNull('ed.deleted_at')
    ->count();
echo "  Updated $count1 roles\n\n";

echo "🔧 Step 2: Updating Staff to inherit program_id from role...\n";
$updated2 = DB::statement("
    UPDATE evaluation_staff es
    SET program_id = er.program_id,
        updated_at = NOW()
    FROM evaluation_roles er
    WHERE es.role_id = er.id
      AND (es.program_id IS NULL OR es.program_id != er.program_id)
      AND er.program_id IS NOT NULL
      AND es.deleted_at IS NULL
      AND er.deleted_at IS NULL
");
$count2 = DB::table('evaluation_staff as es')
    ->join('evaluation_roles as er', 'es.role_id', '=', 'er.id')
    ->where('es.program_id', '=', DB::raw('er.program_id'))
    ->whereNull('es.deleted_at')
    ->whereNull('er.deleted_at')
    ->count();
echo "  Updated $count2 staff\n\n";

echo "🔧 Step 3: Updating Hierarchy to inherit program_id from staff...\n";
$updated3 = DB::statement("
    UPDATE evaluation_hierarchy eh
    SET program_id = es.program_id,
        updated_at = NOW()
    FROM evaluation_staff es
    WHERE eh.staff_id = es.id
      AND (eh.program_id IS NULL OR eh.program_id != es.program_id)
      AND es.program_id IS NOT NULL
      AND eh.deleted_at IS NULL
      AND es.deleted_at IS NULL
");
$count3 = DB::table('evaluation_hierarchy as eh')
    ->join('evaluation_staff as es', 'eh.staff_id', '=', 'es.id')
    ->where('eh.program_id', '=', DB::raw('es.program_id'))
    ->whereNull('eh.deleted_at')
    ->whereNull('es.deleted_at')
    ->count();
echo "  Updated $count3 hierarchy mappings\n\n";

echo "✅ Database fix completed!\n";
echo "\nVerification:\n";

// Verify ITES data
$itesDept = DB::table('evaluation_departments')->where('name', 'ITES')->whereNull('deleted_at')->first();
if ($itesDept) {
    echo "  ITES Department: program_id = {$itesDept->program_id}\n";
    
    $roles = DB::table('evaluation_roles')->where('category', 'ITES')->whereNull('deleted_at')->get();
    echo "  Roles in ITES: " . $roles->count() . "\n";
    foreach ($roles as $role) {
        echo "    - {$role->name} (program_id: {$role->program_id})\n";
    }
    
    $staff = DB::table('evaluation_staff')
        ->whereIn('role_id', $roles->pluck('id'))
        ->whereNull('deleted_at')
        ->get();
    echo "  Staff in ITES: " . $staff->count() . "\n";
    foreach ($staff as $s) {
        echo "    - {$s->name} (program_id: {$s->program_id})\n";
    }
}
