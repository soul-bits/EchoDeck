import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (existing)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Presentation sessions
export const presentations = pgTable("presentations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  style: text("style").notNull().$type<"ted-talk" | "corporate-pitch" | "storybook">(),
  status: text("status").notNull().$type<"processing" | "completed" | "error">().default("processing"),
  audioUrl: text("audio_url"),
  transcriptText: text("transcript_text"),
  transcriptTimestamps: jsonb("transcript_timestamps").$type<{ word: string; start: number; end: number }[]>(),
  textPrompt: text("text_prompt"), // For text-based presentations
  skipImages: boolean("skip_images").default(false), // Skip image generation
  slideCount: integer("slide_count").default(0),
  estimatedDuration: text("estimated_duration"),
  processingStep: text("processing_step").$type<"transcription" | "outline-generation" | "image-generation" | "slide-assembly" | "export-ready">(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual slides
export const slides = pgTable("slides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  presentationId: varchar("presentation_id").notNull().references(() => presentations.id, { onDelete: "cascade" }),
  slideNumber: integer("slide_number").notNull(),
  title: text("title").notNull(),
  bulletPoints: jsonb("bullet_points").$type<string[]>().notNull(),
  speakerNotes: text("speaker_notes").notNull(),
  imageUrl: text("image_url"),
  imagePrompt: text("image_prompt"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Export records for tracking generated files
export const exports = pgTable("exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  presentationId: varchar("presentation_id").notNull().references(() => presentations.id, { onDelete: "cascade" }),
  format: text("format").notNull().$type<"pdf" | "html" | "video" | "google-slides" | "pptx">(),
  fileUrl: text("file_url"),
  filePath: text("file_path"), // Actual file system path for videos
  fileSize: integer("file_size"),
  isReady: boolean("is_ready").default(false),
  progress: integer("progress").default(0), // 0-100
  phase: text("phase").$type<"initializing" | "tts" | "rendering" | "assembly" | "complete" | "error">(),
  error: text("error"), // Error message if failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPresentationSchema = createInsertSchema(presentations).pick({
  title: true,
  style: true,
  textPrompt: true,
  skipImages: true,
});

export const insertSlideSchema = createInsertSchema(slides).omit({
  id: true,
  createdAt: true,
});

export const insertExportSchema = createInsertSchema(exports).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPresentation = z.infer<typeof insertPresentationSchema>;
export type Presentation = typeof presentations.$inferSelect;

export type InsertSlide = z.infer<typeof insertSlideSchema>;
export type Slide = typeof slides.$inferSelect;

export type InsertExport = z.infer<typeof insertExportSchema>;
export type Export = typeof exports.$inferSelect;

// API response types
export type PresentationWithSlides = Presentation & {
  slides: Slide[];
  exports: Export[];
};

export type ProcessingStatus = {
  presentationId: string;
  status: Presentation['status'];
  processingStep: Presentation['processingStep'];
  progress: number;
  message: string;
};

// Video export options Zod schema
export const videoExportOptionsSchema = z.object({
  quality: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional().default('alloy'),
  ttsModel: z.enum(['tts-1', 'tts-1-hd']).optional().default('tts-1'),
  transition: z.object({
    type: z.enum(['none', 'crossfade', 'fade-to-black', 'slide', 'wipe']).default('crossfade'),
    duration: z.number().min(0).max(5).default(0.5)
  }).optional().default({ type: 'crossfade', duration: 0.5 }),
  format: z.enum(['mp4', 'avi', 'mov']).optional().default('mp4'),
}).strict();

// Video export options type
export type VideoExportOptions = z.infer<typeof videoExportOptionsSchema>;

// Video export progress tracking
export type VideoProgress = {
  phase: 'initializing' | 'tts' | 'rendering' | 'assembly' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  error?: string;
};

// Export status response
export type ExportStatus = {
  id: string;
  presentationId: string;
  format: string;
  isReady: boolean;
  progress: number;
  phase?: string;
  error?: string;
  fileSize?: number;
  createdAt: Date;
  updatedAt?: Date;
};