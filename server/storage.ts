import { 
  type User, 
  type InsertUser, 
  type Presentation, 
  type InsertPresentation, 
  type Slide, 
  type InsertSlide,
  type Export,
  type InsertExport,
  type PresentationWithSlides,
  type ProcessingStatus,
  type VideoProgress,
  type ExportStatus
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Presentation methods
  createPresentation(presentation: InsertPresentation): Promise<Presentation>;
  getPresentation(id: string): Promise<Presentation | undefined>;
  getPresentationWithSlides(id: string): Promise<PresentationWithSlides | undefined>;
  updatePresentationStatus(id: string, status: Presentation['status'], step?: Presentation['processingStep']): Promise<void>;
  updatePresentationTranscript(id: string, transcript: string, timestamps?: any[]): Promise<void>;
  updatePresentation(id: string, updates: Partial<Presentation>): Promise<void>;

  // Slide methods
  createSlide(slide: InsertSlide): Promise<Slide>;
  getSlidesByPresentation(presentationId: string): Promise<Slide[]>;
  updateSlide(id: string, updates: Partial<Slide>): Promise<void>;

  // Export methods
  createExport(exportData: InsertExport): Promise<Export>;
  getExport(id: string): Promise<Export | undefined>;
  getExportsByPresentation(presentationId: string): Promise<Export[]>;
  updateExportStatus(id: string, isReady: boolean, fileUrl?: string, errorMessage?: string): Promise<void>;
  updateExportProgress(id: string, progress: number, phase?: string, message?: string, error?: string): Promise<void>;
  updateExportFilePath(id: string, filePath: string, fileSize?: number): Promise<void>;
  getExportStatus(id: string): Promise<ExportStatus | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private presentations: Map<string, Presentation> = new Map();
  private slides: Map<string, Slide> = new Map();
  private exports: Map<string, Export> = new Map();

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Presentation methods
  async createPresentation(insertPresentation: InsertPresentation): Promise<Presentation> {
    const id = randomUUID();
    const now = new Date();
    const presentation: Presentation = {
      id,
      title: insertPresentation.title,
      style: insertPresentation.style as "ted-talk" | "corporate-pitch" | "storybook",
      status: "processing",
      audioUrl: null,
      transcriptText: null,
      transcriptTimestamps: null,
      textPrompt: insertPresentation.textPrompt || null,
      skipImages: insertPresentation.skipImages || false,
      slideCount: 0,
      estimatedDuration: null,
      processingStep: null,
      createdAt: now,
      updatedAt: now,
    };
    this.presentations.set(id, presentation);
    return presentation;
  }

  async getPresentation(id: string): Promise<Presentation | undefined> {
    return this.presentations.get(id);
  }

  async getPresentationWithSlides(id: string): Promise<PresentationWithSlides | undefined> {
    const presentation = this.presentations.get(id);
    if (!presentation) return undefined;

    const slides = Array.from(this.slides.values())
      .filter(slide => slide.presentationId === id)
      .sort((a, b) => a.slideNumber - b.slideNumber);

    const exports = Array.from(this.exports.values())
      .filter(exp => exp.presentationId === id);

    return {
      ...presentation,
      slides,
      exports,
    };
  }

  async updatePresentationStatus(
    id: string, 
    status: Presentation['status'], 
    step?: Presentation['processingStep']
  ): Promise<void> {
    const presentation = this.presentations.get(id);
    if (!presentation) return;

    const updated = {
      ...presentation,
      status,
      processingStep: step ?? presentation.processingStep,
      updatedAt: new Date(),
    };
    this.presentations.set(id, updated);
  }

  async updatePresentationTranscript(
    id: string, 
    transcript: string, 
    timestamps?: any[]
  ): Promise<void> {
    const presentation = this.presentations.get(id);
    if (!presentation) return;

    const updated = {
      ...presentation,
      transcriptText: transcript,
      transcriptTimestamps: timestamps || null,
      updatedAt: new Date(),
    };
    this.presentations.set(id, updated);
  }

  async updatePresentation(id: string, updates: Partial<Presentation>): Promise<void> {
    const presentation = this.presentations.get(id);
    if (!presentation) return;

    const updated = {
      ...presentation,
      ...updates,
      updatedAt: new Date(),
    };
    this.presentations.set(id, updated);
  }

  // Slide methods
  async createSlide(insertSlide: InsertSlide): Promise<Slide> {
    const id = randomUUID();
    const slide: Slide = {
      id,
      presentationId: insertSlide.presentationId,
      slideNumber: insertSlide.slideNumber,
      title: insertSlide.title,
      bulletPoints: insertSlide.bulletPoints as string[],
      speakerNotes: insertSlide.speakerNotes,
      imageUrl: insertSlide.imageUrl || null,
      imagePrompt: insertSlide.imagePrompt || null,
      createdAt: new Date(),
    };
    this.slides.set(id, slide);
    return slide;
  }

  async getSlidesByPresentation(presentationId: string): Promise<Slide[]> {
    return Array.from(this.slides.values())
      .filter(slide => slide.presentationId === presentationId)
      .sort((a, b) => a.slideNumber - b.slideNumber);
  }

  async updateSlide(id: string, updates: Partial<Slide>): Promise<void> {
    const slide = this.slides.get(id);
    if (!slide) return;

    const updated = { ...slide, ...updates };
    this.slides.set(id, updated);
  }

  // Export methods
  async createExport(insertExport: InsertExport): Promise<Export> {
    const id = randomUUID();
    const now = new Date();
    const exportData: Export = {
      id,
      presentationId: insertExport.presentationId,
      format: insertExport.format as "pdf" | "html" | "video" | "google-slides",
      fileUrl: insertExport.fileUrl || null,
      filePath: null,
      fileSize: insertExport.fileSize || null,
      isReady: insertExport.isReady || false,
      progress: 0,
      phase: "initializing",
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    this.exports.set(id, exportData);
    return exportData;
  }

  async getExport(id: string): Promise<Export | undefined> {
    return this.exports.get(id);
  }

  async getExportsByPresentation(presentationId: string): Promise<Export[]> {
    return Array.from(this.exports.values())
      .filter(exp => exp.presentationId === presentationId);
  }

  async updateExportStatus(id: string, isReady: boolean, fileUrl?: string, errorMessage?: string): Promise<void> {
    const exportData = this.exports.get(id);
    if (!exportData) return;

    const updated = {
      ...exportData,
      isReady,
      fileUrl: fileUrl || exportData.fileUrl,
      error: errorMessage || null,
      progress: isReady ? 100 : (errorMessage ? exportData.progress : exportData.progress),
      phase: isReady ? "complete" : (errorMessage ? "error" : exportData.phase),
      updatedAt: new Date(),
    };
    this.exports.set(id, updated);
  }

  async updateExportProgress(id: string, progress: number, phase?: string, message?: string, error?: string): Promise<void> {
    const exportData = this.exports.get(id);
    if (!exportData) return;

    const updated = {
      ...exportData,
      progress: Math.max(0, Math.min(100, progress)),
      phase: phase || exportData.phase,
      error: error || exportData.error,
      updatedAt: new Date(),
    };
    this.exports.set(id, updated);
  }

  async updateExportFilePath(id: string, filePath: string, fileSize?: number): Promise<void> {
    const exportData = this.exports.get(id);
    if (!exportData) return;

    const updated = {
      ...exportData,
      filePath,
      fileSize: fileSize || exportData.fileSize,
      updatedAt: new Date(),
    };
    this.exports.set(id, updated);
  }

  async getExportStatus(id: string): Promise<ExportStatus | undefined> {
    const exportData = this.exports.get(id);
    if (!exportData) return undefined;

    return {
      id: exportData.id,
      presentationId: exportData.presentationId,
      format: exportData.format,
      isReady: exportData.isReady,
      progress: exportData.progress || 0,
      phase: exportData.phase || undefined,
      error: exportData.error || undefined,
      fileSize: exportData.fileSize || undefined,
      createdAt: exportData.createdAt,
      updatedAt: exportData.updatedAt || undefined,
    };
  }
}

export const storage = new MemStorage();