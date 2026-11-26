import { describe, expect, it } from 'vitest';

import { currentLang, pickIssueText } from './localizeIssue';

describe('localizeIssue helpers', () => {
  it('normalizes language codes cleanly', () => {
    expect(currentLang('en')).toBe('en');
    expect(currentLang('en-IN')).toBe('en');
    expect(currentLang('hi')).toBe('hi');
    expect(currentLang('hi-IN')).toBe('hi');
    expect(currentLang(undefined)).toBe('en');
  });

  it('picks Hindi bilingual fields when active language is Hindi', () => {
    const issue = {
      _id: '1',
      title: 'English title',
      titleHi: 'हिंदी शीर्षक',
      description: 'English desc',
      descriptionHi: 'हिंदी विवरण',
      location: { address: 'Addr EN', addressHi: 'पता हिंदी', city: 'Ranchi', cityHi: 'रांची' },
      responsibleParty: { name: 'NGO EN', nameHi: 'एनजीओ हिंदी' },
      resolution: {
        organizationName: 'Org EN',
        organizationNameHi: 'संस्था हिंदी',
        resolutionDetails: 'Fixed it',
        resolutionDetailsHi: 'सुधार किया गया',
      },
    };

    expect(pickIssueText(issue, 'en').title).toBe('English title');
    const hi = pickIssueText(issue, 'hi-IN');
    expect(hi.title).toBe('हिंदी शीर्षक');
    expect(hi.description).toBe('हिंदी विवरण');
    expect(hi.location.address).toBe('पता हिंदी');
    expect(hi.location.city).toBe('रांची');
    expect(hi.responsibleParty.name).toBe('एनजीओ हिंदी');
    expect(hi.resolution.organizationName).toBe('संस्था हिंदी');
    expect(hi.resolution.resolutionDetails).toBe('सुधार किया गया');
  });

  it('falls back safely for Hindi-only user-submitted issues without titleHi', () => {
    const hiOnly = { _id: '2', title: 'केवल हिंदी शीर्षक', description: 'विवरण' };
    expect(pickIssueText(hiOnly, 'hi').title).toBe('केवल हिंदी शीर्षक');
  });
});
