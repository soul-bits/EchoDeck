import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Slide } from '@shared/schema';

interface ConversionOptions {
  includeImages?: boolean;
  includeNotes?: boolean;
  templateStyle?: 'professional' | 'modern' | 'minimal';
}

interface ConversionResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  content?: string; // For text-based formats like HTML
}

export class PPTXConverter {
  private outputDir: string;

  constructor(outputDir: string = './exports/converted') {
    this.outputDir = outputDir;
  }

  /**
   * Convert PPTX to PDF using HTML conversion (simplified approach)
   */
  async convertToPDF(pptxPath: string, presentation: any): Promise<ConversionResult> {
    try {
      console.log(`Converting PPTX to PDF: ${pptxPath}`);
      
      // For now, we'll generate PDF content directly from the presentation data
      // In a more advanced implementation, you could use puppeteer to render the PPTX
      const pdfContent = this.generatePdfContent(presentation);
      
      await fs.mkdir(this.outputDir, { recursive: true });
      const fileName = `${presentation.title || 'presentation'}_${randomUUID()}.pdf`;
      const filePath = path.join(this.outputDir, fileName);
      
      await fs.writeFile(filePath, pdfContent);
      const stats = await fs.stat(filePath);
      
      return {
        filePath,
        fileName,
        fileSize: stats.size,
        content: pdfContent
      };
    } catch (error) {
      throw new Error(`PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert PPTX to HTML using presentation data
   */
  async convertToHTML(pptxPath: string, presentation: any): Promise<ConversionResult> {
    try {
      console.log(`Converting PPTX to HTML: ${pptxPath}`);
      
      const htmlContent = this.generateHtmlContent(presentation);
      
      await fs.mkdir(this.outputDir, { recursive: true });
      const fileName = `${presentation.title || 'presentation'}_${randomUUID()}.html`;
      const filePath = path.join(this.outputDir, fileName);
      
      await fs.writeFile(filePath, htmlContent);
      const stats = await fs.stat(filePath);
      
      return {
        filePath,
        fileName,
        fileSize: stats.size,
        content: htmlContent
      };
    } catch (error) {
      throw new Error(`HTML conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get metadata from PPTX file (for integration with Google Slides)
   */
  async extractPresentationData(pptxPath: string, presentation: any): Promise<any> {
    try {
      console.log(`Extracting data from PPTX: ${pptxPath}`);
      
      // Return the original presentation data since we already have it
      // In a more advanced implementation, you could parse the PPTX file directly
      return {
        title: presentation.title,
        slides: presentation.slides,
        slideCount: presentation.slides?.length || 0,
        estimatedDuration: presentation.estimatedDuration
      };
    } catch (error) {
      throw new Error(`Data extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate PDF content from presentation data
   */
  private generatePdfContent(presentation: any): string {
    const slides = presentation.slides || [];
    
    // Helper function to escape PDF text
    function escapePdfText(text: string): string {
      if (!text) return '';
      return text
        .replace(/\\/g, '\\\\')  // Escape backslashes
        .replace(/\(/g, '\\(')   // Escape opening parentheses
        .replace(/\)/g, '\\)')   // Escape closing parentheses
        .replace(/\r?\n/g, '\\n'); // Handle newlines
    }

    // Basic PDF structure
    let pdf = `%PDF-1.4
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
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 200
>>
stream
BT
/F1 24 Tf
50 750 Td
(${escapePdfText(presentation.title || 'Presentation')}) Tj
0 -30 Td
`;

    // Add slides content
    slides.forEach((slide: any, index: number) => {
      pdf += `/F1 16 Tf\n`;
      pdf += `(Slide ${index + 1}: ${escapePdfText(slide.title)}) Tj\n`;
      pdf += `0 -20 Td\n`;
      
      if (slide.bulletPoints && Array.isArray(slide.bulletPoints)) {
        slide.bulletPoints.forEach((point: string) => {
          pdf += `/F1 12 Tf\n`;
          pdf += `(• ${escapePdfText(point)}) Tj\n`;
          pdf += `0 -15 Td\n`;
        });
      }
      pdf += `0 -10 Td\n`;
    });

    pdf += `ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
0000000380 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${pdf.length + 50}
%%EOF`;

    return pdf;
  }

  /**
   * Generate HTML content from presentation data
   */
  private generateHtmlContent(presentation: any): string {
    const slides = presentation.slides || [];
    
    const slideHTML = slides.map((slide: any, index: number) => {
      const bulletPoints = Array.isArray(slide.bulletPoints) 
        ? slide.bulletPoints.map(point => `<li>${this.escapeHtml(point)}</li>`).join('')
        : '';
      
      const imageHTML = slide.imageUrl 
        ? `<img src="${this.escapeHtml(slide.imageUrl)}" alt="Slide ${index + 1} Image" style="max-width: 100%; height: auto; margin: 20px 0;" />`
        : '';
      
      return `
        <section class="slide" id="slide-${index + 1}">
          <h2>${this.escapeHtml(slide.title)}</h2>
          ${imageHTML}
          ${bulletPoints ? `<ul>${bulletPoints}</ul>` : ''}
          ${slide.speakerNotes ? `<div class="speaker-notes"><strong>Speaker Notes:</strong> ${this.escapeHtml(slide.speakerNotes)}</div>` : ''}
        </section>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(presentation.title || 'Presentation')}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .slide {
            padding: 40px;
            border-bottom: 1px solid #eee;
            min-height: 400px;
        }
        .slide:last-child {
            border-bottom: none;
        }
        .slide h2 {
            color: #333;
            font-size: 2em;
            margin-bottom: 20px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        .slide ul {
            font-size: 1.1em;
            line-height: 1.8;
            color: #555;
        }
        .slide li {
            margin-bottom: 10px;
        }
        .speaker-notes {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin-top: 20px;
            font-style: italic;
            color: #666;
        }
        .navigation {
            background: #333;
            color: white;
            padding: 15px;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
        }
        @media print {
            .navigation { display: none; }
            .slide { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.escapeHtml(presentation.title || 'Presentation')}</h1>
            <p>Interactive HTML Presentation • ${slides.length} slides</p>
        </div>
        ${slideHTML}
    </div>
    <div class="navigation">
        <p>Use Ctrl+P to print or save as PDF</p>
    </div>
</body>
</html>`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Clean up old converted files
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = await fs.readdir(this.outputDir);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

      for (const file of files) {
        if (file.endsWith('.pdf') || file.endsWith('.html')) {
          const filePath = path.join(this.outputDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old converted file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old converted files:', error);
    }
  }
}

// Export singleton instance
export const pptxConverter = new PPTXConverter();