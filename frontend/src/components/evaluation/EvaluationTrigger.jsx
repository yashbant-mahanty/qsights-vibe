import React, { useState, useEffect } from 'react';
import { Send, Users, FileText, AlertCircle, CheckCircle, Mail } from 'lucide-react';

/**
 * EvaluationTrigger Component
 * Allows admins to trigger evaluation forms to selected staff based on hierarchy
 */
const EvaluationTrigger = ({ user, apiUrl, authToken }) => {
  const [staff, setStaff] = useState([]);
  const [hierarchies, setHierarchies] = useState([]);
  const [selectedEvaluators, setSelectedEvaluators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    template_name: '',
    template_description: '',
    questions: [
      {
        id: 1,
        question: 'How would you rate the overall performance?',
        type: 'rating',
        required: true
      }
    ]
  });

  useEffect(() => {
    fetchStaff();
    fetchHierarchies();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/evaluation/staff?program_id=${user.program_id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
    setLoading(false);
  };

  const fetchHierarchies = async () => {
    try {
      const response = await fetch(`${apiUrl}/evaluation/hierarchy?program_id=${user.program_id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setHierarchies(data.hierarchies || []);
      }
    } catch (error) {
      console.error('Failed to fetch hierarchies:', error);
    }
  };

  const handleToggleEvaluator = (staffId) => {
    setSelectedEvaluators(prev => {
      if (prev.includes(staffId)) {
        return prev.filter(id => id !== staffId);
      } else {
        return [...prev, staffId];
      }
    });
    setMessage(null);
  };

  const handleSelectAll = () => {
    // Select all staff who have subordinates
    const managersWithSubordinates = staff
      .filter(s => hierarchies.some(h => h.reports_to_id === s.id))
      .map(s => s.id);
    
    if (selectedEvaluators.length === managersWithSubordinates.length) {
      setSelectedEvaluators([]);
    } else {
      setSelectedEvaluators(managersWithSubordinates);
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      id: formData.questions.length + 1,
      question: '',
      type: 'text',
      required: true
    };
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion]
    });
  };

  const updateQuestion = (id, field, value) => {
    setFormData({
      ...formData,
      questions: formData.questions.map(q =>
        q.id === id ? { ...q, [field]: value } : q
      )
    });
  };

  const removeQuestion = (id) => {
    if (formData.questions.length <= 1) {
      alert('At least one question is required');
      return;
    }
    setFormData({
      ...formData,
      questions: formData.questions.filter(q => q.id !== id)
    });
  };

  const handleTriggerEvaluation = async () => {
    if (selectedEvaluators.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one evaluator' });
      return;
    }

    if (!formData.template_name.trim()) {
      setMessage({ type: 'error', text: 'Please enter an evaluation template name' });
      return;
    }

    if (formData.questions.some(q => !q.question.trim())) {
      setMessage({ type: 'error', text: 'All questions must have text' });
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/evaluation/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          template_id: `eval-${Date.now()}`,
          template_name: formData.template_name,
          template_description: formData.template_description,
          template_questions: formData.questions,
          evaluator_ids: selectedEvaluators,
          organization_id: user.organization_id,
          program_id: user.program_id
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: `Evaluation triggered successfully! ${data.triggered_count || 0} evaluator(s) notified, ${data.emails_sent || 0} email(s) sent.`
        });
        setSelectedEvaluators([]);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to trigger evaluation' });
      }
    } catch (error) {
      console.error('Failed to trigger evaluation:', error);
      setMessage({ type: 'error', text: 'Failed to trigger evaluation' });
    }

    setSending(false);
  };

  const getSubordinatesCount = (staffId) => {
    return hierarchies.filter(h => h.reports_to_id === staffId).length;
  };

  const filteredStaff = staff.filter(s => {
    const hasSubordinates = hierarchies.some(h => h.reports_to_id === s.id);
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.email.toLowerCase().includes(searchTerm.toLowerCase());
    return hasSubordinates && matchesSearch;
  });

  const questionTypes = [
    { value: 'text', label: 'Text Response' },
    { value: 'rating', label: 'Rating (1-5)' },
    { value: 'yesno', label: 'Yes/No' },
    { value: 'scale', label: 'Scale (1-10)' },
    { value: 'textarea', label: 'Long Text' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Trigger Evaluation</h2>
        <p className="mt-1 text-sm text-gray-600">
          Create and send evaluation forms to managers to evaluate their team members
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`rounded-md p-4 ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400" />
            )}
            <div className="ml-3">
              <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Evaluation Form Builder */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <FileText className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Evaluation Form</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Evaluation Name *</label>
              <input
                type="text"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Q1 2026 Performance Review"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.template_description}
                onChange={(e) => setFormData({ ...formData, template_description: e.target.value })}
                rows="2"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Brief description of this evaluation"
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Questions</h4>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Question
                </button>
              </div>

              <div className="space-y-3">
                {formData.questions.map((q, index) => (
                  <div key={q.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">Question {index + 1}</span>
                      {formData.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                      className="mb-2 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter question text"
                    />
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {questionTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Select Evaluators */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Users className="h-6 w-6 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Select Evaluators</h3>
            </div>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectedEvaluators.length === filteredStaff.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <input
            type="text"
            placeholder="Search evaluators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          />

          <p className="text-sm text-gray-600 mb-4">
            {selectedEvaluators.length} evaluator(s) selected. Only staff with subordinates are shown.
          </p>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No managers with subordinates found</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredStaff.map((staffMember) => {
                const isSelected = selectedEvaluators.includes(staffMember.id);
                const subordinatesCount = getSubordinatesCount(staffMember.id);

                return (
                  <button
                    key={staffMember.id}
                    onClick={() => handleToggleEvaluator(staffMember.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-green-50 border-green-500'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{staffMember.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{staffMember.email}</div>
                        {staffMember.role_name && (
                          <div className="text-xs text-blue-600 mt-1">{staffMember.role_name}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          Will evaluate {subordinatesCount} team member(s)
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Trigger Button */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Ready to Send?</h3>
            <p className="text-sm text-gray-600 mt-1">
              This will send evaluation forms to {selectedEvaluators.length} evaluator(s) via email.
              Each evaluator will receive a unique link to evaluate their team members.
            </p>
          </div>
          <button
            onClick={handleTriggerEvaluation}
            disabled={sending || selectedEvaluators.length === 0 || !formData.template_name.trim()}
            className="ml-4 inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Trigger Evaluation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationTrigger;
