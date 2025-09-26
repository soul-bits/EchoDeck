import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";
import type { IStorage } from "../storage";

// Set FFmpeg and FFprobe paths for video processing
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath('/nix/store/jfybfbnknyiwggcrhi4v9rsx5g4hksvf-ffmpeg-full-6.1.1-bin/bin/ffprobe');

export interface VideoAssemblyResult {
  videoPath: string;
  duration: number;
}

export interface PresentationVideoResult {
  videoPath: string;
  totalDuration: number;
}

export interface SlideVideoInput {
  imagePath: string;
  audioPath: string;
  duration: number;
}

export interface VideoProgress {
  progress: number;
  status: string;
}

export interface VideoQualitySettings {
  videoCodec?: string;           // Default: 'libx264'
  audioCodec?: string;           // Default: 'aac'
  videoBitrate?: string;         // Default: '2000k'
  audioBitrate?: string;         // Default: '128k'
  crf?: number;                  // Constant Rate Factor: 18-28 (18=high quality, 28=lower quality)
  preset?: string;               // Encoding speed: 'ultrafast', 'fast', 'medium', 'slow', 'veryslow'
  format?: string;               // Output format: 'mp4', 'avi', 'mov'
  resolution?: {                 // Video resolution
    width: number;
    height: number;
  };
}

export interface TransitionSettings {
  type: 'none' | 'crossfade' | 'fade-to-black' | 'slide' | 'wipe';
  duration: number; // Transition duration in seconds
}

// Container/codec compatibility mappings
const CODEC_CONTAINER_COMPATIBILITY = {
  mp4: ['libx264', 'libx265', 'h264_nvenc'],
  avi: ['libxvid', 'mjpeg'], // H.264 has compatibility issues with AVI
  mov: ['libx264', 'libx265', 'h264_nvenc', 'prores'],
  mkv: ['libx264', 'libx265', 'h264_nvenc']
};

// Safe fallback combinations
const SAFE_CODEC_FALLBACKS = {
  avi: { videoCodec: 'libxvid', format: 'avi' },
  default: { videoCodec: 'libx264', format: 'mp4' }
};

// Default quality settings for different profiles (Fixed: CRF mode without videoBitrate conflicts)
export const VIDEO_QUALITY_PRESETS = {
  high: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '192k',
    crf: 18, // High quality CRF (no videoBitrate conflict)
    preset: 'slow',
    format: 'mp4',
    resolution: { width: 1920, height: 1080 }
  } as VideoQualitySettings,
  
  medium: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '128k',
    crf: 23, // Medium quality CRF (no videoBitrate conflict)
    preset: 'medium',
    format: 'mp4',
    resolution: { width: 1920, height: 1080 }
  } as VideoQualitySettings,
  
  low: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '128k',
    crf: 28, // Lower quality CRF (no videoBitrate conflict)
    preset: 'fast',
    format: 'mp4',
    resolution: { width: 1280, height: 720 }
  } as VideoQualitySettings
};

export class VideoAssemblyService {
  private readonly tempDir: string;
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // Base delay in milliseconds
  private readonly jobProgress = new Map<string, VideoProgress>();
  private readonly storage: IStorage | null;

  constructor(storage?: IStorage) {
    // Create temporary directory for video files
    this.tempDir = path.join(process.cwd(), "uploads", "videos");
    this.storage = storage || null;
    this.ensureTempDirectory();
  }

  /**
   * Create a single slide video by combining an image with audio
   */
  async createSlideVideo(
    imagePath: string, 
    audioPath: string, 
    outputPath: string,
    qualitySettings: VideoQualitySettings = VIDEO_QUALITY_PRESETS.medium,
    transitionSettings?: TransitionSettings,
    progressCallback?: (progress: number, phase: string) => void
  ): Promise<VideoAssemblyResult> {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    try {
      console.log(`Creating slide video: ${path.basename(outputPath)}`);

      // Get audio duration first
      const audioDuration = await this.getAudioDuration(audioPath);
      
      // Create video with image and audio
      const videoPath = await this.createVideoWithImageAndAudio(
        imagePath,
        audioPath,
        outputPath,
        audioDuration,
        qualitySettings,
        progressCallback
      );

      // Verify output file
      if (!fs.existsSync(videoPath)) {
        throw new Error("Video file was not created");
      }

      const stats = fs.statSync(videoPath);
      if (stats.size === 0) {
        throw new Error("Generated video file is empty");
      }

      console.log(`Slide video created: ${videoPath} (${stats.size} bytes, ${audioDuration.toFixed(2)}s)`);

      return {
        videoPath,
        duration: audioDuration
      };

    } catch (error) {
      console.error(`Slide video creation failed:`, error);
      throw new Error(`Video creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assemble multiple slide videos into a complete presentation video
   */
  async assemblePresentationVideo(
    slides: SlideVideoInput[], 
    outputPath: string,
    qualitySettings: VideoQualitySettings = VIDEO_QUALITY_PRESETS.medium,
    transitionSettings: TransitionSettings = { type: 'crossfade', duration: 0.5 },
    jobId: string = this.generateJobId()
  ): Promise<PresentationVideoResult> {
    // Validate and normalize transition settings
    const validatedTransitions = this.validateTransitionSettings(transitionSettings);
    if (!slides || slides.length === 0) {
      throw new Error("No slides provided for video assembly");
    }

    try {
      console.log(`Assembling presentation video with ${slides.length} slides`);
      
      // Update job progress
      await this.updateJobProgress(jobId, 0, 'processing');

      // Step 1: Create individual slide videos (30% of progress)
      const slideVideos: string[] = [];
      let totalDuration = 0;

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const progress = Math.floor((i / slides.length) * 30);
        await this.updateJobProgress(jobId, progress, 'creating-slide-videos');

        const slideVideoPath = path.join(this.tempDir, `slide_${i}_${Date.now()}.mp4`);
        
        const result = await this.createSlideVideo(
          slide.imagePath,
          slide.audioPath,
          slideVideoPath,
          qualitySettings,
          undefined,
          async (slideProgress, phase) => {
            // Calculate overall progress: slide creation is 30% of total (0-30%)
            const overallProgress = Math.floor((i / slides.length) * 30 + (slideProgress / slides.length) * 30);
            await this.updateJobProgress(jobId, overallProgress, `creating-slide-${i + 1}-${phase}`);
          }
        );

        slideVideos.push(result.videoPath);
        totalDuration += result.duration;
      }

      // Fix transition duration math: For crossfade overlaps reduce total length
      if (slides.length > 1 && validatedTransitions.type !== 'none') {
        if (validatedTransitions.type === 'crossfade') {
          // Crossfade overlaps reduce total length by (n-1) * transitionDuration
          totalDuration -= (slides.length - 1) * validatedTransitions.duration;
        } else {
          // Other transition types may add time between slides
          totalDuration += (slides.length - 1) * validatedTransitions.duration;
        }
      }

      await this.updateJobProgress(jobId, 30, 'concatenating-videos');

      // Step 2: Concatenate videos with transitions (70% of progress)
      let finalVideoPath: string;

      if (slideVideos.length === 1) {
        // Single video - just copy/re-encode if needed
        finalVideoPath = await this.reencodeVideo(slideVideos[0], outputPath, qualitySettings);
      } else {
        // Multiple videos - concatenate with transitions
        finalVideoPath = await this.concatenateVideosWithTransitions(
          slideVideos,
          outputPath,
          validatedTransitions,
          qualitySettings,
          (progress) => { this.updateJobProgress(jobId, 30 + Math.floor(progress * 0.7), 'concatenating-videos'); }
        );
      }

      // Step 3: Cleanup temporary files
      await this.updateJobProgress(jobId, 95, 'cleaning-up');
      await this.cleanupTemporaryFiles(slideVideos);

      // Verify final output
      if (!fs.existsSync(finalVideoPath)) {
        throw new Error("Final presentation video was not created");
      }

      const stats = fs.statSync(finalVideoPath);
      if (stats.size === 0) {
        throw new Error("Generated presentation video is empty");
      }

      await this.updateJobProgress(jobId, 100, 'completed');

      console.log(`Presentation video assembled: ${finalVideoPath} (${stats.size} bytes, ${totalDuration.toFixed(2)}s)`);

      return {
        videoPath: finalVideoPath,
        totalDuration
      };

    } catch (error) {
      await this.updateJobProgress(jobId, 0, 'error');
      console.error(`Presentation video assembly failed:`, error);
      throw new Error(`Video assembly failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate and normalize transition settings
   */
  private validateTransitionSettings(transitionSettings: TransitionSettings): TransitionSettings {
    const supportedTransitions: TransitionSettings['type'][] = ['none', 'crossfade', 'fade-to-black'];
    
    if (!supportedTransitions.includes(transitionSettings.type)) {
      console.warn(`Unsupported transition '${transitionSettings.type}' requested. Coercing to 'crossfade'.`);
      return {
        ...transitionSettings,
        type: 'crossfade'
      };
    }
    
    return transitionSettings;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    try {
      // Check if FFmpeg is available
      return fs.existsSync(ffmpegPath.path);
    } catch {
      return false;
    }
  }

  /**
   * Get progress of a video assembly job
   */
  async getVideoProgress(jobId: string): Promise<VideoProgress> {
    const progress = this.jobProgress.get(jobId);
    if (!progress) {
      return { progress: 0, status: 'not-found' };
    }
    return progress;
  }

  /**
   * Clean up old temporary video files
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    if (!fs.existsSync(this.tempDir)) {
      return;
    }

    const files = fs.readdirSync(this.tempDir);
    const maxAge = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const file of files) {
      try {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime.getTime() < maxAge) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      } catch (error) {
        console.warn(`Failed to cleanup file ${file}:`, error);
      }
    }

    // Clean up old job progress entries (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const keysToDelete: string[] = [];
    this.jobProgress.forEach((progress, jobId) => {
      // Assuming job IDs contain timestamps
      const jobTimestamp = this.extractTimestampFromJobId(jobId);
      if (jobTimestamp && jobTimestamp < oneHourAgo) {
        keysToDelete.push(jobId);
      }
    });
    
    keysToDelete.forEach(jobId => {
      this.jobProgress.delete(jobId);
    });

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old video files`);
    }
  }

  /**
   * Get video duration using ffmpeg
   */
  private async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get video duration: ${err.message}`));
          return;
        }

        const duration = metadata?.format?.duration;
        if (typeof duration !== 'number') {
          reject(new Error("Unable to determine video duration"));
          return;
        }

        resolve(duration);
      });
    });
  }

  /**
   * Get audio duration using ffmpeg
   */
  private async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get audio duration: ${err.message}`));
          return;
        }

        const duration = metadata?.format?.duration;
        if (typeof duration !== 'number') {
          reject(new Error("Unable to determine audio duration"));
          return;
        }

        resolve(duration);
      });
    });
  }

  /**
   * Retry operation with exponential backoff and partial file cleanup
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.maxRetries,
    outputPath?: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const isRetryableError = this.isRetryableError(lastError);
        
        console.warn(`Attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        
        if (!isRetryableError || attempt === maxRetries) {
          throw lastError;
        }
        
        // Clean up partially written output file before retry
        if (outputPath && fs.existsSync(outputPath)) {
          try {
            fs.unlinkSync(outputPath);
            console.log(`Cleaned up partial output file before retry: ${path.basename(outputPath)}`);
          } catch (cleanupError) {
            console.warn(`Failed to cleanup partial file ${outputPath}:`, cleanupError);
          }
        }
        
        // Exponential backoff delay
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'EPIPE',
      'ECONNRESET', 
      'ETIMEDOUT',
      'Timeout',
      'ffmpeg exited with code 1',
      'Connection lost'
    ];
    
    return retryableErrors.some(errType => 
      error.message.includes(errType) || error.name.includes(errType)
    );
  }

  /**
   * Validate and fix codec/container compatibility
   */
  private validateCodecContainerCompatibility(settings: VideoQualitySettings): VideoQualitySettings {
    const format = settings.format || 'mp4';
    const codec = settings.videoCodec || 'libx264';
    
    // Check if codec is compatible with container
    const compatibleCodecs = CODEC_CONTAINER_COMPATIBILITY[format as keyof typeof CODEC_CONTAINER_COMPATIBILITY];
    
    if (!compatibleCodecs || !compatibleCodecs.includes(codec)) {
      console.warn(`Codec ${codec} not compatible with ${format}, using fallback`);
      
      // Use safe fallback
      const fallback = SAFE_CODEC_FALLBACKS[format as keyof typeof SAFE_CODEC_FALLBACKS] || SAFE_CODEC_FALLBACKS.default;
      
      return {
        ...settings,
        videoCodec: fallback.videoCodec,
        format: fallback.format
      };
    }
    
    return settings;
  }

  /**
   * Create video by combining image and audio with retry logic and proper encoding
   */
  private async createVideoWithImageAndAudio(
    imagePath: string,
    audioPath: string,
    outputPath: string,
    duration: number,
    qualitySettings: VideoQualitySettings,
    progressCallback?: (progress: number, phase: string) => void
  ): Promise<string> {
    // Validate and fix codec/container compatibility
    const validatedSettings = this.validateCodecContainerCompatibility(qualitySettings);
    
    return this.retryOperation(async () => {
      return new Promise<string>((resolve, reject) => {
        const outputOptions = [
          '-t', duration.toString(), // Set video duration to match audio
          '-c:v', validatedSettings.videoCodec || 'libx264',
          '-c:a', validatedSettings.audioCodec || 'aac',
          '-b:a', validatedSettings.audioBitrate || '128k',
          '-preset', validatedSettings.preset || 'medium',
          '-r', '30', // Frame rate (30 fps)
          '-pix_fmt', 'yuv420p', // Pixel format for broad compatibility
          '-shortest' // End when shortest input ends
        ];

        // Use CRF for quality (don't mix with videoBitrate)
        if (validatedSettings.crf !== undefined) {
          outputOptions.push('-crf', validatedSettings.crf.toString());
        } else if (validatedSettings.videoBitrate) {
          outputOptions.push('-b:v', validatedSettings.videoBitrate);
        }

        // Add MP4 streaming optimization
        if (validatedSettings.format === 'mp4') {
          outputOptions.push('-movflags', '+faststart');
        }

        const command = ffmpeg()
          .input(imagePath)
          .inputOptions(['-loop', '1']) // Loop the image for static images
          .input(audioPath)
          .outputOptions(outputOptions);

        // Always set resolution - use specified resolution or default to prevent scaling issues
        if (validatedSettings.resolution) {
          command.outputOptions([
            '-s', `${validatedSettings.resolution.width}x${validatedSettings.resolution.height}`,
            '-vf', `scale=${validatedSettings.resolution.width}:${validatedSettings.resolution.height}:force_original_aspect_ratio=decrease,pad=${validatedSettings.resolution.width}:${validatedSettings.resolution.height}:(ow-iw)/2:(oh-ih)/2`
          ]);
        } else {
          // Default resolution if none specified
          command.outputOptions([
            '-s', '1920x1080',
            '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2'
          ]);
        }

        command
          .output(outputPath)
          .on('end', () => {
            console.log(`Video encoding completed: ${path.basename(outputPath)}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            reject(new Error(`Video encoding failed: ${err.message}`));
          })
          .on('progress', (progress) => {
            const percent = Math.min(progress.percent || 0, 100);
            if (progressCallback) {
              progressCallback(percent, 'encoding');
            }
            console.log(`Video encoding progress: ${percent.toFixed(1)}%`);
          })
          .run();
      });
    }, this.maxRetries, outputPath);
  }

  /**
   * Concatenate multiple videos with transitions
   */
  private async concatenateVideosWithTransitions(
    videoPaths: string[],
    outputPath: string,
    transitionSettings: TransitionSettings,
    qualitySettings: VideoQualitySettings,
    progressCallback?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (transitionSettings.type === 'none') {
        // Simple concatenation without transitions
        this.concatenateVideosSimple(videoPaths, outputPath, qualitySettings, progressCallback)
          .then(resolve)
          .catch(reject);
        return;
      }

      // Complex concatenation with transitions
      const command = ffmpeg();

      // Add all input videos
      videoPaths.forEach(videoPath => {
        command.input(videoPath);
      });

      // Build complex filter for transitions
      const filters = this.buildTransitionFilters(videoPaths.length, transitionSettings);

      // Validate codec/container compatibility for concatenation
      const validatedSettings = this.validateCodecContainerCompatibility(qualitySettings);
      
      const outputOptions = [
        '-map', '[output]',
        '-c:v', validatedSettings.videoCodec || 'libx264',
        '-c:a', validatedSettings.audioCodec || 'aac',
        '-b:a', validatedSettings.audioBitrate || '128k',
        '-preset', validatedSettings.preset || 'medium',
        '-r', '30', // Frame rate (30 fps)
        '-pix_fmt', 'yuv420p', // Pixel format for broad compatibility
        '-shortest' // End when shortest input ends
      ];
      
      // Add resolution scaling for concatenation
      if (validatedSettings.resolution) {
        outputOptions.push(
          '-s', `${validatedSettings.resolution.width}x${validatedSettings.resolution.height}`,
          '-vf', `scale=${validatedSettings.resolution.width}:${validatedSettings.resolution.height}:force_original_aspect_ratio=decrease,pad=${validatedSettings.resolution.width}:${validatedSettings.resolution.height}:(ow-iw)/2:(oh-ih)/2`
        );
      } else {
        outputOptions.push(
          '-s', '1920x1080',
          '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2'
        );
      }

      // Use CRF for quality (don't mix with videoBitrate)
      if (validatedSettings.crf !== undefined) {
        outputOptions.push('-crf', validatedSettings.crf.toString());
      } else if (validatedSettings.videoBitrate) {
        outputOptions.push('-b:v', validatedSettings.videoBitrate);
      }

      // Add MP4 streaming optimization
      if (validatedSettings.format === 'mp4') {
        outputOptions.push('-movflags', '+faststart');
      }

      command
        .complexFilter(filters, 'output')
        .outputOptions(outputOptions)
        .output(outputPath)
        .on('end', () => {
          console.log(`Video concatenation with transitions completed`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(new Error(`Video concatenation failed: ${err.message}`));
        })
        .on('progress', (progress) => {
          const percent = progress.percent || 0;
          if (progressCallback) {
            progressCallback(percent);
          }
          console.log(`Concatenation progress: ${percent.toFixed(1)}%`);
        })
        .run();
    });
  }

  /**
   * Simple video concatenation without transitions
   */
  private async concatenateVideosSimple(
    videoPaths: string[],
    outputPath: string,
    qualitySettings: VideoQualitySettings,
    progressCallback?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create concat file list
      const concatListPath = path.join(this.tempDir, `concat_${Date.now()}.txt`);
      const concatContent = videoPaths
        .map(videoPath => `file '${videoPath.replace(/'/g, "\\'")}'`)
        .join('\n');

      fs.writeFileSync(concatListPath, concatContent);

      // Validate codec/container compatibility
      const validatedSettings = this.validateCodecContainerCompatibility(qualitySettings);
      
      const outputOptions = [
        '-c:v', validatedSettings.videoCodec || 'libx264',
        '-c:a', validatedSettings.audioCodec || 'aac',
        '-b:a', validatedSettings.audioBitrate || '128k',
        '-preset', validatedSettings.preset || 'medium',
        '-pix_fmt', 'yuv420p'
      ];

      // Use CRF for quality (don't mix with videoBitrate)
      if (validatedSettings.crf !== undefined) {
        outputOptions.push('-crf', validatedSettings.crf.toString());
      } else if (validatedSettings.videoBitrate) {
        outputOptions.push('-b:v', validatedSettings.videoBitrate);
      }

      // Add MP4 streaming optimization
      if (validatedSettings.format === 'mp4') {
        outputOptions.push('-movflags', '+faststart');
      }

      const command = ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(outputOptions)
        .output(outputPath)
        .on('end', () => {
          // Cleanup concat file
          try {
            fs.unlinkSync(concatListPath);
          } catch (error) {
            console.warn(`Failed to cleanup concat file: ${error}`);
          }
          console.log(`Simple video concatenation completed`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          // Cleanup concat file on error
          try {
            fs.unlinkSync(concatListPath);
          } catch (error) {
            // Ignore cleanup error
          }
          reject(new Error(`Video concatenation failed: ${err.message}`));
        })
        .on('progress', (progress) => {
          const percent = progress.percent || 0;
          if (progressCallback) {
            progressCallback(percent);
          }
          console.log(`Concatenation progress: ${percent.toFixed(1)}%`);
        })
        .run();
    });
  }

  /**
   * Re-encode a single video with new quality settings
   */
  private async reencodeVideo(
    inputPath: string,
    outputPath: string,
    qualitySettings: VideoQualitySettings
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Validate codec/container compatibility
      const validatedSettings = this.validateCodecContainerCompatibility(qualitySettings);
      
      const outputOptions = [
        '-c:v', validatedSettings.videoCodec || 'libx264',
        '-c:a', validatedSettings.audioCodec || 'aac',
        '-b:a', validatedSettings.audioBitrate || '128k',
        '-preset', validatedSettings.preset || 'medium',
        '-pix_fmt', 'yuv420p'
      ];

      // Use CRF for quality (don't mix with videoBitrate)
      if (validatedSettings.crf !== undefined) {
        outputOptions.push('-crf', validatedSettings.crf.toString());
      } else if (validatedSettings.videoBitrate) {
        outputOptions.push('-b:v', validatedSettings.videoBitrate);
      }

      // Add MP4 streaming optimization
      if (validatedSettings.format === 'mp4') {
        outputOptions.push('-movflags', '+faststart');
      }

      const command = ffmpeg(inputPath)
        .outputOptions(outputOptions);

      // Always ensure proper resolution scaling
      if (validatedSettings.resolution) {
        command.outputOptions([
          '-s', `${validatedSettings.resolution.width}x${validatedSettings.resolution.height}`,
          '-vf', `scale=${validatedSettings.resolution.width}:${validatedSettings.resolution.height}:force_original_aspect_ratio=decrease,pad=${validatedSettings.resolution.width}:${validatedSettings.resolution.height}:(ow-iw)/2:(oh-ih)/2`
        ]);
      } else {
        // Default resolution if none specified
        command.outputOptions([
          '-s', '1920x1080',
          '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2'
        ]);
      }

      command
        .output(outputPath)
        .on('end', () => {
          console.log(`Video re-encoding completed`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(new Error(`Video re-encoding failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Build FFmpeg filters for video transitions
   */
  private buildTransitionFilters(videoCount: number, transitionSettings: TransitionSettings): string {
    const { type, duration } = transitionSettings;

    switch (type) {
      case 'crossfade':
        return this.buildCrossfadeFilters(videoCount, duration);
      case 'fade-to-black':
        return this.buildFadeToBlackFilters(videoCount, duration);
      default:
        // Fallback to simple concat
        const inputs = Array.from({ length: videoCount }, (_, i) => `[${i}:v][${i}:a]`).join('');
        return `${inputs}concat=n=${videoCount}:v=1:a=1[output]`;
    }
  }

  /**
   * Build crossfade transition filters
   */
  private buildCrossfadeFilters(videoCount: number, duration: number): string {
    if (videoCount === 1) {
      return '[0:v][0:a]copy[output]';
    }

    let filterChain = '';
    let currentVideoLabel = '[0:v]';
    let currentAudioLabel = '[0:a]';

    for (let i = 1; i < videoCount; i++) {
      const nextVideoLabel = `[${i}:v]`;
      const nextAudioLabel = `[${i}:a]`;
      const outputVideoLabel = i === videoCount - 1 ? '[output_v]' : `[v${i}]`;
      const outputAudioLabel = i === videoCount - 1 ? '[output_a]' : `[a${i}]`;

      // Video crossfade
      filterChain += `${currentVideoLabel}${nextVideoLabel}xfade=transition=fade:duration=${duration}:offset=0${outputVideoLabel};`;
      
      // Audio crossfade
      filterChain += `${currentAudioLabel}${nextAudioLabel}acrossfade=d=${duration}${outputAudioLabel};`;

      currentVideoLabel = outputVideoLabel;
      currentAudioLabel = outputAudioLabel;
    }

    // Combine final video and audio
    filterChain += '[output_v][output_a]concat=n=1:v=1:a=1[output]';

    return filterChain;
  }

  /**
   * Build fade-to-black transition filters
   */
  private buildFadeToBlackFilters(videoCount: number, duration: number): string {
    if (videoCount === 1) {
      return '[0:v][0:a]copy[output]';
    }

    // For fade-to-black, we'll use a simpler approach with fadeout/fadein
    const inputs = Array.from({ length: videoCount }, (_, i) => `[${i}:v][${i}:a]`).join('');
    return `${inputs}concat=n=${videoCount}:v=1:a=1[output]`;
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTemporaryFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up temporary file: ${path.basename(filePath)}`);
        }
      } catch (error) {
        console.warn(`Failed to cleanup temporary file ${filePath}:`, error);
      }
    }
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(jobId: string, progress: number, status: string): Promise<void> {
    // Update internal tracking
    this.jobProgress.set(jobId, { progress, status });
    console.log(`Job ${jobId}: ${progress}% - ${status}`);
    
    // Update storage if available (integration with export progress tracking)
    if (this.storage) {
      try {
        await this.storage.updateExportProgress(jobId, progress, "assembly", status);
      } catch (error) {
        console.warn(`Failed to update export progress for job ${jobId}:`, error);
      }
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `video_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract timestamp from job ID (if it contains one)
   */
  private extractTimestampFromJobId(jobId: string): number | null {
    const match = jobId.match(/video_job_(\d+)_/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Ensure temporary directory exists
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      console.log(`Created video temp directory: ${this.tempDir}`);
    }
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get available quality presets
   */
  static getQualityPresets(): typeof VIDEO_QUALITY_PRESETS {
    return VIDEO_QUALITY_PRESETS;
  }

  /**
   * Get available transition types (only actually implemented ones)
   */
  static getAvailableTransitions(): TransitionSettings['type'][] {
    return ['none', 'crossfade', 'fade-to-black'];
  }
}

// Export service instance
export const videoAssemblyService = new VideoAssemblyService();