export type ChatHistory = {
  question: string;
  answer: {
    parts: { text: string }[];
    sources: { isNote: boolean; source: string }[];
  };
};
