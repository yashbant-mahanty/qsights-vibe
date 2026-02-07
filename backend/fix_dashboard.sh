#!/bin/bash

cd /Users/yash/Documents/Projects/Qsights2.0/app/dashboard

# Create a backup
cp page.tsx page.tsx.sed_backup

# Use a temporary file for multi-line replacements
cat page.tsx | \
# 1. Add dashboardApi to imports (line 25)
sed '/questionnairesApi,/a\
  dashboardApi,' | \
# 2. Add state variables after searchQuery
sed '/const \[searchQuery, setSearchQuery\] = useState("");/a\
  const [globalStats, setGlobalStats] = useState<any>(null);\
  const [orgPerformance, setOrgPerformance] = useState<any[]>([]);' | \
# 3. Add dashboard API calls to Promise.all (after questionnaires line)
sed '/questionnairesApi.getAll().catch(() => \[\]),/a\
        dashboardApi.getGlobalStatistics().catch(() => null),\
        dashboardApi.getOrganizationPerformance().catch(() => []),' | \
# 4. Add setGlobalStats and setOrgPerformance after setQuestionnaires
sed '/setQuestionnaires(questData);/a\
      setGlobalStats(dashStats);\
      setOrgPerformance(orgPerf);' | \
# 5. Update const declaration in Promise.all
sed 's/const \[orgsData, progsData, actsData, partsData, questData\] = await Promise.all/const [orgsData, progsData, actsData, partsData, questData, dashStats, orgPerf] = await Promise.all/' | \
# 6. Update statistics to use globalStats
sed 's/const totalOrganizations = organizations.length;/const totalOrganizations = globalStats?.organizations || organizations.length;/' | \
sed 's/const totalPrograms = programs.length;/const totalPrograms = globalStats?.programs || programs.length;/' | \
sed 's/const totalActivities = activities.length;/const totalActivities = globalStats?.activities || activities.length;/' | \
sed 's/const totalParticipants = participants.length;/const totalParticipants = globalStats?.participants || participants.length;/' | \
sed 's/const totalResponses = activities.reduce/const totalResponses = globalStats?.responses || activities.reduce/' | \
# 7. Replace engagement rate calculation
sed 's/const engagementRate = totalParticipantsInActivities > 0/const engagementRate = globalStats?.platform_engagement || (totalParticipantsInActivities > 0/' | \
sed 's/: 0;$/: 0);/' | \
# 8. Update activity type counts
sed 's/const surveyCount = activities.filter(a => a.type === .survey.).length;/const surveyCount = globalStats?.activity_types?.surveys || activities.filter(a => a.type === '\''survey'\'').length;/' | \
sed 's/const pollCount = activities.filter(a => a.type === .poll.).length;/const pollCount = globalStats?.activity_types?.polls || activities.filter(a => a.type === '\''poll'\'').length;/' | \
sed 's/const assessmentCount = activities.filter(a => a.type === .assessment.).length;/const assessmentCount = globalStats?.activity_types?.assessments || activities.filter(a => a.type === '\''assessment'\'').length;/' > page_temp.tsx

mv page_temp.tsx page.tsx

echo "Dashboard updated with sed"
