export type Category =
  | 'violent'
  | 'weapons'
  | 'property'
  | 'traffic'
  | 'disturbance'
  | 'drug'
  | 'medical'
  | 'admin'
  | 'other';

type Rule = { re: RegExp; category: Category; priority: number };

const rules: Rule[] = [
  {
    re: /\b(homicide|shoot(?:ing|s)|shots? fired|stabbing|robbery|assault with a deadly weapon)\b/i,
    category: 'violent',
    priority: 10
  },
  {
    re: /\b(brandishing|gun|weapon|armed|carjacking)\b/i,
    category: 'weapons',
    priority: 20
  },
  {
    re: /\b(burglary|residential burglary|commercial burglary|theft|larcen|shoplift|stolen|auto theft|vehicle theft)\b/i,
    category: 'property',
    priority: 30
  },
  {
    re: /\b(traffic collision|hit ?&? ?run|dui|reckless|speed|non-?injury|injury)\b/i,
    category: 'traffic',
    priority: 40
  },
  {
    re: /\b(disturbance|battery|domestic|fight|prowler|noise)\b/i,
    category: 'disturbance',
    priority: 50
  },
  {
    re: /\b(drug|narcotic|controlled substance|possession)\b/i,
    category: 'drug',
    priority: 60
  },
  {
    re: /\b(overdose|medical aid|ambulance|unconscious|cpr)\b/i,
    category: 'medical',
    priority: 70
  },
  {
    re: /\b(vehicle stop|patrol check|information|follow up|admin|welfare check)\b/i,
    category: 'admin',
    priority: 90
  }
];

export function classify(callType: string): { category: Category; priority: number } {
  for (const rule of rules) {
    if (rule.re.test(callType)) return { category: rule.category, priority: rule.priority };
  }
  return { category: 'other', priority: 80 };
}
