import os
import aiofiles
from fastapi import UploadFile
from typing import Optional
import uuid
from pathlib import Path

class FileService:
    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = Path(upload_dir)
        self.audio_dir = self.upload_dir / "audio"
        self.exports_dir = self.upload_dir / "exports"
        
        # Create directories if they don't exist
        self.audio_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)
    
    async def save_audio_file(self, file: UploadFile, upload_id: str) -> str:
        """Save uploaded audio file and return file path"""
        try:
            # Get file extension
            file_extension = self._get_file_extension(file.filename)
            
            # Create unique filename
            filename = f"{upload_id}{file_extension}"
            file_path = self.audio_dir / filename
            
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            return str(file_path)
            
        except Exception as e:
            raise Exception(f"Failed to save audio file: {str(e)}")
    
    def _get_file_extension(self, filename: Optional[str]) -> str:
        """Extract file extension from filename"""
        if not filename:
            return ".mp3"  # Default extension
        
        extension = Path(filename).suffix.lower()
        
        # Validate audio extensions
        valid_extensions = [".mp3", ".wav", ".m4a", ".flac", ".ogg"]
        if extension in valid_extensions:
            return extension
        
        return ".mp3"  # Default to mp3 if unknown
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete a file from storage"""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Failed to delete file {file_path}: {str(e)}")
            return False
    
    def get_file_size(self, file_path: str) -> int:
        """Get file size in bytes"""
        try:
            return Path(file_path).stat().st_size
        except Exception:
            return 0
    
    def file_exists(self, file_path: str) -> bool:
        """Check if file exists"""
        return Path(file_path).exists()
    
    async def save_export_file(self, content: bytes, filename: str) -> str:
        """Save exported presentation file"""
        try:
            file_path = self.exports_dir / filename
            
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            return str(file_path)
            
        except Exception as e:
            raise Exception(f"Failed to save export file: {str(e)}")
    
    def cleanup_old_files(self, max_age_hours: int = 24):
        """Clean up old uploaded files (for maintenance)"""
        import time
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        for directory in [self.audio_dir, self.exports_dir]:
            for file_path in directory.iterdir():
                if file_path.is_file():
                    file_age = current_time - file_path.stat().st_mtime
                    if file_age > max_age_seconds:
                        try:
                            file_path.unlink()
                            print(f"Cleaned up old file: {file_path}")
                        except Exception as e:
                            print(f"Failed to clean up file {file_path}: {str(e)}")