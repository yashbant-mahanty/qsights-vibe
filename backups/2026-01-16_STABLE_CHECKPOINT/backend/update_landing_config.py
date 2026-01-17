#!/usr/bin/env python3
"""
Script to update the landing config page with toast notifications and template selector
"""

file_path = "/Users/yash/Documents/Projects/Qsights2.0/app/activities/[id]/landing-config/page.tsx"

with open(file_path, 'r') as f:
    content = f.read()

# 1. Add toast import after activitiesApi import
import_line = 'import { activitiesApi } from "@/lib/api";'
if import_line in content and 'import { toast } from "@/components/ui/toast"' not in content:
    content = content.replace(
        import_line,
        import_line + '\nimport { toast } from "@/components/ui/toast";'
    )

# 2. Add templates state after config state
state_line = '  const [config, setConfig] = useState<LandingPageConfig>(defaultConfig);'
if state_line in content and '[templates, setTemplates]' not in content:
    content = content.replace(
        state_line,
        state_line + '\n  const [templates, setTemplates] = useState<any[]>([]);'
    )

# 3. Replace alert calls with toast
replacements = [
    ('alert("Landing page configuration saved successfully!");', 
     'toast({ title: "Success", description: "Landing page configuration saved successfully!" });'),
    ('alert("Failed to save configuration. Please try again.");',
     'toast({ title: "Error", description: "Failed to save configuration. Please try again.", variant: "destructive" });'),
    ('alert("Image upload failed. Using temporary local URL.");',
     'toast({ title: "Warning", description: "Image upload failed. Using temporary local URL." });'),
]

for old, new in replacements:
    content = content.replace(old, new)

# 4. Update loadConfig to extract templates from response
old_load_config = """  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await activitiesApi.getLandingPageConfig(activityId);
      if (data && Object.keys(data).length > 0) {
        setConfig({ ...defaultConfig, ...data });
      } else {
        setConfig(defaultConfig);
      }"""

new_load_config = """  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await activitiesApi.getLandingPageConfig(activityId);
      
      // Extract templates if available
      if (response.templates && Array.isArray(response.templates)) {
        setTemplates(response.templates);
      }
      
      // Extract config - API returns { config: {...}, templates: [...] }
      const data = response.config || response;
      if (data && Object.keys(data).length > 0) {
        setConfig({ ...defaultConfig, ...data });
      } else {
        setConfig(defaultConfig);
      }"""

content = content.replace(old_load_config, new_load_config)

# 5. Add applyTemplate function after loadConfig
apply_template_func = '''
  const applyTemplate = (templateConfig: any) => {
    setConfig({ ...defaultConfig, ...templateConfig });
    toast({ title: "Template Applied", description: "Template has been applied successfully!" });
  };
'''

# Find position after loadConfig function ends (after the closing })
load_config_end = content.find('  const loadConfig = async () => {')
if load_config_end != -1:
    # Find the end of loadConfig function
    brace_count = 0
    started = False
    pos = load_config_end
    while pos < len(content):
        if content[pos] == '{':
            started = True
            brace_count += 1
        elif content[pos] == '}':
            brace_count -= 1
            if started and brace_count == 0:
                # Found the end of loadConfig
                pos += 1
                # Find end of line
                while pos < len(content) and content[pos] != '\n':
                    pos += 1
                if 'applyTemplate' not in content[:pos+200]:
                    content = content[:pos+1] + apply_template_func + content[pos+1:]
                break
        pos += 1

# 6. Add template selector UI before the first Card component
# Find the return statement and first Card
return_pos = content.find('return (')
if return_pos != -1:
    # Find the first Card after return
    first_card_pos = content.find('<Card>', return_pos)
    if first_card_pos != -1:
        # Add template selector before first Card
        template_selector_ui = '''      {/* Template Selector */}
      {templates.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Predefined Templates</CardTitle>
            <p className="text-sm text-gray-500">
              Choose a template to quickly set up your landing page
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((template: any, index: number) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all"
                  onClick={() => applyTemplate(template.config)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{template.name}</h3>
                    <Palette className="w-4 h-4 text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <div className="flex gap-2">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: template.config.bannerBackgroundColor }}
                    />
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: template.config.backgroundColor }}
                    />
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: template.config.footerBackgroundColor }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

'''
        if 'Predefined Templates' not in content:
            content = content[:first_card_pos] + template_selector_ui + content[first_card_pos:]

# Write the updated content
with open(file_path, 'w') as f:
    f.write(content)

print("✅ Successfully updated landing-config/page.tsx")
print("Changes applied:")
print("  - Added toast import")
print("  - Added templates state")
print("  - Replaced alert() calls with toast()")
print("  - Updated loadConfig to extract templates")
print("  - Added applyTemplate function")
print("  - Added template selector UI")
