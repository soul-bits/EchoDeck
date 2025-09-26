import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# OpenAI Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Server Configuration
PORT = int(os.getenv('PORT', 8000))
HOST = os.getenv('HOST', '0.0.0.0')

# File Upload Configuration
MAX_FILE_SIZE = os.getenv('MAX_FILE_SIZE', '50MB')
UPLOAD_DIR = os.getenv('UPLOAD_DIR', './uploads')
