import re

with open('src/pages/VideoAdvertCreator.jsx', 'r') as f:
    text = f.read()

# For handleVideoCreated
text = text.replace("      durationInFrames: frames,", "      durationInFrames: frames,\n      trackIndex: 0,")

# For handleAddText
text = text.replace("      durationInFrames: 150,", "      durationInFrames: 150,\n      trackIndex: 2,")

with open('src/pages/VideoAdvertCreator.jsx', 'w') as f:
    f.write(text)
