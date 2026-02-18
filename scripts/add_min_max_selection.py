#!/usr/bin/env python3
"""
Script to add min/max selection UI to the questionnaire builder.
"""

import os

file_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "app", "questionnaires", "[id]", "page.tsx")

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The marker to find: after the "Allow Other" checkbox div closes
marker = '''            )}

            {!showPreview && (
              <button
                onClick={() => addQuestionOption(sectionId, question.id)}'''

replacement = '''            )}

            {/* Min/Max Selection Limits - Only for Multi-Select */}
            {!showPreview && question.type === 'multi' && (
              <div className="pt-3 mt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-700">Selection Limits</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Minimum Selections</label>
                    <input
                      type="number"
                      min="0"
                      max={question.options?.length || 10}
                      value={question.min_selection ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                        setSections((prevSections: any) =>
                          prevSections.map((s: any) =>
                            s.id === sectionId
                              ? {
                                  ...s,
                                  questions: s.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, min_selection: value }
                                      : q
                                  )
                                }
                              : s
                          )
                        );
                      }}
                      placeholder="0"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Maximum Selections</label>
                    <input
                      type="number"
                      min="1"
                      max={question.options?.length || 10}
                      value={question.max_selection ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                        setSections((prevSections: any) =>
                          prevSections.map((s: any) =>
                            s.id === sectionId
                              ? {
                                  ...s,
                                  questions: s.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, max_selection: value }
                                      : q
                                  )
                                }
                              : s
                          )
                        );
                      }}
                      placeholder="No limit"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {(question.min_selection || question.max_selection) && (
                  <p className="text-xs text-gray-500 mt-2">
                    {question.min_selection && question.max_selection
                      ? `Users must select between ${question.min_selection} and ${question.max_selection} options`
                      : question.min_selection
                      ? `Users must select at least ${question.min_selection} option${question.min_selection > 1 ? 's' : ''}`
                      : `Users can select up to ${question.max_selection} option${question.max_selection > 1 ? 's' : ''}`}
                  </p>
                )}
                {question.min_selection && question.max_selection && question.min_selection > question.max_selection && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ Minimum cannot be greater than maximum
                  </p>
                )}
                {question.max_selection && question.options && question.max_selection > question.options.length && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ Maximum cannot exceed total options ({question.options.length})
                  </p>
                )}
              </div>
            )}

            {!showPreview && (
              <button
                onClick={() => addQuestionOption(sectionId, question.id)}'''

if marker in content:
    new_content = content.replace(marker, replacement, 1)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: Min/max selection UI added to questionnaire builder!")
else:
    print("ERROR: Marker not found in content")
    print("Looking for this marker in the file...")
    # Debug
    lines = content.split('\n')
    for i, line in enumerate(lines[1725:1740], start=1726):
        print(f"Line {i}: {repr(line)}")
