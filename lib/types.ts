export interface CandidateStory {
  id: number;
  title: string;
  url: string | null;
  by: string;
  time: number;
  score: number;
  descendants: number;
}

export interface HNComment {
  id: string | number;
  user: string;
  time: number;
  content: string;
  level: number;
  comments: HNComment[];
}

export interface HNItem {
  id: number;
  title: string;
  points: number;
  user: string;
  time: number;
  type: string;
  url: string;
  domain?: string;
  content: string;
  comments_count: number;
  comments: HNComment[];
}

export type EventType = "like" | "skip" | "dwell";

export interface UserEvent {
  type: EventType;
  postId: number;
  timestamp: number;
  score: number;
  dwellMs?: number;
}
