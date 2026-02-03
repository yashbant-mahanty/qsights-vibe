// Add this interface and state to the CreateProgramPage component

interface ProgramRoleOption {
  role: string;
  label: string;
  description: string;
  enabled: boolean;
  email: string;
  required: boolean;
}

// Add this to your useState declarations:
const [roleOptions, setRoleOptions] = useState<ProgramRoleOption[]>([
  {
    role: 'program-admin',
    label: 'Program Admin',
    description: 'Full program access',
    enabled: true,
    email: '',
    required: true
  },
  {
    role: 'program-manager',
    label: 'Program Manager',
    description: 'Manage activities & participants',
    enabled: true,
    email: '',
    required: false
  },
  {
    role: 'program-moderator',
    label: 'Program Moderator',
    description: 'View-only access',
    enabled: true,
    email: '',
    required: false
  },
  {
    role: 'evaluation-admin',
    label: 'Evaluation Admin',
    description: 'Manage evaluations & questionnaires',
    enabled: true,
    email: '',
    required: false
  }
]);

// Update the handleSubmit function to include role creation:
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  
  if (!formData.name || !formData.groupHead) {
    toast({
      title: "Validation Error",
      description: "Please fill in all required fields (Name and Group Head)",
      variant: "warning",
    });
    return;
  }

  const selectedGroupHead = groupHeads.find(gh => String(gh.id) === String(formData.groupHead));
  if (!selectedGroupHead) {
    toast({
      title: "Validation Error",
      description: "Please select a valid group head",
      variant: "warning",
    });
    return;
  }

  setSaving(true);
  try {
    const response = await programsApi.create({
      name: formData.name,
      code: formData.code,
      description: formData.description,
      organization_id: selectedGroupHead.organization_id,
      group_head_id: formData.groupHead,
      start_date: formData.startDate || undefined,
      end_date: formData.endDate || undefined,
      status: 'active',
      ...(logoUrl && { logo: logoUrl }),
      // NEW: Send role creation array
      create_roles: roleOptions
        .filter(r => r.enabled)
        .map(r => ({
          role: r.role,
          email: r.email || null,
          auto_generate: !r.email
        }))
    });
    
    // Show credentials modal if users were generated
    if (response.generated_users) {
      setGeneratedCredentials(response.generated_users);
      setShowCredentialsModal(true);
    } else {
      router.push('/programs');
    }
  } catch (err) {
    toast({
      title: "Error",
      description: 'Failed to create program: ' + (err instanceof Error ? err.message : 'Unknown error'),
      variant: "error",
    });
  } finally {
    setSaving(false);
  }
}

// Add this component after the "Organization & Timeline" Card:

{/* Role Selection Card */}
<Card>
  <CardHeader className="border-b border-gray-200">
    <CardTitle className="text-lg font-bold flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-qsights-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      Create Default Roles
    </CardTitle>
    <p className="text-xs text-gray-500 mt-1">
      Select which roles to create for this program
    </p>
  </CardHeader>
  <CardContent className="p-6 space-y-4">
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800">
          Auto-generated credentials will be displayed after creation. You can optionally provide custom emails for users.
        </p>
      </div>
    </div>
    
    {roleOptions.map((option, idx) => (
      <div key={option.role} className="border border-gray-200 rounded-lg p-4 hover:border-qsights-blue transition-colors">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={option.enabled}
            disabled={option.required}
            onChange={(e) => {
              const updated = [...roleOptions];
              updated[idx].enabled = e.target.checked;
              setRoleOptions(updated);
            }}
            className="mt-1 w-4 h-4 text-qsights-blue border-gray-300 rounded focus:ring-qsights-blue disabled:opacity-50"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-gray-900">{option.label}</span>
              {option.required && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Required</span>
              )}
              {option.enabled && (
                <Check className="w-4 h-4 text-green-600 ml-auto" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{option.description}</p>
            
            {option.enabled && (
              <div className="mt-3">
                <Input
                  type="email"
                  placeholder="Email (optional - auto-generate if empty)"
                  value={option.email}
                  onChange={(e) => {
                    const updated = [...roleOptions];
                    updated[idx].email = e.target.value;
                    setRoleOptions(updated);
                  }}
                  className="text-xs"
                />
              </div>
            )}
          </div>
        </label>
      </div>
    ))}
    
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
      <p className="text-xs text-gray-600">
        <strong>Selected:</strong> {roleOptions.filter(r => r.enabled).length} role(s) will be created
      </p>
    </div>
  </CardContent>
</Card>
