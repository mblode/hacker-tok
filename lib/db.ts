import Dexie from "dexie";
import type { UserEvent } from "@/lib/types";

const db = new Dexie("hackertok") as Dexie & {
  events: Dexie.Table<UserEvent, number>;
};

db.version(1).stores({
  events: "++id, type, postId, timestamp, [type+postId]",
});

db.version(2).stores({
  events:
    "++id, type, postId, commentId, timestamp, [type+postId], [type+commentId]",
});

export { db };
