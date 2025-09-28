#!/usr/bin/env python3
"""
Setup script to help configure the OpenAI API key
"""

import os

def setup_openai_key():
    print("🔧 OpenAI API Key Setup")
    print("=" * 40)
    
    # Check if .env file exists
    env_file = ".env"
    if os.path.exists(env_file):
        print(f"✅ Found existing {env_file} file")
        with open(env_file, 'r') as f:
            content = f.read()
            if "OPENAI_API_KEY" in content:
                print("✅ OPENAI_API_KEY found in .env file")
                if "your-openai-api-key-here" in content or "your-actual-api-key-here" in content:
                    print("⚠️  Please replace the placeholder with your actual API key")
                else:
                    print("✅ API key appears to be set")
                return
    
    print(f"📝 Creating {env_file} file...")
    
    # Get API key from user
    print("\n🔑 Please get your OpenAI API key:")
    print("1. Go to: https://platform.openai.com/api-keys")
    print("2. Sign in to your OpenAI account")
    print("3. Click 'Create new secret key'")
    print("4. Copy the key (it starts with 'sk-')")
    
    api_key = input("\n🔐 Enter your OpenAI API key (or press Enter to create template): ").strip()
    
    # Create .env file
    env_content = f"""# OpenAI Configuration
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY={api_key if api_key else 'your-openai-api-key-here'}

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
"""
    
    try:
        with open(env_file, 'w') as f:
            f.write(env_content)
        
        if api_key:
            print(f"✅ Created {env_file} with your API key")
        else:
            print(f"📝 Created {env_file} template")
            print(f"⚠️  Please edit {env_file} and add your actual API key")
        
        print("\n🚀 Setup complete! You can now run the application.")
        
    except Exception as e:
        print(f"❌ Error creating {env_file}: {e}")

if __name__ == "__main__":
    setup_openai_key()
