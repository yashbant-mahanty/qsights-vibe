<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LandingPage;
use App\Models\LandingPageSection;
use Illuminate\Http\Request;

class LandingPageController extends Controller
{
    /**
     * Get all landing pages
     */
    public function index()
    {
        $pages = LandingPage::with('sections')->orderBy('sort_order')->get();
        return response()->json($pages);
    }

    /**
     * Get a specific landing page by slug
     */
    public function show($slug)
    {
        $page = LandingPage::with('sections')->where('slug', $slug)->first();
        
        if (!$page) {
            return response()->json(['error' => 'Page not found'], 404);
        }
        
        return response()->json($page);
    }

    /**
     * Create a new landing page
     */
    public function store(Request $request)
    {
        $request->validate([
            'slug' => 'required|string|unique:landing_pages,slug',
            'title' => 'required|string',
            'content' => 'nullable|array',
            'meta_data' => 'nullable|array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $page = LandingPage::create($request->all());

        return response()->json([
            'message' => 'Landing page created successfully',
            'page' => $page,
        ], 201);
    }

    /**
     * Update landing page
     */
    public function update(Request $request, $id)
    {
        $page = LandingPage::find($id);
        
        if (!$page) {
            return response()->json(['error' => 'Page not found'], 404);
        }

        $request->validate([
            'slug' => 'sometimes|string|unique:landing_pages,slug,' . $id,
            'title' => 'sometimes|string',
            'content' => 'nullable|array',
            'meta_data' => 'nullable|array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $page->update($request->all());

        return response()->json([
            'message' => 'Landing page updated successfully',
            'page' => $page->fresh('sections'),
        ]);
    }

    /**
     * Delete landing page
     */
    public function destroy($id)
    {
        $page = LandingPage::find($id);
        
        if (!$page) {
            return response()->json(['error' => 'Page not found'], 404);
        }

        $page->delete();

        return response()->json(['message' => 'Landing page deleted successfully']);
    }

    /**
     * Add section to landing page
     */
    public function addSection(Request $request, $pageId)
    {
        $page = LandingPage::find($pageId);
        
        if (!$page) {
            return response()->json(['error' => 'Page not found'], 404);
        }

        $request->validate([
            'section_type' => 'required|string',
            'title' => 'nullable|string',
            'subtitle' => 'nullable|string',
            'content' => 'nullable|string',
            'images' => 'nullable|array',
            'settings' => 'nullable|array',
            'sort_order' => 'integer',
        ]);

        $section = $page->sections()->create($request->all());

        return response()->json([
            'message' => 'Section added successfully',
            'section' => $section,
        ], 201);
    }

    /**
     * Update section
     */
    public function updateSection(Request $request, $pageId, $sectionId)
    {
        $section = LandingPageSection::where('landing_page_id', $pageId)
                                     ->where('id', $sectionId)
                                     ->first();
        
        if (!$section) {
            return response()->json(['error' => 'Section not found'], 404);
        }

        $request->validate([
            'section_type' => 'sometimes|string',
            'title' => 'nullable|string',
            'subtitle' => 'nullable|string',
            'content' => 'nullable|string',
            'images' => 'nullable|array',
            'settings' => 'nullable|array',
            'sort_order' => 'integer',
        ]);

        $section->update($request->all());

        return response()->json([
            'message' => 'Section updated successfully',
            'section' => $section,
        ]);
    }

    /**
     * Delete section
     */
    public function deleteSection($pageId, $sectionId)
    {
        $section = LandingPageSection::where('landing_page_id', $pageId)
                                     ->where('id', $sectionId)
                                     ->first();
        
        if (!$section) {
            return response()->json(['error' => 'Section not found'], 404);
        }

        $section->delete();

        return response()->json(['message' => 'Section deleted successfully']);
    }
}
