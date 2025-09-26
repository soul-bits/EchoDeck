import openai
import os
from typing import Dict, List, Optional
import json
from models import Slide
from config import OPENAI_API_KEY

class OpenAIService:
    def __init__(self):
        # Initialize OpenAI client
        self.client = openai.OpenAI(
            api_key=OPENAI_API_KEY
        )
    
    async def transcribe_audio(self, file_path: str) -> Dict:
        """Transcribe audio file using OpenAI Whisper"""

        with open(file_path, "rb") as audio_file:
            transcript = self.client.audio.transcriptions.create(
                model="whisper-1", file=audio_file, temperature=0
            )

            
        return {
            "text": transcript.text,
            "duration": transcript.duration if hasattr(transcript, 'duration') else 0,
            "language": transcript.language if hasattr(transcript, 'language') else 'en'
            }
    
    async def generate_presentation(self, transcript: str, style: str, slide_count: Optional[int] = None) -> Dict:
        """Generate presentation slides from transcript using GPT-4"""
        try:
            # Determine slide count if not provided
            if slide_count is None:
                word_count = len(transcript.split())
                slide_count = max(3, min(10, word_count // 100))  # 1 slide per ~100 words
            
            # Create prompt based on style
            style_prompts = {
                "professional": "Create a professional business presentation with clear, concise points and formal language.",
                "creative": "Create a creative and engaging presentation with dynamic content and innovative ideas.",
                "academic": "Create an academic presentation with detailed analysis, citations, and scholarly approach.",
                "casual": "Create a casual, conversational presentation with friendly tone and accessible language."
            }
            
            style_instruction = style_prompts.get(style, style_prompts["professional"])
            
            prompt = f"""
            Based on the following transcript, {style_instruction}
            
            Create exactly {slide_count} slides. For each slide, provide:
            1. A clear, engaging title
            2. 3-5 bullet points of content
            3. Optional speaker notes
            4. A DALL-E prompt for generating a relevant image
            
            Return the response as a JSON object with this structure:
            {{
                "title": "Presentation Title",
                "slides": [
                    {{
                        "order": 1,
                        "title": "Slide Title",
                        "content": ["Point 1", "Point 2", "Point 3"],
                        "speaker_notes": "Optional notes for the speaker",
                        "dalle_prompt": "A detailed prompt for DALL-E to generate a relevant image"
                    }}
                ]
            }}
            
            Transcript:
            {transcript}
            """
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert presentation designer. Create engaging, well-structured presentations from transcripts."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            
            # Parse the JSON response
            content = response.choices[0].message.content
            presentation_data = json.loads(content)
            
            # Convert to our Slide model format
            slides = []
            for slide_data in presentation_data["slides"]:
                slide = Slide(
                    order=slide_data["order"],
                    title=slide_data["title"],
                    content=slide_data["content"],
                    speaker_notes=slide_data.get("speaker_notes"),
                    dalle_prompt=slide_data.get("dalle_prompt")
                )
                slides.append(slide)
            
            return {
                "title": presentation_data["title"],
                "slides": slides
            }
            
        except Exception as e:
            # For demo purposes, return mock data if OpenAI fails
            if "401" in str(e) or "invalid_api_key" in str(e):
                print(f"OpenAI API key is invalid or expired. Using mock data. Please update your API key in the .env file.")
            else:
                print(f"OpenAI presentation generation failed: {e}")
            return self._generate_mock_presentation(transcript, style, slide_count)
    
    def _generate_mock_presentation(self, transcript: str, style: str, slide_count: int) -> Dict:
        """Generate mock presentation data for demo purposes"""
        slides = []
        
        # Create title slide
        slides.append(Slide(
            order=1,
            title="Welcome to EchoDeck",
            content=[
                "Transform your audio into engaging presentations",
                "Powered by AI technology",
                "Professional results in minutes"
            ],
            speaker_notes="Welcome the audience and introduce the topic",
            dalle_prompt="A modern, professional presentation setup with microphone and slides"
        ))
        
        # Create content slides
        for i in range(2, slide_count + 1):
            slides.append(Slide(
                order=i,
                title=f"Key Point {i-1}",
                content=[
                    f"Important insight from your audio content",
                    f"Supporting detail for point {i-1}",
                    f"Actionable takeaway for the audience"
                ],
                speaker_notes=f"Elaborate on the key points and provide examples",
                dalle_prompt=f"An illustration representing key concept {i-1} in {style} style"
            ))
        
        return {
            "title": f"Presentation from Audio ({style.title()} Style)",
            "slides": slides
        }
    
    async def generate_slide_image(self, dalle_prompt: str) -> str:
        """Generate image for slide using DALL-E"""
        try:
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=dalle_prompt,
                size="1024x1024",
                quality="standard",
                n=1
            )
            
            return response.data[0].url
            
        except Exception as e:
            if "401" in str(e) or "invalid_api_key" in str(e):
                print(f"OpenAI API key is invalid or expired. Using placeholder image. Please update your API key in the .env file.")
            else:
                print(f"DALL-E image generation failed: {e}")
            # Return a placeholder image URL
            return "https://via.placeholder.com/1024x1024/4F46E5/FFFFFF?text=EchoDeck+Slide"