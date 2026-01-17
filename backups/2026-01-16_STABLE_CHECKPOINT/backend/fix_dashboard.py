import re

# Read the file
with open('/Users/yash/Documents/Projects/Qsights2.0/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

# 1. Add dashboardApi to imports
content = content.replace(
    'import {\n  organizationsApi,\n  programsApi,\n  activitiesApi,\n  participantsApi,\n  questionnairesApi,\n} from "@/lib/api";',
    'import {\n  organizationsApi,\n  programsApi,\n  activitiesApi,\n  participantsApi,\n  questionnairesApi,\n  dashboardApi,\n} from "@/lib/api";'
)

# 2. Add state variables
content = content.replace(
    '  const [searchQuery, setSearchQuery] = useState("");',
    '  const [searchQuery, setSearchQuery] = useState("");\n  const [globalStats, setGlobalStats] = useState<any>(null);\n  const [orgPerformance, setOrgPerformance] = useState<any[]>([]);'
)

# 3. Update loadData function
old_load_data = '''  async function loadData() {
    try {
      setLoading(true);
      const [orgsData, progsData, actsData, partsData, questData] = await Promise.all([
        organizationsApi.getAll().catch(() => []),
        programsApi.getAll().catch(() => []),
        activitiesApi.getAll().catch(() => []),
        participantsApi.getAll().catch(() => []),
        questionnairesApi.getAll().catch(() => []),
      ]);
      setOrganizations(orgsData);
      setPrograms(progsData);
      setActivities(actsData);
      setParticipants(partsData);
      setQuestionnaires(questData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }'''

new_load_data = '''  async function loadData() {
    try {
      setLoading(true);
      const [orgsData, progsData, actsData, partsData, questData, dashStats, orgPerf] = await Promise.all([
        organizationsApi.getAll().catch(() => []),
        programsApi.getAll().catch(() => []),
        activitiesApi.getAll().catch(() => []),
        participantsApi.getAll().catch(() => []),
        questionnairesApi.getAll().catch(() => []),
        dashboardApi.getGlobalStatistics().catch(() => null),
        dashboardApi.getOrganizationPerformance().catch(() => []),
      ]);
      setOrganizations(orgsData);
      setPrograms(progsData);
      setActivities(actsData);
      setParticipants(partsData);
      setQuestionnaires(questData);
      setGlobalStats(dashStats);
      setOrgPerformance(orgPerf);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }'''

content = content.replace(old_load_data, new_load_data)

# 4. Update statistics calculations - find and replace the calculation section
old_stats = '''  // Calculate statistics
  const totalOrganizations = organizations.length;
  const totalPrograms = programs.length;
  const totalActivities = activities.length;
  const totalParticipants = participants.length;
  const authenticatedParticipants = participants.filter(p => !p.is_guest).length;
  const guestParticipants = participants.filter(p => p.is_guest).length;
  const totalQuestionnaires = questionnaires.length;
  
  const totalResponses = activities.reduce((sum, a) => sum + (a.responses_count || 0), 0);
  const authenticatedResponses = activities.reduce((sum, a) => sum + (a.authenticated_responses_count || 0), 0);
  const guestResponses = activities.reduce((sum, a) => sum + (a.guest_responses_count || 0), 0);
  const totalParticipantsInActivities = activities.reduce((sum, a) => sum + (a.participants_count || 0), 0);
  const totalParticipantsResponded = activities.reduce((sum, a) => sum + (a.participants_responded_count || 0), 0);
  const engagementRate = totalParticipantsInActivities > 0
    ? Math.round((totalParticipantsResponded / totalParticipantsInActivities) * 100)
    : 0;'''

new_stats = '''  // Calculate statistics using dashboard API
  const totalOrganizations = globalStats?.organizations || organizations.length;
  const totalPrograms = globalStats?.programs || programs.length;
  const totalActivities = globalStats?.activities || activities.length;
  const totalParticipants = globalStats?.participants || participants.length;
  const authenticatedParticipants = participants.filter(p => !p.is_guest).length;
  const guestParticipants = participants.filter(p => p.is_guest).length;
  const totalQuestionnaires = questionnaires.length;
  
  const totalResponses = globalStats?.responses || activities.reduce((sum, a) => sum + (a.responses_count || 0), 0);
  const authenticatedResponses = activities.reduce((sum, a) => sum + (a.authenticated_responses_count || 0), 0);
  const guestResponses = activities.reduce((sum, a) => sum + (a.guest_responses_count || 0), 0);
  const engagementRate = globalStats?.platform_engagement || 0;'''

content = content.replace(old_stats, new_stats)

# 5. Update activity type distribution and org performance
old_org_section = '''  // Activity type distribution
  const surveyCount = activities.filter(a => a.type === 'survey').length;
  const pollCount = activities.filter(a => a.type === 'poll').length;
  const assessmentCount = activities.filter(a => a.type === 'assessment').length;
  
  // Top performing organizations by participants
  const orgPerformance = organizations
    .filter(org => 
      org.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map(org => {
      const orgPrograms = programs.filter(p => p.organization_id === org.id);
      const orgActivities = activities.filter(a => a.organization_id === org.id);
      
      // Calculate organization-specific participant and response counts
      const totalParts = orgActivities.reduce((sum, a) => sum + (a.participants_count || 0), 0);
      const totalResps = orgActivities.reduce((sum, a) => sum + (a.responses_count || 0), 0);
      const engagement = totalParts > 0 ? Math.round((totalResps / totalParts) * 100) : 0;
      
      return {
        name: org.name,
        programs: orgPrograms.length,
        participants: totalParts,
        responses: totalResps,
        engagement,
      };
    }).sort((a, b) => b.engagement - a.engagement).slice(0, 6);'''

new_org_section = '''  // Activity type distribution
  const surveyCount = globalStats?.activity_types?.surveys || activities.filter(a => a.type === 'survey').length;
  const pollCount = globalStats?.activity_types?.polls || activities.filter(a => a.type === 'poll').length;
  const assessmentCount = globalStats?.activity_types?.assessments || activities.filter(a => a.type === 'assessment').length;
  
  // Use organization performance from dashboard API
  const filteredOrgPerformance = (orgPerformance || [])
    .filter((org: any) => 
      org.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map((org: any) => ({
      name: org.name,
      programs: org.programs_count || 0,
      participants: org.participants_count || 0,
      responses: org.responses_count || 0,
      engagement: org.effectiveness || 0,
    }))
    .slice(0, 6);'''

content = content.replace(old_org_section, new_org_section)

# 6. Update export report to use filteredOrgPerformance
content = content.replace(
    '      ...orgPerformance.map(org =>',
    '      ...filteredOrgPerformance.map(org =>'
)

# Write the file back
with open('/Users/yash/Documents/Projects/Qsights2.0/app/dashboard/page.tsx', 'w') as f:
    f.write(content)

print("Dashboard page updated successfully!")
