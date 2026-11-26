export function currentLang(lang) {
  return lang?.startsWith('hi') ? 'hi' : 'en';
}

export function pickIssueText(issue, lang) {
  if (!issue) return issue;
  if (currentLang(lang) !== 'hi') return issue;
  return {
    ...issue,
    title: issue.titleHi || issue.title,
    description: issue.descriptionHi || issue.description,
    location: issue.location
      ? {
          ...issue.location,
          address: issue.location.addressHi || issue.location.address,
          city: issue.location.cityHi || issue.location.city,
        }
      : issue.location,
    responsibleParty: issue.responsibleParty
      ? {
          ...issue.responsibleParty,
          name: issue.responsibleParty.nameHi || issue.responsibleParty.name,
        }
      : issue.responsibleParty,
    resolution: issue.resolution
      ? {
          ...issue.resolution,
          organizationName: issue.resolution.organizationNameHi || issue.resolution.organizationName,
          departmentOrLead: issue.resolution.departmentOrLeadHi || issue.resolution.departmentOrLead,
          resolutionDetails: issue.resolution.resolutionDetailsHi || issue.resolution.resolutionDetails,
          impactSummary: issue.resolution.impactSummaryHi || issue.resolution.impactSummary,
        }
      : issue.resolution,
  };
}
