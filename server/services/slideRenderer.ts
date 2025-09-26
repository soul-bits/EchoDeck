import puppeteer, { Browser, Page } from "puppeteer";
import fs from "fs";
import path from "path";
import type { Slide } from "@shared/schema";

export interface SlideRenderResult {
  imagePath: string;
  width: number;
  height: number;
}

export interface PresentationRenderResult {
  slideId: string;
  imagePath: string;
  width: number;
  height: number;
}

export interface SlideContent {
  id: string;
  content: string;
}

export class SlideRenderer {
  private readonly tempDir: string;
  private readonly width = 1920;
  private readonly height = 1080;
  private browser: Browser | null = null;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // Base delay in milliseconds

  constructor() {
    // Create temporary directory for slide images
    this.tempDir = path.join(process.cwd(), "uploads", "slide_images");
    this.ensureTempDirectory();
  }

  /**
   * Render a single slide from HTML content to PNG image
   */
  async renderSlide(slideHtml: string, slideId: string): Promise<SlideRenderResult> {
    if (!slideHtml || slideHtml.trim().length === 0) {
      throw new Error("No HTML content provided for slide rendering");
    }

    try {
      console.log(`Rendering slide ${slideId} to image (${this.width}x${this.height})`);

      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // Configure viewport for video resolution
      await page.setViewport({
        width: this.width,
        height: this.height,
        deviceScaleFactor: 1,
      });

      // Set HTML content with proper styling
      const fullHtml = this.wrapSlideHtml(slideHtml);
      await page.setContent(fullHtml, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000
      });

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `slide_${slideId}_${timestamp}.png`;
      const imagePath = path.join(this.tempDir, filename);

      // Render to PNG with high quality
      await page.screenshot({
        path: imagePath as `${string}.png`,
        type: 'png',
        clip: {
          x: 0,
          y: 0,
          width: this.width,
          height: this.height
        }
      });

      await page.close();

      // Verify file was created and has content
      if (!fs.existsSync(imagePath)) {
        throw new Error("Slide image was not created");
      }

      const stats = fs.statSync(imagePath);
      if (stats.size === 0) {
        throw new Error("Generated slide image is empty");
      }

      console.log(`Slide rendered successfully: ${imagePath} (${stats.size} bytes)`);

      return {
        imagePath,
        width: this.width,
        height: this.height
      };

    } catch (error) {
      console.error(`Slide rendering failed for slide ${slideId}:`, error);
      throw new Error(`Slide rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Render all slides in a presentation to PNG images
   */
  async renderPresentation(slides: SlideContent[]): Promise<PresentationRenderResult[]> {
    if (!slides || slides.length === 0) {
      throw new Error("No slides provided for rendering");
    }

    const results: PresentationRenderResult[] = [];
    const errors: Array<{ slideId: string; error: string }> = [];

    console.log(`Rendering ${slides.length} slides to images (${this.width}x${this.height})`);

    try {
      // Initialize browser once for all slides
      await this.getBrowser();

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const slideNumber = i + 1;

        try {
          console.log(`Processing slide ${slideNumber}/${slides.length}: ${slide.id}`);

          const result = await this.renderSlideWithRetry(slide.content, slide.id);

          results.push({
            slideId: slide.id,
            imagePath: result.imagePath,
            width: result.width,
            height: result.height
          });

          // Add small delay between slides to prevent resource exhaustion
          if (i < slides.length - 1) {
            await this.delay(200);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Failed to render slide ${slideNumber}:`, errorMessage);
          errors.push({ slideId: slide.id, error: errorMessage });
        }
      }

      if (results.length === 0 && errors.length > 0) {
        throw new Error(`Failed to render any slides. Errors: ${errors.map(e => e.error).join(', ')}`);
      }

      if (errors.length > 0) {
        console.warn(`Rendered ${results.length}/${slides.length} slides. ${errors.length} slides failed.`);
      } else {
        console.log(`Successfully rendered all ${results.length} slides to images`);
      }

      return results;

    } finally {
      // Clean up browser resources
      await this.closeBrowser();
    }
  }

  /**
   * Render slides from the database schema format
   */
  async renderPresentationFromSlides(slides: Slide[]): Promise<PresentationRenderResult[]> {
    if (!slides || slides.length === 0) {
      throw new Error("No slides provided for rendering");
    }

    // Convert Slide objects to SlideContent format
    const slideContent: SlideContent[] = slides.map(slide => ({
      id: slide.id,
      content: this.generateSlideHtml(slide)
    }));

    return this.renderPresentation(slideContent);
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return true; // Puppeteer doesn't require external API keys
  }

  /**
   * Clean up old temporary image files
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
      console.log(`Cleaned up ${cleanedCount} old slide image files`);
    }
  }

  /**
   * Close browser and cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.closeBrowser();
  }

  /**
   * Private method to get or create browser instance
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      console.log("Initializing production-hardened Puppeteer browser...");
      this.browser = await puppeteer.launch({
        headless: 'new', // Use new headless mode
        timeout: 30000, // 30 second timeout
        args: [
          // Security flags for production containers
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--no-zygote',
          '--disable-features=VizDisplayCompositor',
          
          // Additional production performance flags
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-default-apps',
          '--disable-sync',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-plugins',
          '--memory-pressure-off',
          '--max_old_space_size=2048'
        ],
        defaultViewport: {
          width: this.width,
          height: this.height
        },
        protocolTimeout: 30000
      });
      console.log("Production-hardened Puppeteer browser initialized");
    }
    return this.browser;
  }

  /**
   * Private method to close browser instance
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser && this.browser.isConnected()) {
      await this.browser.close();
      this.browser = null;
      console.log("Browser closed");
    }
  }

  /**
   * Private method to wrap slide HTML with proper styling
   */
  private wrapSlideHtml(slideHtml: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slide</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: ${this.width}px;
      height: ${this.height}px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .slide-container {
      width: 100%;
      height: 100%;
      padding: 60px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      background: white;
    }
    
    h1, h2, h3 {
      color: #1a1a1a;
      margin-bottom: 30px;
      line-height: 1.2;
    }
    
    h1 {
      font-size: 72px;
      font-weight: 700;
    }
    
    h2 {
      font-size: 56px;
      font-weight: 600;
    }
    
    h3 {
      font-size: 42px;
      font-weight: 500;
    }
    
    p, li {
      font-size: 32px;
      color: #333;
      line-height: 1.5;
      margin-bottom: 20px;
    }
    
    ul {
      list-style: none;
      padding-left: 0;
    }
    
    li {
      position: relative;
      padding-left: 40px;
      margin-bottom: 15px;
    }
    
    li:before {
      content: "•";
      color: #0066cc;
      font-size: 36px;
      position: absolute;
      left: 0;
      top: -5px;
    }
    
    .highlight {
      background: #0066cc;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      display: inline-block;
    }
    
    /* Custom styling for specific slide types */
    .slide-title {
      text-align: center;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    
    .slide-content {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div class="slide-container">
    ${slideHtml}
  </div>
</body>
</html>`;
  }

  /**
   * Generate HTML content from Slide schema object
   */
  private generateSlideHtml(slide: Slide): string {
    const bulletPointsHtml = slide.bulletPoints && slide.bulletPoints.length > 0
      ? `<ul>${slide.bulletPoints.map(point => `<li>${this.escapeHtml(point)}</li>`).join('')}</ul>`
      : '';

    // Check if this is a title slide (first slide or slide with minimal content)
    const isTitleSlide = slide.slideNumber === 1 || (!slide.bulletPoints || slide.bulletPoints.length === 0);

    if (isTitleSlide) {
      return `
        <div class="slide-title">
          <h1>${this.escapeHtml(slide.title)}</h1>
        </div>
      `;
    }

    return `
      <div class="slide-content">
        <h2>${this.escapeHtml(slide.title)}</h2>
        ${bulletPointsHtml}
      </div>
    `;
  }

  /**
   * Private method to render slide with retry logic
   */
  private async renderSlideWithRetry(
    slideHtml: string, 
    slideId: string, 
    attempt: number = 1
  ): Promise<SlideRenderResult> {
    try {
      return await this.renderSlide(slideHtml, slideId);
    } catch (error: any) {
      if (attempt < this.maxRetries && this.isRetryableError(error)) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.warn(`Slide rendering failed, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})`);
        
        await this.delay(delay);
        
        // Close and recreate browser on retry to handle potential browser issues
        await this.closeBrowser();
        
        return this.renderSlideWithRetry(slideHtml, slideId, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Private method to check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error || !error.message) return false;
    
    const retryablePatterns = [
      'Navigation failed',
      'ERR_NAME_NOT_RESOLVED',
      'ERR_INTERNET_DISCONNECTED',
      'Timeout',
      'Navigation timeout',
      'Protocol error',
      'Target closed',
      'Session closed',
      'Connection closed'
    ];
    
    return retryablePatterns.some(pattern => 
      error.message.includes(pattern)
    );
  }

  /**
   * Private method to ensure temp directory exists
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      console.log(`Created slide images directory: ${this.tempDir}`);
    }
  }

  /**
   * Private method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Private method to escape HTML entities
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

// Export singleton instance
export const slideRenderer = new SlideRenderer();