import OpenAI from "openai";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import type { Slide } from "@shared/schema";

// Set FFmpeg and FFprobe paths for audio processing
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath('/nix/store/jfybfbnknyiwggcrhi4v9rsx5g4hksvf-ffmpeg-full-6.1.1-bin/bin/ffprobe');

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TTSResult {
  audioPath: string;
  duration: number;
}

export interface SlideNarrationResult {
  slideId: string;
  audioPath: string;
  duration: number;
}

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
export type TTSModel = "tts-1" | "tts-1-hd";
export type TTSFormat = "mp3" | "opus" | "aac" | "flac";

export class TTSService {
  private readonly tempDir: string;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // Base delay in milliseconds

  constructor() {
    // Create temporary directory for audio files
    this.tempDir = path.join(process.cwd(), "uploads", "tts_audio");
    this.ensureTempDirectory();
  }

  /**
   * Generate narration audio for a single slide
   */
  async generateSlideNarration(
    slideId: string, 
    text: string, 
    voice: TTSVoice = "alloy",
    model: TTSModel = "tts-1",
    format: TTSFormat = "mp3"
  ): Promise<TTSResult> {
    if (!text || text.trim().length === 0) {
      throw new Error("No text provided for narration");
    }

    try {
      console.log(`Generating TTS narration for slide ${slideId} with voice ${voice}`);
      
      const audioPath = await this.generateAudioWithRetry(
        text, 
        voice, 
        model, 
        format,
        `slide_${slideId}_${Date.now()}`
      );

      const duration = await this.getAudioDuration(audioPath);
      
      console.log(`Generated narration: ${audioPath} (${duration.toFixed(2)}s)`);
      
      return { audioPath, duration };
    } catch (error) {
      console.error(`TTS generation failed for slide ${slideId}:`, error);
      throw new Error(`Narration generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate narration audio for all slides in a presentation
   */
  async generatePresentationNarration(
    slides: Slide[], 
    voice: TTSVoice = "alloy",
    model: TTSModel = "tts-1",
    format: TTSFormat = "mp3"
  ): Promise<SlideNarrationResult[]> {
    if (!slides || slides.length === 0) {
      throw new Error("No slides provided for narration");
    }

    const results: SlideNarrationResult[] = [];
    const errors: Array<{ slideId: string; error: string }> = [];

    console.log(`Generating TTS narration for ${slides.length} slides with voice ${voice}`);

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideNumber = i + 1;
      
      try {
        // Use speaker notes for narration, fallback to title + bullet points
        let narrationText = slide.speakerNotes?.trim();
        
        if (!narrationText) {
          // Generate narration from slide content if no speaker notes
          const bulletText = slide.bulletPoints?.join(". ") || "";
          narrationText = `${slide.title}. ${bulletText}`;
        }

        if (!narrationText || narrationText.length < 5) {
          console.warn(`Slide ${slideNumber} has insufficient text for narration, skipping`);
          continue;
        }

        console.log(`Processing slide ${slideNumber}/${slides.length}: "${slide.title}"`);

        const result = await this.generateSlideNarration(
          slide.id, 
          narrationText, 
          voice, 
          model, 
          format
        );

        results.push({
          slideId: slide.id,
          audioPath: result.audioPath,
          duration: result.duration
        });

        // Add small delay to avoid rate limiting
        if (i < slides.length - 1) {
          await this.delay(500);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to generate narration for slide ${slideNumber}:`, errorMessage);
        errors.push({ slideId: slide.id, error: errorMessage });
        
        // Continue with other slides rather than failing completely
      }
    }

    if (results.length === 0 && errors.length > 0) {
      throw new Error(`Failed to generate any narration. Errors: ${errors.map(e => e.error).join(', ')}`);
    }

    if (errors.length > 0) {
      console.warn(`Generated narration for ${results.length}/${slides.length} slides. ${errors.length} slides failed.`);
    } else {
      console.log(`Successfully generated narration for all ${results.length} slides`);
    }

    return results;
  }

  /**
   * Generate a combined narration audio file for the entire presentation
   */
  async generateCombinedNarration(
    slides: Slide[],
    voice: TTSVoice = "alloy",
    model: TTSModel = "tts-1",
    format: TTSFormat = "mp3",
    pauseBetweenSlides: number = 1.5 // seconds
  ): Promise<TTSResult> {
    console.log(`Generating combined narration for ${slides.length} slides`);

    // Generate individual slide narrations
    const slideNarrations = await this.generatePresentationNarration(slides, voice, model, format);

    if (slideNarrations.length === 0) {
      throw new Error("No slide narrations generated");
    }

    if (slideNarrations.length === 1) {
      // Return single file if only one slide
      return {
        audioPath: slideNarrations[0].audioPath,
        duration: slideNarrations[0].duration
      };
    }

    // Combine all audio files
    const combinedPath = path.join(this.tempDir, `combined_${Date.now()}.${format}`);
    const totalDuration = await this.combineAudioFiles(
      slideNarrations.map(n => n.audioPath),
      combinedPath,
      pauseBetweenSlides
    );

    // Clean up individual files
    for (const narration of slideNarrations) {
      try {
        fs.unlinkSync(narration.audioPath);
      } catch (error) {
        console.warn(`Failed to cleanup audio file ${narration.audioPath}:`, error);
      }
    }

    console.log(`Combined narration generated: ${combinedPath} (${totalDuration.toFixed(2)}s)`);

    return {
      audioPath: combinedPath,
      duration: totalDuration
    };
  }

  /**
   * Check if TTS service is properly configured
   */
  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Clean up old temporary audio files
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

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old TTS audio files`);
    }
  }

  /**
   * Private method to generate audio with retry logic
   */
  private async generateAudioWithRetry(
    text: string, 
    voice: TTSVoice, 
    model: TTSModel,
    format: TTSFormat,
    fileName: string,
    attempt: number = 1
  ): Promise<string> {
    try {
      // Truncate text if too long (OpenAI TTS has a 4096 character limit)
      const truncatedText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;

      const response = await openai.audio.speech.create({
        model: model,
        voice: voice,
        input: truncatedText,
        response_format: format
      });

      const audioPath = path.join(this.tempDir, `${fileName}.${format}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      
      fs.writeFileSync(audioPath, buffer);
      
      // Verify file was created and has content
      if (!fs.existsSync(audioPath)) {
        throw new Error("Audio file was not created");
      }

      const stats = fs.statSync(audioPath);
      if (stats.size === 0) {
        throw new Error("Generated audio file is empty");
      }

      return audioPath;

    } catch (error: any) {
      // Handle rate limiting with exponential backoff
      if (this.isRateLimitError(error) && attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.warn(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})`);
        
        await this.delay(delay);
        return this.generateAudioWithRetry(text, voice, model, format, fileName, attempt + 1);
      }

      // Handle other errors
      if (error.message?.includes('rate_limit_exceeded') || error.status === 429) {
        throw new Error("OpenAI TTS rate limit exceeded. Please try again in a few minutes.");
      }

      throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audio duration using ffmpeg
   */
  private async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          console.error("Failed to get audio duration:", err);
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
   * Combine multiple audio files with pauses
   */
  private async combineAudioFiles(
    inputPaths: string[],
    outputPath: string,
    pauseDuration: number
  ): Promise<number> {
    return new Promise(async (resolve, reject) => {
      try {
        // Calculate total duration first by getting individual durations
        let totalDuration = 0;
        const durations: number[] = [];
        
        for (const inputPath of inputPaths) {
          const duration = await this.getAudioDuration(inputPath);
          durations.push(duration);
          totalDuration += duration;
        }
        
        // Add pause durations (n-1 pauses for n files)
        if (inputPaths.length > 1) {
          totalDuration += pauseDuration * (inputPaths.length - 1);
        }

        const command = ffmpeg();

        // Add each input file
        inputPaths.forEach(inputPath => {
          command.input(inputPath);
        });

        // Generate silence input for pauses
        if (inputPaths.length > 1) {
          command.input(`anullsrc=channel_layout=stereo:sample_rate=44100`).inputOptions(['-t', pauseDuration.toString()]);
        }

        // Create filter for concatenating with pauses using proper FFmpeg syntax
        let filter = '';
        const silenceIndex = inputPaths.length; // Index of the silence input

        // If only one file, no concatenation needed
        if (inputPaths.length === 1) {
          filter = '[0:a]acopy[out]';
        } else {
          // Build concat filter with proper audio stream references
          const inputLabels: string[] = [];
          
          for (let i = 0; i < inputPaths.length; i++) {
            inputLabels.push(`[${i}:a]`);
            
            // Add silence after each file except the last one
            if (i < inputPaths.length - 1) {
              inputLabels.push(`[${silenceIndex}:a]`);
            }
          }
          
          // Use concat filter with proper parameters
          const totalStreams = inputLabels.length;
          filter = `${inputLabels.join('')}concat=n=${totalStreams}:v=0:a=1[out]`;
        }

        command
          .complexFilter(filter)
          .outputOptions(['-map', '[out]'])
          .output(outputPath)
          .on('end', () => {
            console.log(`Audio combination completed: ${totalDuration.toFixed(2)}s total duration`);
            resolve(totalDuration);
          })
          .on('error', (err) => {
            reject(new Error(`Audio combination failed: ${err.message}`));
          })
          .run();

      } catch (error) {
        reject(new Error(`Failed to prepare audio combination: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * Check if error is related to rate limiting
   */
  private isRateLimitError(error: any): boolean {
    return error?.status === 429 || 
           error?.code === 'rate_limit_exceeded' || 
           error?.message?.includes('rate_limit_exceeded') ||
           error?.message?.includes('Rate limit') ||
           error?.message?.includes('rate limit');
  }

  /**
   * Ensure temporary directory exists
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      console.log(`Created TTS audio directory: ${this.tempDir}`);
    }
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get available voices
   */
  static getAvailableVoices(): TTSVoice[] {
    return ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
  }

  /**
   * Get available models
   */
  static getAvailableModels(): TTSModel[] {
    return ["tts-1", "tts-1-hd"];
  }

  /**
   * Get supported audio formats
   */
  static getSupportedFormats(): TTSFormat[] {
    return ["mp3", "opus", "aac", "flac"];
  }
}

// Export service instance
export const ttsService = new TTSService();