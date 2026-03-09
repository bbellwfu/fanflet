export interface WorklogFeature {
  name: string;
  description: string;
}

export interface WorklogEntry {
  filename: string;
  date: string;
  dateLabel: string;
  titleSummary: string;
  overviewParagraph: string;
  features: WorklogFeature[];
  bugFixes: string[];
  infrastructure: string[];
}
