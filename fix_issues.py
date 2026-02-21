import re

with open('src/pages/VideoAdvertCreator.jsx', 'r') as f:
    text = f.read()

# Fix 1: LibraryModal missing properties
library_replace = """          if (item.type === 'video') {
            const nextStartAt = createdVideos.length > 0 ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 150))) : 0;
            const newVideo = {
              id: Date.now().toString(),
              type: 'video',
              url: item.url || item.video_url,
              title: item.title || `Video from Library`,
              createdAt: new Date().toISOString(),
              source: 'library',
              durationInFrames: 300,
              startAt: nextStartAt,
              trackIndex: 0
            };"""
text = re.sub(r"          if \(item\.type === 'video'\) \{\n            const newVideo = \{\n              id: Date\.now\(\)\.toString\(\),\n              url: item\.url \|\| item\.video_url,\n              title: item\.title \|\| `Video from Library`,\n              createdAt: new Date\(\)\.toISOString\(\),\n              source: 'library',\n              durationInFrames: 300,\n            \};", library_replace, text)

# Fix 2: LibraryModal for Images missing properties
image_replace = """          } else {
            const nextStartAt = createdVideos.length > 0 ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 150))) : 0;
            const newImage = {
              id: Date.now().toString(),
              type: 'image',
              url: item.url || item.image_url,
              title: item.title || 'Library image',
              createdAt: new Date().toISOString(),
              startAt: nextStartAt,
              durationInFrames: 150,
              trackIndex: 0
            };
            setCreatedVideos(prev => [newImage, ...prev]);
            toast.success('Image added to your collection!');
          }"""
text = re.sub(r"          \} else \{\n            const newImage = \{\n              id: Date\.now\(\)\.toString\(\),\n              url: item\.url \|\| item\.image_url,\n              prompt: item\.title \|\| 'Library image',\n              createdAt: new Date\(\)\.toISOString\(\),\n            \};\n            setCreatedImages\(prev => \[newImage, \.\.\.prev\]\);\n            toast\.success\('Image added to your collection!'\);\n          \}", image_replace, text)


# Fix 3: Remove "Export (Stitch)" button and rename "Save to Campaign" to "Save Project"
text = re.sub(r"              <Button size=\"sm\" onClick=\{\(\) => \{\n                toast\.promise\(\n                  new Promise\(resolve => setTimeout\(resolve, 4000\)\),\n                  \{\n                    loading: 'Stitching timeline via Fal\.ai FFMPEG\.\.\.',\n                    success: 'Timeline stitched successfully! Video ready for download\.',\n                    error: 'Failed to stitch video'\n                  \}\n                \);\n              \}\} className=\"h-8 bg-blue-600 hover:bg-blue-700 text-white\">\n                Export \(Stitch\)\n              </Button>\n", "", text)

text = text.replace("Save to Campaign", "Save Project")

with open('src/pages/VideoAdvertCreator.jsx', 'w') as f:
    f.write(text)

