/**
 * Production Engine — Generates complete production packages for short-form video.
 *
 * Takes a niche + topic and produces a full Fichtean Curve script with:
 * - Beat-by-beat narration
 * - Visual prompts per beat (for AI image/video generation)
 * - SFX cues per beat
 * - Music direction with energy curve
 * - Transition instructions
 * - Quality checklist
 *
 * Used by: api/campaigns/preview-script.js (replaces old narrativeGenerator)
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logCost } from './costLogger.js';
import {
  BEAT_STRUCTURE,
  ESCALATION_CONNECTORS,
  REFRAME_CONNECTORS,
  BANNED_PHRASES,
  VISUAL_TRANSITIONS,
  AUDIO_TRANSITIONS,
  NICHE_CONNECTOR_FLAVORS,
  buildNichePromptSection,
  getNicheBlueprint,
} from './nicheBlueprints.js';
import { buildBrandContextSection, validateBrandContent } from './brandMode.js';
import { BRAND_WRITING_PRINCIPLES } from './brandWritingPrinciples.js';

// ─── ZOD SCHEMA ─────────────────────────────────────────────────────────────

const CharacterReferenceSchema = z.object({
  id: z.string().describe('Short unique ID for this character, e.g. "founder", "detective", "hiker", "parent". Used to reference in visual prompts.'),
  description: z.string().describe('DETAILED physical description that will be injected into EVERY visual prompt featuring this character. Include: approximate age range, gender, build, skin tone, hair (color, length, style), clothing (specific items, colors, textures), and 1-2 distinguishing features (scars, glasses, tattoo, jewelry). Be PRECISE — this description must produce the SAME person across multiple AI image generations. Example: "Woman, early 30s, medium build, dark brown skin, black hair in tight bun, wearing a navy wool peacoat over a white collared shirt, small silver hoop earrings, round wire-frame glasses." Do NOT use vague terms like "attractive" or "professional-looking."'),
  role: z.string().describe('Brief role description, e.g. "the startup founder", "the archaeologist", "the mother"'),
});

const VisualPromptSchema = z.object({
  prompt: z.string().describe('Cinematic AI image/video generation prompt. CRITICAL: The primary subject MUST depict what the voiceover is saying at this moment — not just the mood. Start with the KEY NOUN or ACTION from the narration, then add lighting, composition, color grade, depth of field. Must be 9:16 vertical. 40-70 words. Do NOT describe character appearance here — just reference them by role (e.g. "the founder", "the detective"). Character descriptions will be injected automatically.'),
  camera_motion: z.string().describe('Camera movement for video generation: slow push-in, whip pan, tracking shot, dolly, aerial, slow zoom, Dutch angle, etc.'),
  duration_hint_seconds: z.number().describe('Approximate duration for this visual clip in seconds (3-8s)'),
  character_ids: z.array(z.string()).describe('Array of character IDs that appear in this visual. Empty array if no characters. Used to inject consistent character descriptions into the prompt.'),
});

const BeatSchema = z.object({
  beat_type: z.enum(['hook', 'context', 'escalation_1', 'escalation_2', 'climax', 'kicker', 'buffer']),
  voiceover: z.string().describe('The spoken narration for this beat. Conversational tone — write for the EAR, not the eye.'),
  visual_prompts: z.array(VisualPromptSchema).min(1).max(4).describe('1-4 visual prompts for AI image/video generation. More prompts = more visual cuts within the beat.'),
  text_overlay: z.string().describe('On-screen text overlay. Max 8 words. The key phrase that reinforces the voiceover. Empty string if none.'),
  sfx_cues: z.array(z.string()).describe('Sound effect cues for this beat. At least 1 per beat. Match the niche SFX palette.'),
  transition_out: z.enum(['hard_cut', 'whip_pan', 'zoom_through', 'match_cut', 'fade_to_black', 'glitch_flash', 'scale_shift', 'cross_dissolve']).describe('Visual transition to the next beat.'),
  music_event: z.string().describe('Music event at this beat if any: "dropout", "riser", "bass_drop", "texture_change", "sfx_bridge", or empty string for none.'),
});

const ProductionPackageSchema = z.object({
  title: z.string().describe('Video title — written for maximum curiosity. Under 60 characters.'),
  description: z.string().describe('YouTube/TikTok description with keywords. 1-2 sentences.'),
  hashtags: z.array(z.string()).min(5).max(10),
  visual_style: z.string().describe('1-2 sentence global aesthetic direction for ALL visuals in this video. Defines color grade, lighting mood, and consistency.'),
  character_references: z.array(CharacterReferenceSchema).describe('Recurring characters/people in the video. Define each character ONCE with precise physical details. These descriptions get injected into every visual prompt that features the character, ensuring visual consistency across all scenes. Empty array if no recurring characters (e.g. pure science/space/abstract topics).'),
  music: z.object({
    style: z.string().describe('Genre/mood descriptor for background music generation'),
    bpm_range: z.string().describe('Beats per minute range, e.g. "90-110"'),
    energy_curve: z.string().describe('How intensity changes through the video — describe the build, peaks, and dropouts'),
    key_moments: z.array(z.string()).describe('Timestamp + music event pairs, e.g. "35s: music cuts to silence for 1s before reveal"'),
  }),
  beats: z.array(BeatSchema).min(6).max(7),
  narration_full: z.string().describe('Complete narration text — ALL voiceover segments joined into one continuous script with [BEAT] markers for intentional pauses.'),
  total_word_count: z.number().describe('Total spoken words in the narration'),
  loop_note: z.string().describe('How the ending connects back to the beginning for replay loop. Empty string if no loop.'),
});

// ─── SYSTEM PROMPT BUILDER ──────────────────────────────────────────────────

function buildSystemPrompt(nicheKey, brandContextSection = null) {
  const nicheSection = buildNichePromptSection(nicheKey);
  const bp = getNicheBlueprint(nicheKey);
  const durationRange = bp ? `${bp.duration_sweet_spot[0]}-${bp.duration_sweet_spot[1]}` : '60-75';

  return `You are a viral short-form video PRODUCTION ENGINE. You write scripts that sound like someone grabbed the viewer at a party and said "dude, you HAVE to hear this." NOT Wikipedia. NOT a blog post. NOT a news article. SPEECH. Fragmented, emotional, punchy speech.

TARGET: ${durationRange} seconds, 180-195 words at ~2.5 words/sec. Vertical 9:16.

USE THE FULL DURATION. A script under 175 words is almost certainly missing a layer of story. The extra seconds are for DEPTH — not padding, not adjectives, not restating things already said. Depth means:
- One more story beat that adds a layer the viewer didn't expect (the folklore connection, the second piece of evidence, the human detail that makes the character real)
- A longer Context beat that grounds the viewer in a recognisable life before the tension starts
- A Climax that gives each revelation room to land with [BEAT] pauses instead of rushing through
- An Escalation beat that connects the specific story to a bigger pattern or older history

A 185-word script with one layer of depth will always outperform a 165-word script that's technically tight but feels thin.

═══ WRITING VOICE — THE #1 RULE ═══

Read every sentence aloud. If it sounds like a textbook, rewrite it until it sounds like SPEECH.

SENTENCE RULES (MANDATORY — violating these produces bad scripts):
- Every sentence UNDER 15 words. No exceptions.
- NO semicolons. Ever. Break into two sentences.
- NO "which" followed by a clause. Break into two sentences.
- If a sentence has a comma + "and" + more info — break it into two sentences.
- If a sentence has an em dash + a clause — consider breaking it.
- Fragmented sentences are GOOD: "Crimson waterfalls. Glowing plants. Blocks that broke the game's own physics."
- Each sentence should be its own micro-revelation.

BAD: "In Java 1.17 a rare world-gen glitch created the 'Crimson Cascade' — it shows up in only 0.003% of worlds, and as of early 2026 only about 150 players ever documented finding it."
GOOD: "In 2021, a player loaded a new world and found something impossible. Crimson waterfalls. Glowing plants that don't exist in the game's code. They posted screenshots. Almost nobody believed them."

═══ BEAT STRUCTURE (FICHTEAN CURVE) ═══

HOOK (0-5s):
Must contain a CONTRADICTION or PARADOX — two things that shouldn't both be true, but are. NOT a label or statement.
BAD: "A biome that shouldn't exist." (statement — viewer says "huh, interesting" and keeps scrolling)
GOOD: "Only 150 players have ever seen this biome. And it's gone forever." (contradiction + urgency + scarcity)
BAD: "Your paycheck lost 10% — and no one told you why." (vague conspiracy)
GOOD: "You got a raise this year. And you're making less money. Here's the math." (paradox + concrete promise)
Rules: 1-3 sentences. Under 25 words total. Must work without audio. Most arresting visual in the whole video.

CONTEXT (5-12s):
CRITICAL: This beat DEEPENS the mystery. It does NOT explain or answer the hook.
Your context beat should answer "why should I care?" WITHOUT answering "what is it?"
BAD: "The Sodder family home burned on Christmas Eve, 1945. Five kids were unaccounted for; no bodies, only questions." (restates the hook — dead air at the worst possible moment)
GOOD: "The fire was fast. By the time anyone arrived, the house was gone. But a fire that hot should have left bones. Teeth. Something. There was nothing." (deepens the mystery with a NEW fact)
Rules: 1-2 sentences max. Introduce TENSION, not explanation.

ESCALATION 1 (12-22s):
First major tension ramp. Use an escalation connector. Each new piece of info must feel BIGGER than the last.
Visual pace increases — cuts every 2-3 seconds.

ESCALATION 2 (22-40s):
The meat. Deepest information density. Stack 2-3 revelations with increasing stakes.
Use contrast: "Everyone thinks X. But actually Y."
Micro-cliffhangers between sub-points. Never hold one visual for more than 4 seconds.

CLIMAX (35-50s):
The open loop CLOSES here. This is where the Fichtean Curve PEAKS.
MANDATORY: At least 3 SEPARATE sentences. Each sentence = one revelation. Separate with [BEAT] pauses.
BAD: "Mojang officially admitted the glitch in February 2026, which cemented those documented finds as the only canonical Crimson Cascades and made the biome the rarest in the world."
GOOD: "Then February 2026 — Mojang confirmed it. [BEAT] The glitch was real. It would never come back. [BEAT] And those 150 worlds? Now officially the rarest biome in Minecraft history."
The final word of the climax should feel like a mic drop.

KICKER (50-65s):
NEVER break the fourth wall. NO "comment X", "save this clip", "replay the start", "pause here".
The last line must be the most QUOTABLE line in the entire video. If it sounds like a YouTube end-screen instruction, rewrite it.
Stay INSIDE the narrative voice. Create a feeling (urgency, determination, curiosity) that makes the viewer want to rewatch — without being TOLD to.
BAD: "Want a script to ask your boss for a COLA? Comment 'COLA'."
GOOD: "So the question isn't whether you got a raise. It's whether your raise got YOU."
If possible, loop the final line back to the opening for seamless rewatch.
Do NOT start with "Turns out" every time — vary kicker openers.

BUFFER (65-75s) — OPTIONAL:
Only include if the script genuinely needs breathing room. If your buffer is a general summary statement ("It remains one of America's most haunting disappearances"), DELETE IT. The video should end on the KICKER, not a footnote. If the script feels incomplete without the buffer, your kicker isn't strong enough — fix the kicker.

═══ CONNECTIVE TISSUE — THE ART OF TRANSITIONS ═══

The connector between beats is where AMATEUR scripts reveal themselves. A templated connector ("But here's where it gets interesting...") signals to the viewer that they're watching a formula, not hearing a story.

THE RULE: Write connectors that feel like the NEXT THING A FASCINATED PERSON WOULD SAY. Not a signpost. Not a formula. The natural next breath.

How to write a great connector:
1. It should be SPECIFIC to the content. "Then the second photo loaded" is better than "But here's the thing—" because it belongs to THIS story and no other.
2. It should carry INFORMATION, not just signal a transition. "The timeline didn't match" advances the story. "Now pay attention to this part" is an empty instruction.
3. It should match the NICHE TONE. A horror connector whispers. A finance connector calculates. A science connector marvels.
4. It should NEVER be the same phrase twice in one script. If you catch yourself reaching for the same connector pattern, the content isn't escalating enough — fix the content, not the connector.

REFERENCE CONNECTORS (use as inspiration, not a menu — the best scripts create their own):

Escalation-type (between Beats 2→3 and 3→4):
${ESCALATION_CONNECTORS.slice(0, 15).map(c => `  - "${c}"`).join('\n')}
  ...and dozens more. CREATE YOUR OWN that fit this specific story.

Reframe-type (at the Climax):
${REFRAME_CONNECTORS.map(c => `  - "${c}"`).join('\n')}

HARD RULES:
- At least 3 connectors per script, ALL DIFFERENT from each other
- NEVER use "But here's where it gets interesting" — it's the most overused connector in short-form video
- NEVER use "And that's not even the weird/strangest part" — same problem
- NEVER use "Now pay attention to this part" — it's an instruction, not storytelling
- NEVER use "Turns out..." to open the kicker — it sounds like every AI-generated script
- NEVER use "What nobody expected was..." — it tells the viewer what to feel instead of making them feel it
- If a connector could work in ANY script about ANY topic, it's too generic. Rewrite it to be specific to THIS story.

═══ BANNED PHRASES — NEVER USE ═══
${BANNED_PHRASES.map(p => `  - "${p}"`).join('\n')}

ALSO BANNED — these are NOT in the list above but are equally forbidden:
- Starting the kicker with "Turns out..." (overused, sounds AI-generated)
- "It remains one of..." (generic summary — Wikipedia energy)
- Any direct CTA: "comment", "save", "like", "subscribe", "follow", "pause here", "replay"
- Jargon without lived-experience translation: "spending power", "nominal raises", "fat oxidation" (say what it DOES to the viewer)
- "Folks" in horror/serious niches (too folksy — use "people" or name nobody)
- "One-of-a-kind specimen" or any clinical/academic phrasing in a conversational script
- Two connector phrases in the same beat (e.g., "But here's the thing..." AND "And that's not even..." in one breath — pick ONE, make it count)

═══ NICHE-SPECIFIC BLUEPRINT ═══
${nicheSection}
${brandContextSection ? `\n${brandContextSection}\n\n${BRAND_WRITING_PRINCIPLES}\n` : ''}
═══ VISUAL PROMPT RULES ═══

THE #1 RULE FOR VISUALS: The image must DEPICT what the voiceover is SAYING at that exact moment. Not the mood. Not the vibe. The CONTENT.

If the voiceover says "bones arranged in patterns on the floor" — the visual MUST show bones arranged in patterns on the floor. Not a "moody crypt interior." Not "atmospheric darkness." The actual bones. On the actual floor. In patterns.

If the voiceover says "your body keeps burning fat at your desk" — the visual MUST show a person at a desk with some visual representation of fat burning. Not a generic gym shot. Not an abstract energy visualization with no context.

If the voiceover says "the algorithm hit 80 percent accuracy" — the visual MUST show a graph or data display hitting 80%. Not a "moody researcher in a lab."

THIS IS THE MOST COMMON FAILURE: Pretty, atmospheric, cinematic visuals that have NOTHING TO DO with what's being said. The viewer is HEARING one thing and SEEING something unrelated. This destroys comprehension and retention.

VISUAL-TO-NARRATION MATCHING PROCESS:
1. Read the voiceover line for this beat
2. Identify the KEY NOUN or ACTION in that line (bones on floor, algorithm scoring, fire burning, person disappearing)
3. That noun/action MUST be the PRIMARY SUBJECT of the visual prompt
4. THEN add cinematic quality around it (lighting, composition, color grade, camera movement)

WRONG ORDER: "Cinematic dark crypt corridor with blue lighting and film grain" → WHERE ARE THE BONES THE VOICEOVER IS TALKING ABOUT?
RIGHT ORDER: "Human bones arranged in geometric circular patterns on a cold stone crypt floor, lit by a single flashlight beam, deep shadows, blue-grey color grade, film grain, 9:16 vertical"

NICHE-SPECIFIC VISUAL INTENSITY:
- HORROR: Visuals must be UNSETTLING, not just dark. Show the wrong detail — the shape that shouldn't be there, the object out of place, the shadow with no source. Each escalation visual should be MORE disturbing than the last. If the viewer isn't slightly uncomfortable, the visual is too safe.
- FINANCE: Visuals must show SPECIFIC numbers, charts, money, transactions — not just "moody office." When the script says "$47,000" the image should feature that scale of money or a display showing that figure concept.
- SCIENCE: Visuals must show the ACTUAL phenomenon — the cell dividing, the creature moving, the chemical reaction. Not a "scientist in a lab looking at something off-screen."
- MOTIVATION: Visuals must show the SPECIFIC struggle or triumph described — not generic sunrise silhouettes. If the script says "deleted every app off my phone," show a phone with apps being removed.
- HISTORY: Visuals must depict the SPECIFIC moment described — the person, the place, the object. Not a generic "old building" when the script is talking about a specific letter being written.
- TRUE CRIME: Visuals must show the EVIDENCE being discussed — the document, the location, the timeline. Not atmospheric noir for its own sake.
- GAMING: Visuals must show the ACTUAL game element being discussed — the specific biome, the glitch, the hidden room. Not generic gaming aesthetics.
- SPORTS: Visuals must show the SPECIFIC moment — the catch, the injury, the scoreboard. Not generic "athlete in spotlight."
- FOOD: Visuals must show the ACTUAL cooking step or ingredient being described — the garlic hitting oil, the cheese pulling, the technique being demonstrated.
- TRAVEL: Visuals must show the SPECIFIC place or experience described — that particular beach, that market, that hidden restaurant entrance.

ADDITIONAL VISUAL RULES:
1. ALWAYS 9:16 vertical portrait
2. ALL visuals share the global visual style — consistent color grade across the whole video
3. NO text rendered in image prompts — text overlays are handled separately
4. Cinematic quality: Specify lighting, depth of field, color temperature AFTER establishing the subject
5. Avoid identifiable human faces — use silhouettes, over-shoulder, hands, close-ups of objects
6. Include camera movement (slow zoom, pan, tracking, dolly, aerial) — static shots feel dead
7. Each prompt: 40-70 words — front-load the SUBJECT, then add cinematic direction
8. Hook visual = most arresting image. Climax visual = second most arresting.
9. When the beat has multiple visual prompts, each one should illustrate a DIFFERENT part of the voiceover — not the same concept from different angles
10. NEVER write character physical descriptions inside visual prompts. Reference characters by ROLE ONLY ("the driver," "the older child," "the founder") and tag their character_ids. Character descriptions are injected automatically by the system. If you describe a character's appearance in the visual prompt AND tag their character_id, the description will appear TWICE in the final prompt — bloating it past what image generation models can handle. Keep visual prompts CLEAN: what the character is DOING, where they are, how the scene is lit. NOT what they look like.

═══ CHARACTER CONSISTENCY ═══

If your script features ANY recurring person (a founder, a detective, a parent, a hiker, an archaeologist, a victim), you MUST define them in character_references.

WHY: AI image generation creates a NEW person for every prompt. Without a locked character description, "the founder" in Beat 2 will be a different age, race, gender, and outfit than "the founder" in Beat 5. This destroys immersion.

HOW IT WORKS:
1. Define each character ONCE in character_references with PRECISE physical details
2. In visual prompts, reference characters by their role ONLY ("the driver recoils in his seat", "the older boy stands at the window") — do NOT write their appearance. No age, no clothing, no hair, no skin tone in the visual prompt. JUST what they are DOING and WHERE.
3. Tag the character's id in the character_ids array for that visual prompt
4. The system will automatically inject the character description into every visual prompt that tags that character
5. If you write character appearance in the prompt AND tag the character_id, the description appears TWICE — this bloats the prompt past what image models can handle and MUST be avoided

CORRECT visual prompt with character:
  prompt: "The driver recoiling in his car seat, face half-lit by amber streetlight, one hand frozen near the door lock, deep shadows, film grain, 9:16 vertical"
  character_ids: ["bethel"]

WRONG visual prompt with character (DO NOT DO THIS):
  prompt: "[Brian Bethel: Man, late 20s, light skin, stubble, brown hair, olive flannel, glasses] — The driver recoiling in his car seat, face half-lit by amber streetlight..."
  character_ids: ["bethel"]
  // The description is written in the prompt AND tagged — it will appear TWICE after injection

CHARACTER DESCRIPTION RULES:
- Age range (not exact): "early 30s", "mid 50s"
- Gender and build: "tall, lean man", "medium-build woman"
- Skin tone: Be specific — "warm brown", "pale with freckles", "deep dark brown", "olive-toned"
- Hair: Color, length, style — "black hair cropped close", "auburn shoulder-length waves pulled back in a ponytail"
- Clothing: Specific items with colors — "navy wool peacoat over white collared shirt" NOT "professional attire"
- 1-2 distinguishing features: "round wire-frame glasses", "small scar above left eyebrow", "silver watch on left wrist"
- NEVER use vague terms: "attractive", "professional-looking", "ordinary" — these produce different results every generation

WHEN TO USE CHARACTERS vs NOT:
- Business, true crime, horror, history, sports, motivation, relationships, parenting → Almost always have characters
- Science, space, animals, AI/tech → Often NO characters (pure phenomena). Use empty array.
- If a person appears in only ONE visual prompt, they DON'T need a character reference

SILHOUETTES AND PARTIAL VIEWS:
Even when showing characters from behind, in silhouette, or hands-only, the character reference ensures consistent skin tone, clothing, and build. Tag the character_id so the description is injected.

═══ AUDIO RULES ═══

VOICEOVER PACING:
  - Hook: Punchy, high energy
  - Context: Normal conversational
  - Escalation: Gradually accelerating
  - Climax: Slowest (for weight) OR fastest (for shock) — specify which
  - Kicker: Deliberate, measured, final

[BEAT] PAUSE PLACEMENT (critical for rhythm):
  - After the hook (let it land)
  - Before a reveal: "The answer is... [BEAT] ..."
  - After a shocking statement
  - Between climax revelations (at least 2 [BEAT] pauses in climax)
  - Before the final kicker line

MUSIC: Felt, not heard over voiceover. Energy matches Fichtean Curve.
Most powerful moment is SILENCE — 0.5-1s dropout before the main reveal.

SFX MANDATORY:
  - Hook: Impact sound, whoosh, or riser
  - Escalation transitions: Whoosh, boom, or riser between points
  - Reveal moments: Hit/impact, bass drop
  - Ending: Final impact, reverb tail, or fade-to-silence

═══ TRANSITIONS ═══
${VISUAL_TRANSITIONS.map(t => `  ${t.id}: ${t.desc}`).join('\n')}
Never use the same transition twice in a row.

═══ CRAFT RULES — WHAT SEPARATES GOOD FROM GREAT ═══

These patterns appeared in every high-performing script we've tested:

1. THE RECONTEXTUALIZATION LOOP
The best kickers don't just repeat the hook — they UPGRADE it. On rewatch, the hook should mean something different than it did the first time.
EXAMPLE: Hook says "They sealed this crypt in 1862." Kicker reveals "Not after they failed. After they worked." Now on rewatch, "sealed" means something completely different. The viewer MUST rewatch to experience the upgrade.

2. SPECIFICITY OVER ADJECTIVES
"Terrifying" tells me nothing. "Too thin. Too tall. Standing at the end of streets where nobody should be." — that's terror through DETAIL. Every niche benefits from this:
- Horror: Describe the wrong detail, not the emotion
- Finance: Give the exact number, not "a lot"
- Science: Give the comparison, not "really big"
- History: Name the person's age and what they were doing, not "a brave soldier"

3. THE SENTENCE-AS-REVELATION PATTERN
In the climax especially, each sentence should feel like its own mini-punch:
"The glitch was real. [BEAT] It would never come back. [BEAT] And those 150 worlds? Now officially the rarest biome in Minecraft history."
Three sentences. Three revelations. Each one escalates. The final word carries the weight of everything before it.

4. SILENCE AS A WEAPON
The moment before the climax reveal should have a music dropout. But the SCRIPT should mirror this — a short sentence or a [BEAT] pause before the biggest reveal creates anticipation. Don't just drop the music; drop the pace too.

5. THE COLD OPEN
Never warm up. The first word of the script should feel like you interrupted someone mid-thought. "Christmas Eve, 1945." Not "Let me tell you about Christmas Eve, 1945." Start mid-story. The viewer catches up.

6. EARNED CONNECTORS
The best connectors in our tests weren't from any list. They were sentences that naturally bridged beats because the CONTENT demanded it:
- "Then the phone calls started." (horror — the content IS the connector)
- "Your body already knows this." (fitness — specific to the topic)
- "The letter was dated three days earlier." (history — advances the story)
Write connectors like these. Content-first, transition second.

7. RICHNESS IS NOT FILLER
Concision means no WASTED words. It does NOT mean fewest possible words. A script that's technically tight but feels thin is worse than a script that takes an extra 10 seconds to ground you in a scene.

The difference between filler and richness:

FILLER (cut these): "So basically what happened was..." / "It's important to note that..." / "Interestingly enough..." / repeating something already said / adjectives that don't add information ("very," "really," "incredibly")

RICHNESS (keep these): Sensory details that put the viewer IN the scene ("A kitchen table, a laptop, and a wholesale deal from Guangzhou") / The human moment before the crisis that makes the viewer identify with the character / The second piece of evidence that transforms a claim into a pattern / The folklore connection that makes a modern story feel ancient / The specific number that makes a vague threat concrete / The [BEAT] pause that lets a revelation land instead of rushing past it

A 185-word script with a grounded character, a sensory incident, and a layered climax will ALWAYS outperform a 160-word script that's efficient but emotionally thin. When in doubt, add a layer of story — don't trim to the bone.

PRACTICAL GUIDE — WHERE TO SPEND EXTRA WORDS:
- Context beat: 2-3 sentences grounding the viewer in a recognisable life BEFORE the tension starts. This is where most "too thin" scripts are cutting corners.
- Escalation 2: The longest beat. Spend words here on the second or third piece of evidence that transforms a single event into a pattern.
- Climax: Give each revelation its own sentence AND a [BEAT] pause. Don't compress three revelations into one sentence to save words.
- Sensory details anywhere: "The handle cracked clean off. Hot coffee. Second-degree burns." — those extra fragments are what make the viewer FEEL instead of just understand.

═══ QUALITY CHECKLIST (you must pass ALL of these) ═══

BEFORE writing: What is the CONTRADICTION? What is the most SURPRISING fact? (That's the climax, not the hook.)
WHILE writing:
  - Every sentence under 15 words
  - No semicolons, no "which" clauses
  - Context DEEPENS the mystery — does NOT explain or restate the hook
  - Context or early Escalation grounds the viewer in a RECOGNISABLE LIFE before the tension starts (specific fragments, not narration)
  - At least 3 different connectors — ALL original or niche-flavored, NONE from the "overused" list
  - No two connectors in the same beat
  - Climax has 3+ separate sentences with [BEAT] pauses — give each revelation ROOM
  - Last line is quotable — would someone put it in their Instagram story?
  - No CTAs, no fourth-wall breaks in the kicker
  - Kicker does NOT start with "Turns out..."
  - No sentence that could appear in ANY script about ANY topic (if it's generic, rewrite it to be specific to THIS story)
  - Buffer deleted unless absolutely essential (it almost never is)
RICHNESS CHECK (just as important as cutting):
  - Is the script UNDER 170 words? If yes, it is almost certainly too thin. Add a layer — a grounding detail, a sensory moment, a second piece of evidence, a [BEAT] pause, a folklore/history connection. Do NOT pad with adjectives or restatements. Add STORY.
  - Does the viewer know the character/person enough to CARE before the crisis hits? If not, the Context or Escalation 1 needs grounding details.
  - Does the Climax rush through its revelations? Each one should have its own sentence and breathing room.
  - Are there any moments where you TELL the viewer something is scary/important/surprising instead of SHOWING them through specific detail? Replace the label with the detail.
CUT CHECK (applied AFTER richness check):
  - Does any sentence restate something already said? Cut it.
  - Does any sentence use filler words ("basically," "actually," "really," "very," "incredibly")? Cut the filler word, not the sentence.
  - Does any sentence exist only to transition between beats without carrying information? Replace it with a content-driven connector.
  - Is the buffer a generic summary? Delete it.
AFTER writing: Read it aloud. If you stumble, rewrite that sentence. If it sounds like a blog post, rewrite all of it. If it sounds thin or rushed, add a layer of story. If connectors feel like signposts, replace them with content-driven transitions.`;
}

// ─── MAIN GENERATION FUNCTION ───────────────────────────────────────────────

/**
 * Generate a complete production package for a short-form video.
 *
 * @param {object} params
 * @param {string} params.niche - Niche key (e.g., 'ai_tech_news')
 * @param {string} params.topic - Topic or subject for the video
 * @param {object} params.keys - { openaiKey }
 * @param {string} [params.brandUsername] - For cost logging
 * @param {string} [params.storyContext] - Optional real story context from research
 * @param {boolean} [params.creativeMode] - More experimental/creative output
 * @returns {Promise<object>} The production package
 */
export async function generateProductionPackage({
  niche,
  topic,
  keys,
  brandUsername,
  storyContext,
  creativeMode = false,
  // Brand mode parameters
  brandProfile = null,
  contentAngle = null,
}) {
  if (!niche) throw new Error('Niche required');
  if (!topic) throw new Error('Topic required');

  // Resolve Anthropic API key — check env vars
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY env var required for script generation');

  const blueprint = getNicheBlueprint(niche);
  if (!blueprint) throw new Error(`Unknown niche: ${niche}`);

  const client = new Anthropic({ apiKey: anthropicKey });

  // Build brand context section if in brand mode
  let brandContextSection = null;
  if (brandProfile && contentAngle) {
    const driverKey = contentAngle.emotional_driver;
    brandContextSection = buildBrandContextSection(brandProfile, contentAngle, driverKey);

    // Use story_context from the topic if not provided
    if (!storyContext && contentAngle.story_context) {
      storyContext = contentAngle.story_context;
    }
  }

  const systemPrompt = buildSystemPrompt(niche, brandContextSection);
  const userPrompt = buildUserPrompt({ topic, storyContext, creativeMode, blueprint, brandProfile, contentAngle });

  // Convert Zod schema to JSON Schema for Claude tool_use
  const jsonSchema = zodToJsonSchema(ProductionPackageSchema, { target: 'openApi3' });
  // Remove the wrapper — zodToJsonSchema wraps in { type: 'object', properties: { production_package: ... } }
  const toolInputSchema = jsonSchema.definitions?.production_package || jsonSchema;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
    tools: [{
      name: 'production_package',
      description: 'Output the complete production package with beats, visual prompts, SFX cues, and music direction.',
      input_schema: toolInputSchema,
    }],
    tool_choice: { type: 'tool', name: 'production_package' },
  });

  // Extract the tool use result
  const toolUseBlock = response.content.find(b => b.type === 'tool_use');
  if (!toolUseBlock) throw new Error('Claude did not return a production package');
  const result = toolUseBlock.input;

  if (response.usage && brandUsername) {
    logCost({
      username: brandUsername,
      category: 'anthropic',
      operation: 'shorts_production_package',
      model: 'claude-opus-4-6',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });
  }

  // Post-process: add beat timing estimates and inject character descriptions into visual prompts
  const characterMap = {};
  if (result.character_references && result.character_references.length > 0) {
    for (const char of result.character_references) {
      characterMap[char.id] = char;
    }
  }

  const processedBeats = result.beats.map((beat, i) => {
    const wordCount = beat.voiceover.split(/\s+/).filter(Boolean).length;
    const estimatedDuration = Math.round(wordCount / 2.5);

    // Inject character descriptions into visual prompts
    const processedVisuals = beat.visual_prompts.map(vp => {
      let enrichedPrompt = vp.prompt;
      const charIds = vp.character_ids || [];

      if (charIds.length > 0) {
        const charDescriptions = charIds
          .map(id => characterMap[id])
          .filter(Boolean)
          .map(char => `[${char.role}: ${char.description}]`)
          .join(' ');

        if (charDescriptions) {
          // Prepend character descriptions to the visual prompt
          enrichedPrompt = `${charDescriptions} — ${vp.prompt}`;
        }
      }

      return {
        ...vp,
        prompt_original: vp.prompt,
        prompt: enrichedPrompt,
      };
    });

    return {
      ...beat,
      visual_prompts: processedVisuals,
      word_count: wordCount,
      estimated_duration_seconds: estimatedDuration,
      beat_index: i,
    };
  });

  // Post-generation validation for brand mode
  let brandViolations = [];
  if (brandProfile) {
    brandViolations = validateBrandContent(result.narration_full, brandProfile.brand_name);
    if (brandViolations.length > 0) {
      console.warn(`[production-engine] Brand validation: ${brandViolations.length} violation(s) found`);
      brandViolations.forEach(v => console.warn(`  [${v.severity}] ${v.message}`));
    }
  }

  return {
    ...result,
    beats: processedBeats,
    character_references: result.character_references || [],
    niche,
    niche_name: blueprint.name,
    visual_style_global: blueprint.visual_style,
    // Brand mode metadata
    ...(brandProfile ? {
      brand_mode: true,
      brand_profile_id: brandProfile.id,
      content_angle: contentAngle ? {
        id: contentAngle.id,
        name: contentAngle.name,
        emotional_driver: contentAngle.emotional_driver,
      } : null,
      brand_violations: brandViolations,
    } : {}),
  };
}

// ─── USER PROMPT BUILDER ────────────────────────────────────────────────────

function buildUserPrompt({ topic, storyContext, creativeMode, blueprint, brandProfile, contentAngle }) {
  let prompt;

  if (brandProfile && contentAngle) {
    prompt = `Generate a complete production package for brand editorial content.

BRAND CHANNEL DOMAIN: ${brandProfile.brand_domain}
CONTENT ANGLE: ${contentAngle.name} (${contentAngle.emotional_driver})
TOPIC: ${topic}

Remember: The brand "${brandProfile.brand_name}" is NEVER mentioned in the content.
The viewer should learn something genuinely useful and feel "${contentAngle.endpoint || brandProfile.emotional_endpoint}" by the end.`;
  } else {
    prompt = `Generate a complete production package for a ${blueprint.name} short-form video.

TOPIC: ${topic}`;
  }

  if (storyContext) {
    prompt += `\n\nSTORY CONTEXT (use this real-world information as the foundation — don't invent facts when you have real ones):
${storyContext}`;
  }

  if (creativeMode) {
    prompt += `\n\nCREATIVE MODE: Push boundaries. Use unexpected angles, surprising hooks, unconventional structure within the Fichtean Curve. Take risks with the tone and visual direction.`;
  }

  prompt += `

REQUIREMENTS:
- Follow the Fichtean Curve beat structure exactly (6-7 beats)
- If ANY person/character appears in more than one visual, define them in character_references with PRECISE physical details (age, build, skin tone, hair, clothing, distinguishing features) — this ensures they look the SAME across all scenes
- In visual prompts, reference characters by role ("the founder", "the detective") and tag their character_ids — do NOT re-describe appearance in the prompt
- Include 1-4 visual prompts per beat (more for longer beats like Escalation 2)
- Each visual prompt must be a detailed, cinematic, 9:16 image generation prompt
- Include SFX cues for EVERY beat
- Write ORIGINAL connectors that are SPECIFIC to this story — do NOT use generic phrases like "But here's where it gets interesting" or "And that's not even the weird part"
- The best connector sounds like the next thing a fascinated person would say about THIS topic
- NEVER use any banned phrases
- The hook must create an OPEN LOOP that the climax closes
- Engineer a replay LOOP if possible — the kicker should RECONTEXTUALIZE the hook so it means something different on rewatch
- Total narration: 180-195 words at ~2.5 words/sec. This is a FLOOR, not a ceiling. If your script is under 175 words, you are almost certainly missing a grounding moment, a sensory detail, or a layer of evidence. Add STORY — not adjectives, not restatements. A richer script outperforms a thinner one every time.
- Mark pauses with [BEAT] in the narration
- The kicker's last line should be the most memorable line in the entire script

Generate the complete production package now.`;

  return prompt;
}

// ─── BACKWARD-COMPAT WRAPPER ────────────────────────────────────────────────

/**
 * Convert production package to the old script format for backward compatibility.
 * Used by the existing preview-script endpoint.
 */
export function productionPackageToLegacyScript(pkg) {
  const scenes = [];
  for (const beat of pkg.beats) {
    // Each visual prompt becomes a "scene" in the old format
    for (let i = 0; i < beat.visual_prompts.length; i++) {
      const vp = beat.visual_prompts[i];
      scenes.push({
        role: beat.beat_type,
        narration_segment: i === 0 ? beat.voiceover : '', // Only first visual prompt gets the narration
        visual_prompt: vp.prompt, // This is the enriched prompt with character descriptions injected
        visual_prompt_original: vp.prompt_original || vp.prompt, // Original without character injection
        motion_prompt: vp.camera_motion,
        duration_seconds: vp.duration_hint_seconds,
        overlay_text: i === 0 ? beat.text_overlay : '',
        scene_label: `${beat.beat_type}${beat.visual_prompts.length > 1 ? `_${i + 1}` : ''}`,
        sfx_cues: i === 0 ? beat.sfx_cues : [],
        transition_out: beat.transition_out,
        music_event: i === 0 ? beat.music_event : '',
        character_ids: vp.character_ids || [],
      });
    }
  }

  return {
    title: pkg.title,
    description: pkg.description,
    hashtags: pkg.hashtags,
    narration_full: pkg.narration_full,
    scenes,
    character_references: pkg.character_references || [],
    music_mood: `${pkg.music.style}. BPM: ${pkg.music.bpm_range}. ${pkg.music.energy_curve}`,
    music: pkg.music,
    visual_style: pkg.visual_style,
    total_word_count: pkg.total_word_count,
    loop_note: pkg.loop_note,
    // Keep the full production package for the new Builder UI
    _production_package: pkg,
  };
}
