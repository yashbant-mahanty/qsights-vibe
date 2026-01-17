<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

if (!Schema::hasTable("organizations")) {
    Schema::create("organizations", function (Blueprint $table) {
        $table->id();
        $table->string("name");
        $table->text("description")->nullable();
        $table->string("logo")->nullable();
        $table->string("email")->nullable();
        $table->string("status")->default("active");
        $table->json("settings")->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
    echo "Created: organizations\n";
}

if (!Schema::hasTable("group_heads")) {
    Schema::create("group_heads", function (Blueprint $table) {
        $table->id();
        $table->string("name");
        $table->string("email")->nullable();
        $table->string("logo")->nullable();
        $table->timest<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

if (!Schema::hasTable("organizations")) {
    Schema::create("organizaiuse , use Illuminate\Database\Schema\Bluepr $
if (!Schema::hasTable("organizations"))le"    Schema::create("organizations", funcnu        $table->id();
        $table->string("name");
        $t          $->string("sta        $table->text("descript          $table->string("logo")->nullable();
   ()        $table->string("email")->nullable(ta        $table->string("status")->default("on        $table->json("settings")->nullable();
     Id        $table->timestamps();
        $tablest        $table->softDeletes(t(    });
    echo "Created: ore-    ec"s}

if (!Schema::hasTable("group_heale->t    Schema::create("group_heads", funces        $table->id();
        $table->string("name");
        ma::hasTable("sections")        $table->string("email"ns        $table->string("logo")->nullable();ab        $table->timest<?php
use Illuminateiouse Illuminate\Support\Fac->use Illuminate\Database\Schema\Blueprri
if (!Schema::hasTable("organizations"))ipt    Schema::create("organizaiuse , use Ierif (!Schema::hasTable("organizations"))le"    Schema::create("organizatioDe        $table->string("name");
        $t          $->string("sta        $table->text("descript        ea        $t          $->string(pr   ()        $table->string("email")->nullable(ta        $table->string("status")->default("on        $table);     Id        $table->timestamps();
        $tablest        $table->softDeletes(t(    });
    echo "Created: ore-    ec"s}

if (!Schema::le        $tablest        $table->soft(    echo "Cr")->nullable();
        $table->boolean("r
if (!Schema::hasTable("group_h           $table->string("name");
        ma::hasTable("sections")        $table->string("email"ns e-        ma::hasTable("sectionslause Illuminateiouse Illuminate\Support\Fac->use Illuminate\Database\Schema\Blueprri
if (!Schema::hasTable("organizations"))ipt    Schematif (!Schema::hasTable("organizations"))ipt    Schema::create("organizaiuse , use Ipa        $t          $->string("sta        $table->text("descript        ea        $t          $->string(pr   ()        $table->string("email")->nullable(ta        $table->string("status")->->        $tablest        $table->softDeletes(t(    });
    echo "Created: ore-    ec"s}

if (!Schema::le        $tablest        $table->soft(    echo "Cr")->nullable();
        $table->boolean("r
if (!Schema::hasTable("group_h           $table->string(lean("is_preview")->default(false);
        $table->json
if (!Schema::le        $tablesull        $table->boolean("r
if (!Schema::hasTable("group_h           $table->st  if (!Schema::hasTable("grnt        ma::hasTable("sections")        $table->string("email"nteif (!Schema::hasTable("organizations"))ipt    Schematif (!Schema::hasTable("organizations"))ipt    Schema::create("organizaiuse , use Ipa        $t          $->string("sta        $tid    echo "Created: ore-    ec"s}

if (!Schema::le        $tablest        $table->soft(    echo "Cr")->nullable();
        $table->boolean("r
if (!Schema::hasTable("group_h           $table->string(lean("is_preview")->default(false);
        $table->json
if (!Schema::le        $tablesull        $table->boolean("r
if (!Schema::hasTable("group_h           $table->st  if (!Schema::on
if (!Schema::le        $tables  $        $table->boolean("r
if (!Schema::hasTable("group_h           $table->st  if (!Schema::hasTable("gr;
        $table->json
if (!Schema::le        $tablesull        $table->boolean("r
if (!Sche::if (!Schema::le    unif (!Schema::hasTable("group_h           $table->st  if (!ta
if (!Schema::le        $tablest        $table->soft(    echo "Cr")->nullable();
        $table->boolean("r
if (!Schema::hasTable("group_h           $table->string(lean("is_preview")->default(false);
        $table->json
if (!Schema::le        $tablesull        $table->boolean("r
if (!Schema::hasTable("group_h           $table->st  if (!Schema::on
if (!Scheble        $table->boolean("r
if (!Schema::hasTable("group_h           $table->stn if (!Schema::hasTable("gr          $table->json
if (!Schema::le        $tablesull        $table->boolean("r
if (!Sche;
if (!Schema::le    eiif (!Schema::hasTable("group_h           $table->st  if (!  if (!Schema::le        $tables  $        $table->boolean("r
if (!Sc>tif (!Schema::hasTable("group_h           $table->st  if (!ci        $table->json
if (!Schema::le        $tablesull        $table->boolean(::if (!Schema::le    ntif (!Sche::if (!Schema::le    unif (!Schema::hasTable("groncif (!Schema::le        $tablest        $table->soft(    echo "Cr")->nullable();
        $ta->        $table->boolean("r
if (!Schema::hasTable("group_h           $table->ststif (!Schema::hasTablelete()        $table->json
if (!Schema::le        $tablesull        $table->boolean("r
if (!Sche  if (!Schema::le    atif (!Schema::hasTable("group_h           $table->st  if (!viif (!Scheble        $table->boolean("r
if (!Schema::hasTable("groupfuif (!Schema::hasTable("group_h       taif (!Schema::le        $tablesull        $table->boolean("r
if (!Sche;
if (!Schema::le    eiif (!Scleif (!Sche;
if (!Schema::le    eiif (!Schema::hasTable("gronuif (!Schee(if (!Sc>tif (!Schema::hasTable("group_h           $table->st  if (!ci        $table->json
if (!Schema::le        $tablesull        >nullable(if (!Schema::le        $tablesull        $table->boolean(::if (!Schema::le    ntif (!Sch);        $ta->        $table->boolean("r
if (!Schema::hasTable("group_h           $table->ststif (!Schema::hasTablelete()        $table->json
if (!Schema::le        $tablesull        $table->boolean("r
if (!Sche  if (!Sleif (!Schema::hasTable("group_h        d(if (!Schema::le        $tablesull        $table->boolean("r
if (!Sche  if (!Schema::le    atif (!Scetif (!S       $table->foreignId("reviewed_by")->nullable()->cif (!Schema::hasTable("groupfuif (!Schema::hasTable("group_h       taif (!Schema::le        $tablesull        $table->boolean("r
)-if (!Sche;
if (!Schema::le    eiif (!Scleif (!Sche;
if (!Schema::le    eiif (!Schema::hasTable("gronuif (!Schee(if (!Sc>tif (!Simif (!Scheevif (!Schema::le    eiif (!Schema::hasTa>tif (!Schema::le        $tablesull        >nullable(if (!Schema::le        $tablesull        $table->boolean(::if (!Schema::le    ntif (!Sch);       ) if (!Schema::hasTable("group_h           $table->ststif (!Schema::hasTablelete()        $table->json
if (!Schema::le        $tablesull        $table->boolean("r
if (!Sche  if (!Slleif (!Schema::le        $tablesull        $table->boolean("r
if (!Sche  if (!Sleif (!Schema::hasTabl  if (!Sche  if (!Sleif (!Schema::hasTable("group_h        dtaif (!Sche  if (!Schema::le    atif (!Scetif (!S       $table->foreignId("reviewed_by")->nullable()->cif (!Schema::haser)-if (!Sche;
if (!Schema::le    eiif (!Scleif (!Sche;
if (!Schema::le    eiif (!Schema::hasTable("gronuif (!Schee(if (!Sc>tif (!Simif (!Scheevif (!Schema::le    eiif (!Schema::hasTa>tif (!Schema::le        $tablesull        >nulpeif (!Schema $if (!Schema::le    eiif (!Schema::hasTa  if (!Schema::le        $tablesull        $table->boolean("r
if (!Sche  if (!Slleif (!Schema::le        $tablesull        $table->boolean("r
if (!Sche  if (!Sleif (!Schema::hasTabl  if (!Sche  if (!Sleif (!Schema::hasTable("group_h        dtaif (!Sche  if (!Schema::le    atif (!Scetif (!S       $table->foreignId("reviewed_by")->nullable()->cif (!Schema::haser)-if (!Sche;
if (!peif (!Sche  if (!Slleif (!Schema::le        $tablesull     inif (!Sche  if (!Sleif (!Schema::hasTabl  if (!Sche  if (!Sleif (!Schema::hasTa>tif (!Schema::le    eiif (!Scleif (!Sche;
if (!Schema::le    eiif (!Schema::hasTable("gronuif (!Schee(if (!Sc>tif (!Simif (!Scheevif (!Schema::le    eiif (!Schema::hasTa>tif (!Schema::le        $tablesull        >nulpeif (!Schema $iCrif (!Schema::le    eiif (!Schema::hasTaheif (!Sche  if (!Slleif (!Schema::le        $tablesull        $table->boolean("r
if (!Sche  if (!Sleif (!Schema::hasTabl  if (!Sche  if (!Sleif (!Schema::hasTable("group_h        dtaif (!Sche  if (!Schema::le    atif (!Scetif (!S       $table->foreignId("reviewed_by")->nullable()->cif (!Sefif (!Sche  if (!Sleif (!Schema::hasTabl  if (!Sche  if (!Sleif (!Schema::hasTaseif (!peif (!Sche  if (!Slleif (!Schema::le        $tablesull     inif (!Sche  if (!Sleif (!Schema::hasTabl  if (!Sche  if (!Sleif (!Schema::hasTa>tif (!Schema::le    eiif (!Scleif (!Sche;
if (!Schema::le    eiif (!Schema::hasTable(loif (!Schema::le    eiif (!Schema::hasTable("gronuif (!Schee(if (!Sc>tif (!Simif (!Scheevif (!Schema::le    eiif (!Schema::hasTa>tif (!Schema::le        $tablesull        >nulpeif (!Schem $if (!Sche  if (!Sleif (!Schema::hasTabl  if (!Sche  if (!Sleif (!Schema::hasTable("group_h        dtaif (!Sche  if (!Schema::le    atif (!Scetif (!S       $table->foreignId("reviewed_by")->nullable()->cif (!Sefif (!Sche  if (!Sleif (!Schema::hasTabl  if (!Sche  if (!Sleif (!Schema::hasTaseif (!peif (!Sche  if ()if (!Schema::le    eiif (!Schema::hasTable(loif (!Schema::le    eiif (!Schema::hasTable("gronuif (!Schee(if (!Sc>tif (!Simif (!Scheevif (!Schema::le    eiif (!Schema::hasTa>tif (!Schema::le        $tablesull        >nulpeif (!Schem $if (!Sche  if (!Sleif (!Schema::hasTabl  if (!Sche  if (!Sleif (!Schema::hasTable("group_h        dtaif (!Sche  if (!Schema::le    atif (!Scetif (!S       $table->foreignId("reviewed_by")->nullable()->cif (!Sefif (!Sche  if (!Sleif (!Schema::hed: password_resets\n";
}

if (!Schema::hasTable("notification_reports")) {
    Schema::create("notification_reports", function (Blueprint $table) {
        $table->id();
        $table->string("type");
        $table->json("data")->nullable();
        $table->timestamp("generated_at")->nullable();
        $table->timestamps();
    });
    echo "Created: notification_reports\n";
}

echo "\nAll missing tables created!\n";
