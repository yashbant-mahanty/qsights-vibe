#!/bin/bash

# Update dashboard page to use new dashboard API endpoints

cd /Users/yash/Documents/Projects/Qsights2.0/app/dashboard

# Read the current file
INPUT_FILE="page.tsx"
OUTPUT_FILE="page_new.tsx"

# Use awk to make the complex replacements
awk '
BEGIN { in_load_data = 0; in_calc_stats = 0; in_org_perf = 0; print_line = 1; }

# Add dashboard API calls to loadData function
/async function loadData\(\) \{/ {
    print;
    print "    try {";
    print "      setLoading(true);";
    print "      const [";
    print "        orgsData,";
    print "        progsData,";
    print "        actsData,";
    print "        partsData,";
    print "        questData,";
    print "        dashStats,";
    print "        orgPerf";
    print "      ] = await Promise.all([";
    print "        organizationsApi.getAll().catch(() => []),";
    print "        programsApi.getAll().catch(() => []),";
    print "        activitiesApi.getAll().catch(() => []),";
    print "        participantsApi.getAll().catch(() => []),";
    print "        questionnairesApi.getAll().catch(() => []),";
    print "        dashboardApi.getGlobalStatistics().catch(() => null),";
    print "        dashboardApi.getOrganizationPerformance().catch(() => []),";
    print "      ]);";
    print "      setOrganizations(orgsData);";
    print "      setPrograms(progsData);";
    print "      setActivities(actsData);";
    print "      setParticipants(partsData);";
    print "      setQuestionnaires(questData);";
    print "      setGlobalStats(dashStats);";
    print "      setOrgPerformance(orgPerf);";
    in_load_data = 1;
    next;
}

# Skip old loadData content until we reach the closing brace
in_load_data == 1 {
    if (/^  \}$/ && in_load_data == 1) {
        in_load_data = 0;
        print "    } catch (error) {";
        print "      console.error('\''Error loading dashboard data:'\'', error);";
        print "    } finally {";
        print "      setLoading(false);";
        print "    }";
        print "  }";
        next;
    }
    next;
}

# Replace statistics calculations
/\/\/ Calculate statistics/ {
    print "  // Use global statistics from dashboard API (fallback to old method if not available)";
    print "  const totalOrganizations = globalStats?.organizations || organizations.length;";
    print "  const totalPrograms = globalStats?.programs || programs.length;";
    print "  const totalActivities = globalStats?.activities || activities.length;";
    print "  const totalParticipants = globalStats?.participants || participants.length;";
    in_calc_stats = 1;
    next;
}

in_calc_stats == 1 && /const engagementRate/ {
    print "  const authenticatedParticipants = participants.filter(p => !p.is_guest).length;";
    print "  const guestParticipants = participants.filter(p => p.is_guest).length;";
    print "  const totalQuestionnaires = questionnaires.length;";
    print "  ";
    print "  const totalResponses = globalStats?.responses || activities.reduce((sum, a) => sum + (a.responses_count || 0), 0);";
    print "  const authenticatedResponses = activities.reduce((sum, a) => sum + (a.authenticated_responses_count || 0), 0);";
    print "  const guestResponses = activities.reduce((sum, a) => sum + (a.guest_responses_count || 0), 0);";
    print "  const engagementRate = globalStats?.platform_engagement || 0;";
    in_calc_stats = 0;
    next;
}

in_calc_stats == 1 {
    next;
}

# Replace organization performance calculation
/\/\/ Top performing organizations/ {
    print "  // Activity type distribution";
    print "  const surveyCount = globalStats?.activity_types?.surveys || activities.filter(a => a.type === '\''survey'\'').length;";
    print "  const pollCount = globalStats?.activity_types?.polls || activities.filter(a => a.type === '\''poll'\'').length;";
    print "  const assessmentCount = globalStats?.activity_types?.assessments || activities.filter(a => a.type === '\''assessment'\'').length;";
    print "  ";
    print "  // Use organization performance from dashboard API";
    print "  const filteredOrgPerformance = (orgPerformance || [])";
    print "    .filter((org: any) => ";
    print "      org.name.toLowerCase().includes(searchQuery.toLowerCase())";
    print "    )";
    print "    .map((org: any) => ({";
    print "      name: org.name,";
    print "      programs: org.programs_count || 0,";
    print "      participants: org.participants_count || 0,";
    print "      responses: org.responses_count || 0,";
    print "      engagement: org.effectiveness || 0,";
    print "    }))";
    print "    .slice(0, 6);";
    in_org_perf = 1;
    next;
}

in_org_perf == 1 && /const stats = \[/ {
    in_org_perf = 0;
    print;
    next;
}

in_org_perf == 1 {
    next;
}

# Replace orgPerformance with filteredOrgPerformance in export
/\.\.\.orgPerformance\.map/ {
    print "      ...filteredOrgPerformance.map(org => ";
    next;
}

# Print all other lines
{ if (print_line == 1) print; }
' "$INPUT_FILE" > "$OUTPUT_FILE"

# Replace the original file
mv "$OUTPUT_FILE" "$INPUT_FILE"

echo "Dashboard page updated successfully!"
