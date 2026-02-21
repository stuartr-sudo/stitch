import re

with open('src/components/modals/PublishModal.jsx', 'r') as f:
    text = f.read()

# Add Linkedin icon
text = text.replace("import { Share2, Globe, Video, Instagram, Youtube, Twitter } from 'lucide-react';", "import { Share2, Globe, Video, Instagram, Youtube, Twitter, Linkedin } from 'lucide-react';")

# Update channel array
channels_replace = """            {[
              { id: 'TikTok', icon: <Video className="w-5 h-5" /> },
              { id: 'Instagram Reels', icon: <Instagram className="w-5 h-5" /> },
              { id: 'YouTube Shorts', icon: <Youtube className="w-5 h-5" /> },
              { id: 'YouTube Landscape', icon: <Youtube className="w-5 h-5" /> },
              { id: 'X (Twitter)', icon: <Twitter className="w-5 h-5" /> },
              { id: 'LinkedIn', icon: <Linkedin className="w-5 h-5" /> }
            ].map(channel => ("""

text = re.sub(r"            \{\[\n.*?\].map\(channel => \(", channels_replace, text, flags=re.DOTALL)

# Update description to mention Stitching
text = text.replace("Select the channels where you want to publish this video. This will render the final high-quality output and automatically upload it.", "Select the channels where you want to publish this video. We will stitch your timeline tracks together via Fal.ai FFMPEG, save the final render to your Library, and publish it.")

with open('src/components/modals/PublishModal.jsx', 'w') as f:
    f.write(text)

