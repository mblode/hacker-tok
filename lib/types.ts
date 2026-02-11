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

export type EventType =
  | "like"
  | "comment_like"
  | "skip"
  | "dwell"
  | "click"
  | "navigate"
  | "bookmark"
  | "comment_bookmark";

export interface UserEvent {
  id?: number;
  type: EventType;
  postId: number;
  timestamp: number;
  score: number;
  dwellMs?: number;
  by?: string;
  domain?: string;
  title?: string;
  topics?: string[];
  url?: string | null;
  descendants?: number;
  commentId?: number;
  commentUser?: string;
  commentContent?: string;
  commentTime?: number;
}
