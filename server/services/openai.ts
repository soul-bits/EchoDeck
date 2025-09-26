import OpenAI from "openai";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { exec, spawn } from "child_process";
import { promisify } from "util";

// Using gpt-4o for reliable chat completions
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Set FFmpeg path for audio conversion
ffmpeg.setFfmpegPath(ffmpegPath.path);

// Promisify exec for async/await usage
const execAsync = promisify(exec);

export interface TranscriptionResult {
  text: string;
  duration?: number;
  timestamps?: Array<{ word: string; start: number; end: number }>;
}

export interface SlideOutline {
  title: string;
  bulletPoints: string[];
  speakerNotes: string;
  imagePrompt: string;
  chartData?: any;
  hasChart?: boolean;
}

export interface PresentationOutline {
  title: string;
  slides: SlideOutline[];
  estimatedDuration: string;
}

export class OpenAIService {
  /**
   * Analyze transcript for numeric data and chart opportunities
   */
  async analyzeForCharts(transcript: string): Promise<any[]> {
    try {
      const prompt = `
Analyze the following transcript for numerical data that would benefit from visualization as charts.
Look for:
- Statistics, percentages, or numerical comparisons
- Data points that could be shown as bar charts, line charts, or pie charts
- Time series data or trends
- Categorical data with values

Transcript:
${transcript}

For each chart opportunity, respond with JSON in this format:
{
  "charts": [
    {
      "chartType": "bar|line|pie",
      "title": "Chart title",
      "data": {
        "labels": ["Label1", "Label2"],
        "values": [value1, value2],
        "xlabel": "X-axis label",
        "ylabel": "Y-axis label"
      },
      "slideTitle": "Suggested slide title for this chart",
      "explanation": "Why this chart would be valuable"
    }
  ]
}

If no chart opportunities are found, return {"charts": []}.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a data visualization expert who identifies opportunities to create meaningful charts from text data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return [];
      }

      const result = JSON.parse(content);
      // Handle both array format and object with charts property
      return Array.isArray(result) ? result : (result.charts || []);
    } catch (error) {
      console.error("Chart analysis failed:", error);
      return [];
    }
  }

  /**
   * Generate chart image using Python matplotlib
   */
  async generateChart(chartData: any): Promise<string | null> {
    try {
      const chartId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const outputPath = path.join(process.cwd(), "uploads", `${chartId}.png`);
      
      // Ensure uploads directory exists
      const uploadsDir = path.dirname(outputPath);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const scriptPath = path.join(process.cwd(), "server", "scripts", "generate_chart.py");
      const chartDataJson = JSON.stringify(chartData);
      
      // Use spawn to avoid command injection issues
      
      const childProcess = spawn('python3', [scriptPath, chartDataJson, outputPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      await new Promise((resolve, reject) => {
        childProcess.on('close', (code: number) => {
          if (code === 0) {
            resolve(code);
          } else {
            reject(new Error(`Chart generation process exited with code ${code}`));
          }
        });
        
        childProcess.on('error', (error: Error) => {
          reject(error);
        });
      });
      
      // Verify file was created
      if (fs.existsSync(outputPath)) {
        // Return relative path for serving
        return `/uploads/${chartId}.png`;
      } else {
        throw new Error("Chart file was not created");
      }
    } catch (error) {
      console.error("Chart generation failed:", error);
      return null;
    }
  }

  /**
   * Transcribe audio file using Whisper API
   */
  /**
   * Convert audio file to MP3 format for better OpenAI compatibility
   */
  private async convertToMp3(inputPath: string): Promise<string> {
    const outputPath = inputPath.replace(/\.[^/.]+$/, "") + "_converted.mp3";
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('mp3')
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .audioFrequency(44100)
        .audioChannels(1) // Mono for smaller file size
        .on('end', () => {
          console.log('Audio conversion completed:', outputPath);
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          console.error('Audio conversion failed:', err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  async transcribeAudio(audioFilePath: string): Promise<TranscriptionResult> {
    let convertedPath: string | null = null;
    
    try {
      console.log("Starting transcription for:", audioFilePath);
      
      // Check file exists and get stats
      const stats = fs.statSync(audioFilePath);
      console.log(`Original audio file size: ${stats.size} bytes`);
      
      // Convert to MP3 for better OpenAI compatibility
      console.log("Converting audio to MP3 format...");
      convertedPath = await this.convertToMp3(audioFilePath);
      
      const convertedStats = fs.statSync(convertedPath);
      console.log(`Converted MP3 file size: ${convertedStats.size} bytes`);
      
      const audioReadStream = fs.createReadStream(convertedPath);

      const transcription = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: "whisper-1"
      });

      console.log("Transcription completed:", transcription.text?.substring(0, 100) + "...");

      return { text: transcription.text };
    } catch (error: any) {
      console.error("Transcription failed:", error);
      console.error("Error details:", error.response?.data || error.message);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Cleanup converted file
      if (convertedPath && fs.existsSync(convertedPath)) {
        try {
          fs.unlinkSync(convertedPath);
          console.log("Cleaned up converted file:", convertedPath);
        } catch (err) {
          console.error("Failed to cleanup converted file:", err);
        }
      }
    }
  }

  /**
   * Generate presentation outline from transcript
   */
  async generatePresentationOutline(
    transcript: string, 
    style: "ted-talk" | "corporate-pitch" | "storybook"
  ): Promise<PresentationOutline> {
    try {
      // First, analyze for chart opportunities
      const chartOpportunities = await this.analyzeForCharts(transcript);
      console.log(`Found ${chartOpportunities.length} chart opportunities`);

      const stylePrompts = {
        "ted-talk": "Create an inspiring TED Talk style presentation with storytelling focus, large visuals, minimal text, and emotional appeal.",
        "corporate-pitch": "Create a professional business presentation with data focus, executive summary, charts & graphs, and ROI emphasis.",
        "storybook": "Create a creative narrative presentation with visual storytelling, artistic layouts, and flowing content."
      };

      let chartInstructions = "";
      if (chartOpportunities.length > 0) {
        chartInstructions = `\n\nIMPORTANT: Include data visualization slides based on these chart opportunities:
${chartOpportunities.map(chart => `- ${chart.slideTitle}: ${chart.explanation} (${chart.chartType} chart)`).join('\n')}

For slides that should include charts, set the imagePrompt to "CHART_PLACEHOLDER" and include the chart data.`;
      }

      const prompt = `
You are an expert presentation designer. Based on the following transcript, create a ${style} presentation outline.

${stylePrompts[style]}

Generate 5-8 slides with:
- Compelling slide titles
- 3-5 bullet points per slide (concise and impactful)
- Detailed speaker notes (2-3 sentences explaining the key message)
- Image prompts for DALL-E 3 (professional, 16:9 aspect ratio, suitable for ${style} style)
${chartInstructions}

Transcript:
${transcript}

Respond with JSON in this exact format:
{
  "title": "Presentation Title",
  "slides": [
    {
      "title": "Slide Title",
      "bulletPoints": ["Point 1", "Point 2", "Point 3"],
      "speakerNotes": "Detailed speaking notes for this slide explaining the key message and how to present it effectively.",
      "imagePrompt": "Professional image prompt for DALL-E 3, 16:9 aspect ratio, relevant to slide content OR CHART_PLACEHOLDER for chart slides"
    }
  ],
  "estimatedDuration": "X minutes"
}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert presentation designer who creates compelling, professional presentations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const result = JSON.parse(content) as PresentationOutline;
      
      // Process slides and add chart data where appropriate
      if (chartOpportunities.length > 0) {
        for (let i = 0; i < result.slides.length; i++) {
          const slide = result.slides[i];
          if (slide.imagePrompt === "CHART_PLACEHOLDER") {
            // Find matching chart opportunity
            const matchingChart = chartOpportunities.find(chart => 
              slide.title.toLowerCase().includes(chart.slideTitle.toLowerCase().split(' ')[0]) ||
              chart.slideTitle.toLowerCase().includes(slide.title.toLowerCase().split(' ')[0])
            );
            
            if (matchingChart) {
              slide.hasChart = true;
              slide.chartData = {
                type: matchingChart.chartType,
                title: matchingChart.title,
                ...matchingChart.data
              };
              
              // Generate the chart image
              const chartImagePath = await this.generateChart(slide.chartData);
              if (chartImagePath) {
                slide.imagePrompt = chartImagePath;
              } else {
                // Fallback to regular image if chart generation fails
                slide.imagePrompt = `Professional chart showing ${matchingChart.title}, business style, clean data visualization`;
                slide.hasChart = false;
              }
            }
          }
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Presentation outline generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate image for slide using DALL-E 2
   */
  async generateSlideImage(prompt: string): Promise<string> {
    try {
      // First, check content with moderation API
      const moderation = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: prompt
      });

      if (moderation.results[0].flagged) {
        throw new Error("Image prompt was flagged by content moderation");
      }

      const response = await openai.images.generate({
        model: "dall-e-2",
        prompt: `${prompt}. Professional presentation style, clean, minimal, suitable for business presentation`,
        n: 1,
        size: "512x512", // user requested size for faster generation and lower cost
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL received from OpenAI");
      }

      return imageUrl;
    } catch (error) {
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check content safety using moderation API
   */
  async moderateContent(content: string): Promise<{ flagged: boolean; categories: string[] }> {
    try {
      const moderation = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: content
      });

      const result = moderation.results[0];
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category, _]) => category);

      return {
        flagged: result.flagged,
        categories: flaggedCategories
      };
    } catch (error) {
      throw new Error(`Content moderation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate text-to-speech narration for slides
   */
  async generateNarration(text: string, outputPath: string): Promise<void> {
    try {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);
    } catch (error) {
      throw new Error(`Narration generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const openaiService = new OpenAIService();