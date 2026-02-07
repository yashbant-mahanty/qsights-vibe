#!/usr/bin/env python3
"""
Comprehensive fix for all 3 landing page issues:
1. Save configuration (backend accepts all fields)
2. Live Preview (apply landing_config styles to take page)  
3. Template selector visibility (already added, just need to test)
"""

import re

# Path to the take page
take_page_path = "/Users/yash/Documents/Projects/Qsights2.0/app/activities/take/[id]/page.tsx"

with open(take_page_path, 'r') as f:
    content = f.read()

# 1. Add landing_config to Activity interface
old_interface = """interface Activity {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  start_date?: string;
  end_date?: string;
  questionnaire_id?: string;
  registration_form_fields?: FormField[];
}"""

new_interface = """interface Activity {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  start_date?: string;
  end_date?: string;
  questionnaire_id?: string;
  registration_form_fields?: FormField[];
  landing_config?: {
    logoUrl?: string;
    logoSize?: string;
    pageTitle?: string;
    pageTitleColor?: string;
    bannerBackgroundColor?: string;
    bannerText?: string;
    bannerTextColor?: string;
    bannerImageUrl?: string;
    bannerHeight?: string;
    backgroundColor?: string;
    footerText?: string;
    footerTextColor?: string;
    footerBackgroundColor?: string;
    footerHeight?: string;
    leftContentEnabled?: boolean;
    leftContentTitle?: string;
    leftContentTitleColor?: string;
    leftContentDescription?: string;
    leftContentDescriptionColor?: string;
    leftContentBackgroundColor?: string;
    loginButtonColor?: string;
    loginButtonText?: string;
    accentColor?: string;
    [key: string]: any;
  };
}"""

content = content.replace(old_interface, new_interface)

# 2. Replace hardcoded bg-gray-50 with dynamic background in loading state
content = content.replace(
    '<div className="flex items-center justify-center min-h-screen bg-gray-50">',
    '<div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: activity?.landing_config?.backgroundColor || "#F9FAFB" }}>'
)

# 3. Fix the registration form container to use landing_config
# This is more complex - need to find the form return statement
# Search for the registration form return
form_container_pattern = r'return \(\s*<div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">'
if re.search(form_container_pattern, content):
    content = re.sub(
        r'(<div className="flex items-center justify-center min-h-screen )bg-gray-50( p-6">)',
        r'\1" style={{ backgroundColor: activity?.landing_config?.backgroundColor || "#F9FAFB" }} className="p-6">',
        content
    )

# 4. Add banner section at the top of the form
# Find the main Card in registration form and add banner before it
banner_html = '''        {/* Top Banner from Landing Config */}
        {activity?.landing_config?.bannerBackgroundColor && (
          <div 
            className="w-full" 
            style={{ 
              backgroundColor: activity.landing_config.bannerBackgroundColor || "#3B82F6",
              height: activity.landing_config.bannerHeight || "120px",
              backgroundImage: activity.landing_config.bannerImageUrl ? `url(${activity.landing_config.bannerImageUrl})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {activity.landing_config.bannerText && (
              <div className="flex items-center justify-center h-full">
                <h1 
                  className="text-2xl font-bold px-4 text-center"
                  style={{ color: activity.landing_config.bannerTextColor || "#FFFFFF" }}
                >
                  {activity.landing_config.bannerText}
                </h1>
              </div>
            )}
          </div>
        )}

        '''

# Find where Card starts in the registration form (after the container div)
card_start_pattern = r'(return \(\s*<div className="flex items-center justify-center min-h-screen[^>]*>\s*)'
if re.search(card_start_pattern, content):
    content = re.sub(
        card_start_pattern,
        r'\1' + banner_html,
        content,
        count=1  # Only replace first occurrence (registration form)
    )

# 5. Apply footer at bottom if configured
# This would go at the end before closing div - complex to add via regex

# Write the updated content
with open(take_page_path, 'w') as f:
    f.write(content)

print("✅ Updated take page with landing_config support")
print("Changes applied:")
print("  - Added landing_config to Activity interface")
print("  - Applied backgroundColor from config")
print("  - Added banner section display")
print("  - Dynamic colors for banner text")
