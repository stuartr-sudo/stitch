import re

with open('src/pages/VideoAdvertCreator.jsx', 'r') as f:
    text = f.read()

draggable_text_component = """
// Inline component for text dragging and editing
function DraggableTextItem({ item, selectedId, onSelect, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(item.content);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!dragging) return;
    
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const parent = containerRef.current.parentElement;
      const rect = parent.getBoundingClientRect();
      // Calculate % based on mouse pos
      let x = ((e.clientX - rect.left) / rect.width) * 100;
      let y = ((e.clientY - rect.top) / rect.height) * 100;
      
      // Keep within bounds
      x = Math.max(0, Math.min(x, 90));
      y = Math.max(0, Math.min(y, 90));

      onUpdate(item.id, {
        style: { ...item.style, x, y }
      });
    };

    const handleMouseUp = () => setDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, item, onUpdate]);

  if (isEditing) {
    return (
      <input
        autoFocus
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          onUpdate(item.id, { content });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setIsEditing(false);
            onUpdate(item.id, { content });
          }
        }}
        className="absolute bg-black/50 border border-blue-400 text-white p-1 rounded z-50 focus:outline-none"
        style={{
          left: `${item.style?.x ?? 10}%`,
          top: `${item.style?.y ?? 80}%`,
          fontSize: item.style?.fontSize ?? '32px',
          fontWeight: item.style?.fontWeight ?? 'bold',
          color: item.style?.color ?? '#ffffff',
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: `${item.style?.x ?? 10}%`,
        top: `${item.style?.y ?? 80}%`,
        color: item.style?.color ?? '#ffffff',
        fontSize: item.style?.fontSize ?? '32px',
        fontWeight: item.style?.fontWeight ?? 'bold',
        textShadow: item.style?.textShadow ?? '2px 2px 4px rgba(0,0,0,0.8)',
        zIndex: 50,
        cursor: dragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(item.id);
        setDragging(true);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={`select-none ${selectedId === item.id ? 'ring-2 ring-blue-500 border border-dashed border-blue-400 p-1 bg-blue-500/10' : ''}`}
    >
      {item.content}
    </div>
  );
}

export default function VideoAdvertCreator() {"""

text = text.replace("export default function VideoAdvertCreator() {", draggable_text_component)

render_block = """                if (item.type === 'text') {
                  return (
                    <DraggableTextItem
                      key={item.id}
                      item={item}
                      selectedId={selectedTimelineId}
                      onSelect={setSelectedTimelineId}
                      onUpdate={(id, updates) => setCreatedVideos(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))}
                    />
                  );
                }"""

old_render_block_start = "                if (item.type === 'text') {"
old_render_block_end = "                      {item.content}\n                    </div>\n                  );\n                }"
text = re.sub(r"                if \(item\.type === 'text'\) \{.*?                      \{item\.content\}\n                    </div>\n                  \);\n                \}", render_block, text, flags=re.DOTALL)

with open('src/pages/VideoAdvertCreator.jsx', 'w') as f:
    f.write(text)

print("Added DraggableTextItem")
