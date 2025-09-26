import OpenAI from "openai";

// Initialize OpenAI client for MCP calls
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GoogleSlidesConfig {
  zapierMcpUrl: string;
  zapierMcpApiKey: string;
}

export interface SlideContent {
  title: string;
  bulletPoints: string[];
  speakerNotes: string;
  imageUrl?: string;
}

export interface GoogleSlidesPresentation {
  presentationId: string;
  url: string;
  title: string;
}

export class GoogleSlidesService {
  private config: GoogleSlidesConfig;

  constructor() {
    this.config = {
      zapierMcpUrl: process.env.ZAPIER_MCP_URL || "https://mcp.zapier.com/api/mcp/mcp",
      zapierMcpApiKey: process.env.ZAPIER_MCP_API_KEY || ""
    };

    if (!this.config.zapierMcpApiKey) {
      console.warn("ZAPIER_MCP_API_KEY not configured. Google Slides integration will not work.");
    }
  }

  /**
   * Create a new Google Slides presentation
   */
  async createPresentation(title: string): Promise<GoogleSlidesPresentation> {
    try {
      const response = await openai.responses.create({
        model: "gpt-4o",
        input: `Create a new Google Slides presentation with the title "${title}"`,
        tool_choice: "required",
        tools: [
          {
            type: "mcp",
            server_label: "zapier",
            server_url: this.config.zapierMcpUrl,
            require_approval: "never",
            headers: {
              Authorization: `Bearer ${this.config.zapierMcpApiKey}`,
            },
          },
        ],
      });

      // Parse the response to extract presentation ID and URL
      const result = this.parseMcpResponse(response);
      
      return {
        presentationId: result.presentationId,
        url: result.url,
        title: title
      };
    } catch (error) {
      // Improved rate limit detection using proper error properties
      if (error instanceof Error) {
        if (error.message.includes('rate_limit_exceeded') || 
            (error as any).status === 429 || 
            (error as any).code === 'rate_limit_exceeded') {
          console.warn("OpenAI rate limit reached for Google Slides creation. Please try again in a few minutes.");
          throw new Error("Google Slides creation temporarily unavailable due to rate limits. Please try again in a few minutes.");
        }
      }
      console.error("Failed to create Google Slides presentation:", error);
      throw new Error(`Google Slides creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a slide to an existing presentation
   */
  async addSlide(presentationId: string, slideContent: SlideContent): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const slideData = {
          title: slideContent.title,
          content: slideContent.bulletPoints.join('\n• '),
          notes: slideContent.speakerNotes,
          imageUrl: slideContent.imageUrl
        };

        await openai.responses.create({
          model: "gpt-4o",
          input: `Add a slide to Google Slides presentation ${presentationId} with title "${slideContent.title}" and content: ${JSON.stringify(slideData)}`,
          tool_choice: "required",
          tools: [
            {
              type: "mcp",
              server_label: "zapier",
              server_url: this.config.zapierMcpUrl,
              require_approval: "never",
              headers: {
                Authorization: `Bearer ${this.config.zapierMcpApiKey}`,
              },
            },
          ],
        });

        console.log(`Added slide "${slideContent.title}" to presentation ${presentationId}`);
        return; // Success, exit the retry loop
      } catch (error) {
        // Improved rate limit detection
        if (error instanceof Error && 
            (error.message.includes('rate_limit_exceeded') || 
             (error as any).status === 429 || 
             (error as any).code === 'rate_limit_exceeded')) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error("Max retries reached for slide creation due to rate limits");
            throw new Error("Google Slides slide creation failed due to rate limits. Please try again later.");
          }
          
          const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
          console.warn(`Rate limit hit, retrying in ${backoffDelay}ms (attempt ${retryCount}/${maxRetries})`);
          await this.delay(backoffDelay);
        } else {
          console.error("Failed to add slide to Google Slides:", error);
          throw new Error(`Failed to add slide: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }

  /**
   * Create a complete presentation with multiple slides
   */
  async createCompletePresentation(
    title: string, 
    slides: SlideContent[]
  ): Promise<GoogleSlidesPresentation> {
    try {
      console.log(`Creating Google Slides presentation: ${title} with ${slides.length} slides`);
      
      // Create the initial presentation
      const presentation = await this.createPresentation(title);
      
      // Add each slide
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        console.log(`Adding slide ${i + 1}/${slides.length}: ${slide.title}`);
        await this.addSlide(presentation.presentationId, slide);
        
        // Small delay to avoid rate limiting
        await this.delay(500);
      }

      console.log(`Google Slides presentation created successfully: ${presentation.url}`);
      return presentation;
    } catch (error) {
      console.error("Failed to create complete Google Slides presentation:", error);
      throw new Error(`Complete presentation creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if Google Slides integration is configured
   */
  isConfigured(): boolean {
    return !!this.config.zapierMcpApiKey && !!this.config.zapierMcpUrl;
  }

  /**
   * Parse MCP response to extract presentation data
   */
  private parseMcpResponse(response: any): { presentationId: string; url: string } {
    try {
      console.log("Parsing MCP response:", JSON.stringify(response, null, 2));
      
      // Try multiple response format patterns for OpenAI Responses API
      let content = '';
      
      // Pattern 1: Standard chat-style response
      if (response.choices?.[0]?.message?.content) {
        content = response.choices[0].message.content;
      }
      // Pattern 2: Direct output text (newer format)
      else if (response.output_text) {
        content = response.output_text;
      }
      // Pattern 3: Tool call results
      else if (response.choices?.[0]?.message?.tool_calls) {
        const toolCalls = response.choices[0].message.tool_calls;
        content = toolCalls.map((call: any) => call.function?.arguments || call.arguments || '').join(' ');
      }
      // Pattern 4: Content array format
      else if (response.choices?.[0]?.message?.content_array) {
        content = response.choices[0].message.content_array.map((item: any) => item.text || item.content || '').join(' ');
      }
      
      if (!content) {
        throw new Error("No readable content found in MCP response. Response structure may be unexpected.");
      }
      
      // Try to extract presentation ID and URL from the response content
      const presentationIdMatch = content.match(/presentation[_\s]?id[:\s]+([a-zA-Z0-9_-]+)/i);
      const urlMatch = content.match(/https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
      
      if (presentationIdMatch && urlMatch) {
        return {
          presentationId: presentationIdMatch[1],
          url: urlMatch[0]
        };
      } else {
        // NO MOCK FALLBACK - fail explicitly with detailed error info
        throw new Error(`Could not extract presentation ID and URL from Google Slides response. Content received: ${content.substring(0, 200)}...`);
      }
    } catch (error) {
      console.error("Failed to parse MCP response:", error);
      console.error("Full response object:", response);
      throw new Error(`Failed to parse Google Slides response: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
    }
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const googleSlidesService = new GoogleSlidesService();