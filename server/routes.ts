import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { openaiService } from "./services/openai";
import { googleSlidesService } from "./services/googleSlides";
import { ttsService } from "./services/tts";
import { SlideRenderer } from "./services/slideRenderer";
import { VideoAssemblyService, VIDEO_QUALITY_PRESETS } from "./services/videoAssembly";
import { pptxGenerator } from "./services/pptxGenerator";
import { pptxConverter } from "./services/pptxConverter";
import { insertPresentationSchema, VideoExportOptions, videoExportOptionsSchema } from "@shared/schema";
import { ZodError } from "zod";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 
      'audio/webm', 'audio/m4a', 'audio/flac', 'audio/x-wav'
    ];
    console.log("Uploaded file mimetype:", file.mimetype, "originalname:", file.originalname);
    
    // For WebM files, rename them to have .webm extension to help OpenAI
    if (file.mimetype === 'audio/webm' || file.originalname.includes('.webm')) {
      console.log("Converting WebM to MP3-compatible filename for OpenAI compatibility");
      file.originalname = file.originalname.replace(/\.webm$/, '.ogg');
    }
    
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a|ogg|webm|flac)$/i)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Supported formats: MP3, WAV, M4A, OGG, WEBM, FLAC`));
    }
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize video services
const slideRenderer = new SlideRenderer();
const videoAssemblyService = new VideoAssemblyService(storage);

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Error handler for multer
  app.use((error: any, req: Request, res: Response, next: Function) => {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: `File upload error: ${error.message}` });
    } else if (error) {
      return res.status(400).json({ error: error.message });
    }
    next();
  });
  
  // Create new presentation
  app.post("/api/presentations", async (req: Request, res: Response) => {
    try {
      const data = insertPresentationSchema.parse(req.body);
      const presentation = await storage.createPresentation(data);
      
      // If textPrompt is provided, start text processing immediately
      if (data.textPrompt) {
        console.log(`Starting text-based processing for presentation ${presentation.id}`);
        processTextPromptAsync(presentation.id, data.textPrompt, data.style as "ted-talk" | "corporate-pitch" | "storybook", data.skipImages || false)
          .catch(error => {
            console.error("Text processing failed:", error);
            storage.updatePresentationStatus(presentation.id, "error");
          });
      }
      
      res.json(presentation);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: "Validation error", details: error.errors });
      } else {
        console.error("Create presentation error:", error);
        res.status(500).json({ error: "Failed to create presentation" });
      }
    }
  });

  // Configuration endpoint for feature flags
  app.get("/api/config", (req: Request, res: Response) => {
    res.json({
      googleSlidesEnabled: googleSlidesService.isConfigured(),
      ttsEnabled: ttsService.isConfigured(),
      ttsVoices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      ttsModels: ['tts-1', 'tts-1-hd'],
      ttsFormats: ['mp3', 'opus', 'aac', 'flac']
    });
  });

  // Get presentation with slides
  app.get("/api/presentations/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const presentation = await storage.getPresentationWithSlides(id);
      
      if (!presentation) {
        return res.status(404).json({ error: "Presentation not found" });
      }
      
      res.json(presentation);
    } catch (error) {
      console.error("Get presentation error:", error);
      res.status(500).json({ error: "Failed to get presentation" });
    }
  });

  // Upload and process audio
  app.post("/api/presentations/:id/audio", upload.single('audio'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const audioFile = req.file;
      
      if (!audioFile) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const presentation = await storage.getPresentation(id);
      if (!presentation) {
        return res.status(404).json({ error: "Presentation not found" });
      }

      // Update status to processing transcription
      await storage.updatePresentationStatus(id, "processing", "transcription");

      // Process audio in background
      processAudioAsync(id, audioFile.path, presentation.style)
        .catch(error => {
          console.error("Audio processing failed:", error);
          storage.updatePresentationStatus(id, "error");
        });

      res.json({ message: "Audio uploaded successfully, processing started" });
    } catch (error) {
      console.error("Audio upload error:", error);
      res.status(500).json({ error: "Failed to upload audio" });
    }
  });

  // Get processing status
  app.get("/api/presentations/:id/status", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const presentation = await storage.getPresentation(id);
      
      if (!presentation) {
        return res.status(404).json({ error: "Presentation not found" });
      }

      res.json({
        id: presentation.id,
        status: presentation.status,
        processingStep: presentation.processingStep,
        title: presentation.title,
        slideCount: presentation.slideCount,
        estimatedDuration: presentation.estimatedDuration,
        transcriptText: presentation.transcriptText,
        updatedAt: presentation.updatedAt
      });
    } catch (error) {
      console.error("Get status error:", error);
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  // Export presentation (only creates export job, returns 202)
  app.post("/api/presentations/:id/export", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { format, videoOptions } = req.body;
      
      if (!['pdf', 'html', 'video', 'google-slides', 'pptx'].includes(format)) {
        return res.status(400).json({ error: "Invalid export format" });
      }

      // Validate video options if format is video
      let validatedVideoOptions: VideoExportOptions | undefined;
      if (format === 'video' && videoOptions) {
        try {
          validatedVideoOptions = videoExportOptionsSchema.parse(videoOptions);
        } catch (error) {
          if (error instanceof ZodError) {
            return res.status(400).json({ 
              error: "Invalid video options", 
              details: error.errors 
            });
          }
          throw error;
        }
      }

      // Fail fast for Google Slides if not configured
      if (format === 'google-slides' && !googleSlidesService.isConfigured()) {
        return res.status(503).json({ 
          error: "Google Slides integration not configured", 
          message: "Please configure ZAPIER_MCP_API_KEY environment variable to enable Google Slides exports" 
        });
      }

      const presentation = await storage.getPresentationWithSlides(id);
      if (!presentation) {
        return res.status(404).json({ error: "Presentation not found" });
      }

      if (presentation.status !== "completed") {
        return res.status(400).json({ error: "Presentation not ready for export" });
      }

      // Create export record
      const exportRecord = await storage.createExport({
        presentationId: id,
        format: format as "pdf" | "html" | "video" | "google-slides" | "pptx",
        fileUrl: null,
        isReady: false
      });

      // Process export in background
      processExportAsync(exportRecord.id, presentation, format, validatedVideoOptions)
        .catch(error => {
          console.error("Export processing failed:", error);
        });

      // Return 202 Accepted with exportId for job tracking
      res.status(202).json({ 
        exportId: exportRecord.id, 
        message: "Export job created",
        statusUrl: `/api/exports/${exportRecord.id}/status`,
        downloadUrl: `/api/exports/${exportRecord.id}/download`
      });
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to start export" });
    }
  });

  // Get export status
  app.get("/api/exports/:exportId/status", async (req: Request, res: Response) => {
    try {
      const { exportId } = req.params;
      
      const exportStatus = await storage.getExportStatus(exportId);
      if (!exportStatus) {
        return res.status(404).json({ error: "Export not found" });
      }

      res.json(exportStatus);
    } catch (error) {
      console.error("Get export status error:", error);
      res.status(500).json({ error: "Failed to get export status" });
    }
  });

  // Download export file (secure streaming)
  app.get("/api/exports/:exportId/download", async (req: Request, res: Response) => {
    try {
      const { exportId } = req.params;
      
      const exportRecord = await storage.getExport(exportId);
      if (!exportRecord) {
        return res.status(404).json({ error: "Export not found" });
      }

      if (!exportRecord.isReady) {
        return res.status(425).json({ 
          error: "Export not ready yet", 
          progress: exportRecord.progress || 0,
          phase: exportRecord.phase || "initializing"
        });
      }

      if (exportRecord.error) {
        return res.status(500).json({ 
          error: "Export failed", 
          message: exportRecord.error 
        });
      }

      // Get presentation for filename
      const presentation = await storage.getPresentationWithSlides(exportRecord.presentationId);
      if (!presentation) {
        return res.status(404).json({ error: "Presentation not found" });
      }

      switch (exportRecord.format) {
        case 'video':
          return await handleVideoDownload(req, res, exportRecord, presentation);
        case 'google-slides':
          // For Google Slides, redirect to the stored URL
          if (exportRecord.fileUrl) {
            return res.redirect(exportRecord.fileUrl);
          }
          return res.status(404).json({ error: "Google Slides URL not found" });
        case 'pdf':
        case 'html':
          return await handleGeneratedFileDownload(req, res, exportRecord, presentation);
        case 'pptx':
          return await handlePptxDownload(req, res, exportRecord, presentation);
        default:
          return res.status(400).json({ error: "Invalid format" });
      }
      
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download export" });
    }
  });

  // Legacy download route (for backwards compatibility)
  app.get("/api/presentations/:id/export/:exportId/download", async (req: Request, res: Response) => {
    try {
      const { id, exportId } = req.params;
      
      const exportRecord = await storage.getExport(exportId);
      if (!exportRecord || exportRecord.presentationId !== id) {
        return res.status(404).json({ error: "Export not found" });
      }

      if (!exportRecord.isReady) {
        return res.status(400).json({ error: "Export not ready yet" });
      }

      // Generate file content based on format
      const presentation = await storage.getPresentationWithSlides(id);
      if (!presentation) {
        return res.status(404).json({ error: "Presentation not found" });
      }

      let content: string;
      let contentType: string;
      let filename: string;

      switch (exportRecord.format) {
        case 'pdf':
          content = generatePdfContent(presentation);
          contentType = 'application/pdf';
          filename = `${presentation.title || 'presentation'}.pdf`;
          break;
        case 'html':
          content = generateHtmlContent(presentation);
          contentType = 'text/html';
          filename = `${presentation.title || 'presentation'}.html`;
          break;
        case 'google-slides':
          // For Google Slides, redirect to the stored URL (no on-demand creation)
          if (exportRecord.fileUrl) {
            return res.redirect(exportRecord.fileUrl);
          }
          return res.status(404).json({ error: "Google Slides URL not found" });
        case 'video':
          // Serve video file directly
          const videoFilePath = await getSecureVideoFilePath(exportRecord);
          if (!videoFilePath || !fs.existsSync(videoFilePath)) {
            return res.status(404).json({ error: "Video file not found" });
          }

          const videoStats = fs.statSync(videoFilePath);
          const videoExtension = path.extname(videoFilePath).toLowerCase();
          const mimeType = videoExtension === '.mp4' ? 'video/mp4' : 
                          videoExtension === '.avi' ? 'video/x-msvideo' :
                          videoExtension === '.mov' ? 'video/quicktime' : 'video/mp4';
          
          filename = `${presentation.title || 'presentation'}${videoExtension}`;
          
          res.setHeader('Content-Type', mimeType);
          res.setHeader('Content-Length', videoStats.size);
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          
          // Stream the video file
          const videoStream = fs.createReadStream(videoFilePath);
          videoStream.pipe(res);
          return;
        case 'pptx':
          // Serve PPTX file directly
          if (!exportRecord.filePath || !fs.existsSync(exportRecord.filePath)) {
            return res.status(404).json({ error: "PPTX file not found" });
          }

          const pptxStats = fs.statSync(exportRecord.filePath);
          filename = `${presentation.title || 'presentation'}.pptx`;
          
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
          res.setHeader('Content-Length', pptxStats.size);
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          
          // Stream the PPTX file
          const pptxStream = fs.createReadStream(exportRecord.filePath);
          pptxStream.pipe(res);
          return;
        default:
          return res.status(400).json({ error: "Invalid format" });
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
      
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download export" });
    }
  });

  // Health check
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Secure file streaming handlers
async function handleVideoDownload(req: Request, res: Response, exportRecord: any, presentation: any): Promise<void> {
  try {
    // Get video file path with security validation
    const videoFilePath = await getSecureVideoFilePath(exportRecord);
    if (!videoFilePath || !fs.existsSync(videoFilePath)) {
      res.status(404).json({ error: "Video file not found" });
      return;
    }

    const videoStats = fs.statSync(videoFilePath);
    const videoExtension = path.extname(videoFilePath).toLowerCase();
    const mimeType = videoExtension === '.mp4' ? 'video/mp4' : 
                    videoExtension === '.avi' ? 'video/x-msvideo' :
                    videoExtension === '.mov' ? 'video/quicktime' : 'video/mp4';
    
    const filename = `${presentation.title || 'presentation'}${videoExtension}`;
    
    // Set headers for video streaming
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', videoStats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Handle HTTP range requests for large video files
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : videoStats.size - 1;
      
      // Validate range request
      if (isNaN(start) || start < 0 || start >= videoStats.size || 
          (parts[1] && (isNaN(end) || end < start || end >= videoStats.size))) {
        res.status(416);
        res.setHeader('Content-Range', `bytes */${videoStats.size}`);
        res.json({ error: "Range not satisfiable" });
        return;
      }
      
      const chunkSize = (end - start) + 1;
      
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${videoStats.size}`);
      res.setHeader('Content-Length', chunkSize);
      
      const stream = fs.createReadStream(videoFilePath, { start, end });
      streamFileWithErrorHandling(stream, res);
    } else {
      // Stream entire file
      const stream = fs.createReadStream(videoFilePath);
      streamFileWithErrorHandling(stream, res);
    }
  } catch (error) {
    console.error("Video download error:", error);
    res.status(500).json({ error: "Failed to download video" });
  }
}

async function handleGeneratedFileDownload(req: Request, res: Response, exportRecord: any, presentation: any): Promise<void> {
  try {
    let content: string;
    let contentType: string;
    let filename: string;

    switch (exportRecord.format) {
      case 'pdf':
        content = generatePdfContent(presentation);
        contentType = 'application/pdf';
        filename = `${presentation.title || 'presentation'}.pdf`;
        break;
      case 'html':
        content = generateHtmlContent(presentation);
        contentType = 'text/html';
        filename = `${presentation.title || 'presentation'}.html`;
        break;
      default:
        res.status(400).json({ error: "Invalid format" });
        return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    console.error("Generated file download error:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
}

async function handlePptxDownload(req: Request, res: Response, exportRecord: any, presentation: any) {
  try {
    if (!exportRecord.filePath || !fs.existsSync(exportRecord.filePath)) {
      return res.status(404).json({ error: "PPTX file not found" });
    }

    const stats = fs.statSync(exportRecord.filePath);
    const filename = `${presentation.title || 'presentation'}.pptx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream the PPTX file
    const fileStream = fs.createReadStream(exportRecord.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("PPTX download error:", error);
    res.status(500).json({ error: "Failed to download PPTX file" });
  }
}

// Secure path validation for video files
async function getSecureVideoFilePath(exportRecord: any): Promise<string | null> {
  try {
    if (!exportRecord.filePath) {
      console.warn(`No file path found for export ${exportRecord.id}`);
      return null;
    }

    // Resolve and validate the path to prevent path traversal attacks
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const requestedPath = path.resolve(exportRecord.filePath);
    
    // Ensure the file is within the uploads directory
    if (!requestedPath.startsWith(uploadsDir)) {
      console.error(`Path traversal attempt detected: ${exportRecord.filePath}`);
      return null;
    }

    // Additional validation: ensure it's in the videos subdirectory
    const videosDir = path.join(uploadsDir, 'videos');
    if (!requestedPath.startsWith(videosDir)) {
      console.error(`Video file not in videos directory: ${requestedPath}`);
      return null;
    }

    return requestedPath;
  } catch (error) {
    console.error(`Path validation error for export ${exportRecord.id}:`, error);
    return null;
  }
}

// Stream file with proper error handling
function streamFileWithErrorHandling(stream: fs.ReadStream, res: Response): void {
  stream.on('error', (error) => {
    console.error('File stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream file' });
    }
  });

  stream.on('close', () => {
    console.log('File stream closed');
  });

  res.on('close', () => {
    console.log('Response closed, destroying stream');
    stream.destroy();
  });

  stream.pipe(res);
}

// Background processing functions
async function processTextPromptAsync(
  presentationId: string, 
  textPrompt: string, 
  style: "ted-talk" | "corporate-pitch" | "storybook",
  skipImages: boolean
) {
  try {
    console.log(`Processing text prompt for presentation ${presentationId}`);
    
    // Update transcript with the provided text prompt
    await storage.updatePresentationTranscript(presentationId, textPrompt, undefined);
    await storage.updatePresentationStatus(presentationId, "processing", "outline-generation");

    // Generate presentation outline using the text prompt
    console.log(`Generating outline for presentation ${presentationId}`);
    const outline = await openaiService.generatePresentationOutline(textPrompt, style);
    
    // Create slides
    if (skipImages) {
      await storage.updatePresentationStatus(presentationId, "processing", "slide-assembly");
    } else {
      await storage.updatePresentationStatus(presentationId, "processing", "image-generation");
    }
    
    for (let i = 0; i < outline.slides.length; i++) {
      const slideData = outline.slides[i];
      
      try {
        let imageUrl = null;
        
        // Only generate images if not skipping
        if (!skipImages) {
          imageUrl = await openaiService.generateSlideImage(slideData.imagePrompt);
        }
        
        // Create slide record
        await storage.createSlide({
          presentationId,
          slideNumber: i + 1,
          title: slideData.title,
          bulletPoints: slideData.bulletPoints,
          speakerNotes: slideData.speakerNotes,
          imageUrl,
          imagePrompt: slideData.imagePrompt
        });
        
        console.log(`Created slide ${i + 1} for presentation ${presentationId}${skipImages ? ' (no image)' : ' (with image)'}`);
      } catch (error) {
        console.error(`Failed to create slide ${i + 1}:`, error);
        // Continue with other slides even if one fails
      }
    }

    // Finalize
    await storage.updatePresentationStatus(presentationId, "processing", "export-ready");
    
    // Update presentation with final details
    await storage.updatePresentation(presentationId, {
      slideCount: outline.slides.length,
      estimatedDuration: outline.estimatedDuration,
    });
    
    await storage.updatePresentationStatus(presentationId, "completed", "export-ready");
    console.log(`Text-based presentation ${presentationId} completed with ${outline.slides.length} slides${skipImages ? ' (images skipped)' : ''}`);
    
  } catch (error) {
    console.error("Text processing failed:", error);
    await storage.updatePresentationStatus(presentationId, "error");
  }
}

async function processAudioAsync(presentationId: string, audioFilePath: string, style: "ted-talk" | "corporate-pitch" | "storybook") {
  try {
    // Get presentation to check skipImages flag
    const presentation = await storage.getPresentation(presentationId);
    const skipImages = presentation?.skipImages || false;
    
    // Step 1: Transcribe audio
    console.log(`Processing audio for presentation ${presentationId}${skipImages ? ' (images will be skipped)' : ''}`);
    const transcription = await openaiService.transcribeAudio(audioFilePath);
    
    await storage.updatePresentationTranscript(presentationId, transcription.text, transcription.timestamps);
    await storage.updatePresentationStatus(presentationId, "processing", "outline-generation");

    // Step 2: Generate presentation outline
    console.log(`Generating outline for presentation ${presentationId}`);
    const outline = await openaiService.generatePresentationOutline(transcription.text, style);
    
    // Step 3: Create slides
    if (skipImages) {
      await storage.updatePresentationStatus(presentationId, "processing", "slide-assembly");
    } else {
      await storage.updatePresentationStatus(presentationId, "processing", "image-generation");
    }
    
    for (let i = 0; i < outline.slides.length; i++) {
      const slideData = outline.slides[i];
      
      try {
        let imageUrl = null;
        
        // Only generate images if not skipping
        if (!skipImages) {
          imageUrl = await openaiService.generateSlideImage(slideData.imagePrompt);
        }
        
        // Create slide record
        await storage.createSlide({
          presentationId,
          slideNumber: i + 1,
          title: slideData.title,
          bulletPoints: slideData.bulletPoints,
          speakerNotes: slideData.speakerNotes,
          imageUrl,
          imagePrompt: slideData.imagePrompt
        });
        
        console.log(`Created slide ${i + 1} for presentation ${presentationId}${skipImages ? ' (no image)' : ' (with image)'}`);
      } catch (error) {
        console.error(`Failed to create slide ${i + 1}:`, error);
        // Continue with other slides even if one fails
      }
    }

    // Step 4: Finalize
    await storage.updatePresentationStatus(presentationId, "processing", "export-ready");
    
    // Update presentation with final details
    await storage.updatePresentation(presentationId, {
      slideCount: outline.slides.length,
      estimatedDuration: outline.estimatedDuration,
    });
    
    await storage.updatePresentationStatus(presentationId, "completed", "export-ready");
    console.log(`Presentation ${presentationId} completed with ${outline.slides.length} slides`);
    
  } catch (error) {
    console.error("Audio processing failed:", error);
    await storage.updatePresentationStatus(presentationId, "error");
  } finally {
    // Clean up uploaded file regardless of success/error
    try {
      fs.unlinkSync(audioFilePath);
    } catch (error) {
      console.warn("Failed to clean up audio file:", error);
    }
  }
}

async function processExportAsync(exportId: string, presentation: any, format: string, options?: VideoExportOptions) {
  try {
    console.log(`Generating ${format} export for presentation ${presentation.id} using PPTX-first approach`);
    
    let fileUrl = "";
    let fileSize = 0;
    
    // Step 1: Always generate a high-quality PPTX as the master format (except for video)
    let masterPptxPath: string = "";
    
    if (format !== 'video') {
      console.log(`Creating master PPTX for format conversion to ${format}`);
      await storage.updateExportProgress(exportId, 30, "pptx", "Creating master presentation...");
      
      const pptxResult = await pptxGenerator.generatePresentation(
        presentation.slides,
        presentation.title || 'Presentation',
        {
          templateStyle: 'professional',
          includeImages: true,
          includeNotes: true
        }
      );
      
      masterPptxPath = pptxResult.filePath;
      
      // If the requested format is PPTX, we're done!
      if (format === 'pptx') {
        await storage.updateExportFilePath(exportId, pptxResult.filePath, pptxResult.fileSize);
        fileUrl = `/api/exports/${exportId}/download`;
        fileSize = pptxResult.fileSize;
        await storage.updateExportStatus(exportId, true, fileUrl);
        console.log(`PPTX export ${exportId} completed`);
        return;
      }
    }
    
    // Step 2: Convert the master PPTX to the requested format
    switch (format) {
      case 'pdf':
        console.log(`Converting PPTX to PDF for export ${exportId}`);
        await storage.updateExportProgress(exportId, 70, "conversion", "Converting to PDF...");
        
        const pdfResult = await pptxConverter.convertToPDF(masterPptxPath, presentation);
        await storage.updateExportFilePath(exportId, pdfResult.filePath, pdfResult.fileSize);
        fileUrl = `/api/exports/${exportId}/download`;
        fileSize = pdfResult.fileSize;
        break;
        
      case 'html':
        console.log(`Converting PPTX to HTML for export ${exportId}`);
        await storage.updateExportProgress(exportId, 70, "conversion", "Converting to HTML...");
        
        const htmlResult = await pptxConverter.convertToHTML(masterPptxPath, presentation);
        await storage.updateExportFilePath(exportId, htmlResult.filePath, htmlResult.fileSize);
        fileUrl = `/api/exports/${exportId}/download`;
        fileSize = htmlResult.fileSize;
        break;
        
      case 'google-slides':
        // Configuration is already checked at export creation, but double-check here
        if (!googleSlidesService.isConfigured()) {
          throw new Error("Google Slides integration not configured. Please set ZAPIER_MCP_API_KEY environment variable.");
        }
        
        console.log(`Converting PPTX to Google Slides for export ${exportId}`);
        await storage.updateExportProgress(exportId, 70, "conversion", "Creating Google Slides...");
        
        // Extract presentation data from the master PPTX for better consistency
        const extractedData = await pptxConverter.extractPresentationData(masterPptxPath, presentation);
        const googleSlidesPresentation = await createGoogleSlidesPresentation(extractedData);
        fileUrl = googleSlidesPresentation.url;
        fileSize = 0; // No file download, just a link
        break;
        
      case 'video':
        // Video uses a different pipeline - no PPTX conversion needed
        console.log(`Generating video export for presentation ${presentation.id}`);
        await storage.updateExportProgress(exportId, 10, "tts", "Starting video export");
        
        const videoPath = await processVideoExport(exportId, presentation, options);
        
        await storage.updateExportFilePath(exportId, videoPath);
        fileUrl = `/api/exports/${exportId}/download`;
        
        if (fs.existsSync(videoPath)) {
          const stats = fs.statSync(videoPath);
          fileSize = stats.size;
          await storage.updateExportFilePath(exportId, videoPath, fileSize);
        }
        break;
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    await storage.updateExportProgress(exportId, 100, "completed", "Export completed successfully");
    await storage.updateExportStatus(exportId, true, fileUrl);
    console.log(`${format.toUpperCase()} export ${exportId} completed successfully`);
    
  } catch (error) {
    console.error("Export processing failed:", error);
    await storage.updateExportProgress(exportId, 0, "error", `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    await storage.updateExportStatus(exportId, false, undefined, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Video export processing function  
async function processVideoExport(exportId: string, presentation: any, options: Partial<VideoExportOptions> = {}): Promise<string> {
  console.log(`Starting video export for presentation ${presentation.id}`);
  
  // Default video export options with all required properties
  const videoOptions: Required<VideoExportOptions> = {
    quality: options.quality || 'medium',
    voice: options.voice || 'alloy',
    ttsModel: options.ttsModel || 'tts-1',
    transition: options.transition || { type: 'crossfade', duration: 0.5 },
    format: options.format || 'mp4'
  };

  const slides = presentation.slides || [];
  if (slides.length === 0) {
    throw new Error("No slides found in presentation for video export");
  }

  console.log(`Generating video for ${slides.length} slides with quality: ${videoOptions.quality}, voice: ${videoOptions.voice}`);

  try {
    // Phase 1: Generate audio narration using TTS (33% of progress)
    await storage.updateExportProgress(exportId, 15, "tts", "Generating audio narration...");
    console.log("Phase 1: Generating audio narration...");
    const narrationResults = await ttsService.generatePresentationNarration(
      slides, 
      videoOptions.voice, 
      videoOptions.ttsModel, 
      'mp3'
    );

    if (narrationResults.length === 0) {
      throw new Error("Failed to generate any audio narration for slides");
    }
    
    await storage.updateExportProgress(exportId, 33, "tts", `Generated narration for ${narrationResults.length} slides`);

    // Phase 2: Render slides to images (33% of progress)  
    await storage.updateExportProgress(exportId, 40, "rendering", "Rendering slides to images...");
    console.log("Phase 2: Rendering slides to images...");
    const slideImages = await slideRenderer.renderPresentationFromSlides(slides);

    if (slideImages.length === 0) {
      throw new Error("Failed to render any slide images");
    }
    
    await storage.updateExportProgress(exportId, 66, "rendering", `Rendered ${slideImages.length} slide images`);

    // Phase 3: Assemble final video (34% of progress)
    await storage.updateExportProgress(exportId, 70, "assembly", "Assembling final video...");
    console.log("Phase 3: Assembling final video...");
    
    // Prepare slide video inputs by matching narration with images
    const slideVideoInputs = [];
    for (let i = 0; i < Math.min(slideImages.length, narrationResults.length); i++) {
      const image = slideImages[i];
      const narration = narrationResults.find(n => n.slideId === image.slideId);
      
      if (image && narration) {
        slideVideoInputs.push({
          imagePath: image.imagePath,
          audioPath: narration.audioPath,
          duration: narration.duration
        });
      }
    }

    if (slideVideoInputs.length === 0) {
      throw new Error("Failed to match slide images with narration audio");
    }

    // Generate output path for video
    const timestamp = Date.now();
    const outputPath = path.join(process.cwd(), 'uploads', 'videos', `presentation_${presentation.id}_${timestamp}.${videoOptions.format}`);
    
    // Ensure video directory exists
    const videoDir = path.dirname(outputPath);
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    // Get quality settings
    const qualitySettings = VIDEO_QUALITY_PRESETS[videoOptions.quality];
    if (videoOptions.format !== 'mp4') {
      qualitySettings.format = videoOptions.format;
    }

    // Assemble the final video
    const videoResult = await videoAssemblyService.assemblePresentationVideo(
      slideVideoInputs,
      outputPath,
      qualitySettings,
      videoOptions.transition,
      exportId // Use exportId as jobId for progress tracking
    );

    console.log(`Video export completed: ${videoResult.videoPath} (${videoResult.totalDuration.toFixed(2)}s)`);

    // Clean up temporary files
    await cleanupVideoFiles(narrationResults.map(n => n.audioPath), slideImages.map(s => s.imagePath));

    return videoResult.videoPath;

  } catch (error) {
    console.error(`Video export failed for presentation ${presentation.id}:`, error);
    throw error;
  }
}

// Note: getVideoFilePath function removed - use getSecureVideoFilePath instead for security

// Helper function to clean up temporary files
async function cleanupVideoFiles(audioPaths: string[], imagePaths: string[]): Promise<void> {
  const allPaths = [...audioPaths, ...imagePaths];
  
  for (const filePath of allPaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`Failed to cleanup file ${filePath}:`, error);
    }
  }
  
  console.log(`Cleaned up ${allPaths.length} temporary files`);
}

// Helper functions to generate export content
function generatePdfContent(presentation: any): string {
  const slides = presentation.slides || [];
  
  // Helper function to escape PDF text
  function escapePdfText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')  // Escape backslashes
      .replace(/\(/g, '\\(')   // Escape opening parentheses
      .replace(/\)/g, '\\)')   // Escape closing parentheses
      .replace(/\r?\n/g, ' ')  // Replace newlines with spaces
      .substring(0, 100);      // Limit length
  }
  
  // Generate simple PDF content
  let pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj

4 0 obj
<<
/Length `;

  // Generate content stream
  let contentStream = 'BT\n';
  contentStream += '/F1 16 Tf\n';
  contentStream += `72 720 Td\n`;
  contentStream += `(${escapePdfText(presentation.title || 'AI-Generated Presentation')}) Tj\n`;
  contentStream += '0 -30 Td\n';
  contentStream += `(Generated: ${slides.length} slides) Tj\n`;
  contentStream += '0 -20 Td\n';
  
  // Add slides
  slides.forEach((slide: any, index: number) => {
    contentStream += '/F1 14 Tf\n';
    contentStream += '0 -25 Td\n';
    contentStream += `(Slide ${index + 1}: ${escapePdfText(slide.title || 'Untitled')}) Tj\n`;
    
    if (slide.bulletPoints && slide.bulletPoints.length > 0) {
      contentStream += '/F1 10 Tf\n';
      slide.bulletPoints.slice(0, 3).forEach((point: string) => {
        contentStream += '0 -15 Td\n';
        contentStream += `(• ${escapePdfText(point)}) Tj\n`;
      });
    }
    
    contentStream += '0 -10 Td\n';
  });
  
  contentStream += 'ET';
  
  const streamLength = contentStream.length;
  
  pdfContent += `${streamLength}
>>
stream
${contentStream}
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000285 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${385 + streamLength}
%%EOF`;

  return pdfContent;
}

function generateHtmlContent(presentation: any): string {
  const slides = presentation.slides || [];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${presentation.title || 'AI-Generated Presentation'}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .presentation { max-width: 800px; margin: 0 auto; }
        .slide { background: white; margin: 20px 0; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .slide h1 { color: #333; font-size: 28px; margin-bottom: 20px; }
        .slide h2 { color: #666; font-size: 24px; margin-bottom: 15px; }
        .slide ul { margin: 15px 0; }
        .slide li { margin: 8px 0; line-height: 1.5; }
        .transcript { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .transcript h3 { margin-top: 0; color: #555; }
    </style>
</head>
<body>
    <div class="presentation">
        <div class="slide">
            <h1>${presentation.title || 'AI-Generated Presentation'}</h1>
            <p><strong>Slides:</strong> ${presentation.slideCount || 0}</p>
            <p><strong>Duration:</strong> ${presentation.estimatedDuration || 'Unknown'}</p>
        </div>
        
        ${slides.map((slide: any, index: number) => `
        <div class="slide">
            <h2>Slide ${index + 1}: ${slide.title || 'Untitled'}</h2>
            ${slide.bulletPoints ? `
            <ul>
                ${slide.bulletPoints.map((point: string) => `<li>${point}</li>`).join('')}
            </ul>
            ` : ''}
            ${slide.speakerNotes ? `<p><em>Speaker Notes: ${slide.speakerNotes}</em></p>` : ''}
        </div>
        `).join('')}
        
        ${presentation.transcriptText ? `
        <div class="transcript">
            <h3>Original Transcript</h3>
            <p>${presentation.transcriptText}</p>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
}

async function generateVideoContent(presentation: any): Promise<Buffer> {
  const slides = presentation.slides || [];
  
  // TODO: Implement actual MP4 video generation
  // For now, this is a placeholder that generates a text-based representation
  // Future implementation should use ffmpeg to combine slides, images, and TTS audio
  
  let videoScript = `# Video Script for: ${presentation.title || 'AI-Generated Presentation'}

## Video Information
- Total Slides: ${slides.length}
- Estimated Duration: ${presentation.estimatedDuration || 'Unknown'}
- Style: ${presentation.style || 'Unknown'}

## Slide-by-Slide Content

`;

  // Add each slide to the video script
  slides.forEach((slide: any, index: number) => {
    videoScript += `### Slide ${index + 1}: ${slide.title || 'Untitled'}

**Content:**
`;
    
    // Add bullet points
    if (slide.bulletPoints && slide.bulletPoints.length > 0) {
      slide.bulletPoints.forEach((point: string) => {
        videoScript += `- ${point}\n`;
      });
    } else {
      videoScript += `- No bullet points available\n`;
    }
    
    // Add speaker notes as narration
    if (slide.speakerNotes) {
      videoScript += `
**Narration Notes:**
${slide.speakerNotes}

`;
    }
    
    // Add image information
    if (slide.imageUrl) {
      videoScript += `**Visual:** Image available (${slide.imagePrompt || 'No description'})\n`;
    } else if (slide.imagePrompt) {
      videoScript += `**Visual Description:** ${slide.imagePrompt}\n`;
    }
    
    videoScript += `\n---\n\n`;
  });
  
  // Add original transcript if available
  if (presentation.transcriptText) {
    videoScript += `## Original Transcript

${presentation.transcriptText}

`;
  }
  
  // Add video generation note
  videoScript += `## Video Generation Notes

This is a video script placeholder. Actual MP4 video generation with:
- AI-generated slides as images
- Text-to-speech narration from speaker notes
- Slide timing and transitions
- Background music and effects
is planned for future implementation using ffmpeg and OpenAI TTS.
`;

  // Return as buffer (placeholder implementation)
  // In a real implementation, this would return an actual MP4 video buffer
  return Buffer.from(videoScript, 'utf8');
}

/**
 * Create Google Slides presentation from EchoDeck data
 */
async function createGoogleSlidesPresentation(presentation: any): Promise<{ url: string; presentationId: string }> {
  try {
    if (!googleSlidesService.isConfigured()) {
      throw new Error("Google Slides integration not configured. Please set ZAPIER_MCP_API_KEY environment variable.");
    }

    const slides = presentation.slides || [];
    const slideContents = slides.map((slide: any) => ({
      title: slide.title || 'Untitled Slide',
      bulletPoints: slide.bulletPoints || [],
      speakerNotes: slide.speakerNotes || '',
      imageUrl: slide.imageUrl || slide.imagePrompt
    }));

    const googlePresentation = await googleSlidesService.createCompletePresentation(
      presentation.title || 'AI-Generated Presentation',
      slideContents
    );

    return {
      url: googlePresentation.url,
      presentationId: googlePresentation.presentationId
    };
  } catch (error) {
    console.error("Failed to create Google Slides presentation:", error);
    throw error;
  }
}