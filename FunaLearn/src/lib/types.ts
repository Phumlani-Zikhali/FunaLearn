export interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  goal: number;
}
export interface Lesson {
  id: string;
  title: string;
  subject: string;
  topic: string;
  minutes: number;
  source: string;
  body?: { heading: string; text: string }[];
  note?: string;
}
export interface Deck {
  id: string;
  title: string;
  lesson_id: string;
  count: number;
  due: number;
  cards?: Card[];
}
export interface Card {
  id: string;
  front: string;
  back: string;
  due: string | null;
}
export interface Question {
  id: string;
  prompt: string;
  options: string[];
  answer?: number;
  explanation?: string;
  correct?: boolean;
  chosen?: number;
}
export interface Quiz {
  id: string;
  title: string;
  lesson_id: string;
  count: number;
  questions?: Question[];
}
export interface Attempt {
  id: string;
  quiz_id: string;
  score: number;
  total: number;
  created: string;
}
export interface Activity {
  id: string;
  kind: string;
  ref: string;
  title: string;
  xp: number;
  created: string;
}
export interface Progress {
  reviewedDecks: string[];
  xp: number;
  streak: number;
  level: number;
  today: number;
  completed: string[];
  events: Activity[];
  attempts: Attempt[];
  badges: {
    id: string;
    name: string;
    description: string;
    earned: boolean;
    earnedAt: string | null;
    current: number;
    target: number;
  }[];
}
export interface Resource {
  id: string;
  title: string;
  subject: string;
  body: string;
  author: string;
  approved: number;
  class_id: string;
}
export interface Assignment {
  id: string;
  title: string;
  kind: "lesson" | "quiz" | "deck";
  ref: string;
  due: string;
  completed: boolean;
  class_id: string;
}
export interface ClassRoom {
  id: string;
  name: string;
  teacher_id: string;
}
export interface State {
  user: User;
  lessons: Lesson[];
  decks: Deck[];
  quizzes: Quiz[];
  resources: Resource[];
  assignments: Assignment[];
  classes: ClassRoom[];
  progress: Progress;
  aiAvailable: boolean;
}
export interface QuizResult {
  score: number;
  total: number;
  result: Question[];
}
