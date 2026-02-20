import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, Video, Img, Sequence } from 'remotion';

function AdComposition({ clips, textOverlays }) {
  let currentFrame = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {clips.map((clip, i) => {
        const from = currentFrame;
        const duration = clip.durationInFrames || 150;
        currentFrame += duration;
        return (
          <Sequence key={i} from={from} durationInFrames={duration}>
            <AbsoluteFill>
              {clip.type === 'video' ? (
                <Video src={clip.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Img src={clip.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}
      {textOverlays?.map((overlay, i) => (
        <Sequence key={`text-${i}`} from={overlay.fromFrame || 0} durationInFrames={overlay.durationInFrames || 90}>
          <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', padding: 40 }}>
            <div style={{
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: 24,
              fontWeight: 'bold',
            }}>
              {overlay.text}
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

export default function StudioTimeline({ clips = [], textOverlays = [], width = 1080, height = 1920 }) {
  const totalFrames = clips.reduce((sum, c) => sum + (c.durationInFrames || 150), 0) || 300;

  return (
    <div className="bg-slate-900 border-t p-4">
      <div className="flex items-center gap-4 mb-3">
        <h3 className="text-white text-sm font-semibold">Timeline</h3>
        <span className="text-slate-400 text-xs">{clips.length} clips | {Math.round(totalFrames / 30)}s</span>
      </div>
      {clips.length > 0 ? (
        <Player
          component={AdComposition}
          inputProps={{ clips, textOverlays }}
          durationInFrames={totalFrames}
          fps={30}
          compositionWidth={width}
          compositionHeight={height}
          style={{ width: '100%', height: 200 }}
          controls
        />
      ) : (
        <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">
          Generate images and videos above, then drag them here to build your ad
        </div>
      )}
      {/* Track lanes */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-16 text-right">Video</div>
          <div className="flex-1 h-8 bg-slate-800 rounded flex gap-1 p-1 overflow-x-auto">
            {clips.map((clip, i) => (
              <div key={i} className="h-full bg-[#2C666E] rounded px-2 flex items-center text-white text-xs whitespace-nowrap">
                {clip.title || `Clip ${i + 1}`}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-16 text-right">Audio</div>
          <div className="flex-1 h-8 bg-slate-800 rounded" />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-16 text-right">Text</div>
          <div className="flex-1 h-8 bg-slate-800 rounded" />
        </div>
      </div>
    </div>
  );
}
