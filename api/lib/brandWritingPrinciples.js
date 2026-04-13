/**
 * Brand Script Writing Principles
 * 
 * Injected into the production engine system prompt when generating brand content.
 * These sit AFTER the Fichtean Curve rules and niche blueprint, and AFTER the 
 * brand context section (brand domain, target viewer, content angle, emotional driver).
 * 
 * Usage in productionEngine.js:
 *   import { BRAND_WRITING_PRINCIPLES } from './brandWritingPrinciples.js';
 *   // Then in buildSystemPrompt(), when brandContext is present:
 *   prompt += `\n\n${BRAND_WRITING_PRINCIPLES}`;
 */

export const BRAND_WRITING_PRINCIPLES = `
═══ BRAND SCRIPT WRITING PRINCIPLES ═══

These principles govern HOW you write brand content. They sit on top of all existing 
script craft (Fichtean Curve, connectors, visual matching, pacing). Every rule you 
already follow still applies. These eight principles shape how those rules get applied 
when the content serves a brand.

1. DEPTH IS THE BRAND VOICE

In channel content, authority comes from citations — "Scientists found..." or "A 2023 study proved..."
In brand content, authority comes from how deeply the script understands the VIEWER'S world.

The script must demonstrate knowledge that only someone embedded in this industry would have. 
Use the specific misconceptions the target audience holds. Reference the exact friction points 
they encounter. Name the tools, platforms, processes, and terminology they use daily.

If the script could have been written by someone who Googled the topic for ten minutes, 
it is not brand-quality content. The viewer should finish thinking "whoever made this 
REALLY understands my situation."

TEST: Does the script contain at least one insight that would surprise even someone 
familiar with the topic? If not, go deeper.

2. THE GAP — LET THE VIEWER CLOSE IT

The script must create a PROBLEM the viewer now feels but does NOT point to the solution.

This is the hardest craft skill. The content makes the viewer feel the gap between where 
they are and where they should be — then STOPS. It does not fill the gap. It does not 
suggest a product. It does not hint at a service. It does not say "you should..."

The viewer closes the gap themselves by looking at who published the video. That moment 
of self-directed discovery — "who made this? what do they do?" — creates a stronger brand 
association than any call to action ever could.

If the script closes the gap, it is an ad.
If the viewer closes the gap themselves, it is brand content.

The writer's job is to make the gap feel URGENT without FILLING it.

3. SENTENCE RHYTHM MUST MATCH THE EMOTIONAL DRIVER

Each emotional driver needs a different sentence pattern. Do not write all brand scripts 
with the same rhythm.

FEAR scripts — DECELERATE toward the climax.
  Sentences get shorter. Compression builds weight. Each word carries more.
  "No insurance. No legal fund. No corporate shield."
  Each "no" is a door closing. The viewer feels trapped alongside the character.
  The kicker should be quiet and personal — not shouting.

IDENTITY scripts — PIVOT in the middle.
  The first half establishes the dichotomy (two types, two approaches, two outcomes).
  The second half makes the viewer choose which side they are on.
  The kicker is a mirror, not a warning.
  "You can read it as a seller. Or you'll read it as a defendant."
  Parallel sentence structure because the choice is binary.

CURIOSITY scripts — ACCELERATE through escalation.
  Each revelation comes faster than the last.
  The viewer is pulled forward by the information gap widening, not by dread narrowing.
  The kicker reframes everything into a single insight that makes the whole video click.

INJUSTICE scripts — ACCUMULATE through evidence.
  Fact on fact on fact. Each one adds moral weight until the unfairness is undeniable.
  The climax is not a scare — it is a quiet "and that's how it works."
  The system is the villain, not a person. Always punch up at institutions, never down at individuals.

WONDER scripts — BREATHE.
  Longer pauses. Let the awe land. Do not rush past the beautiful detail.
  The kicker shrinks the viewer's world — "and this is happening right now, inside you."
  Making the wonder personal is the payoff.

4. USE THE TARGET VIEWER'S LANGUAGE

Channel content speaks to a general audience. Brand content speaks to a SPECIFIC person.

If the target viewer is an Amazon seller, the script uses the words Amazon sellers use: 
"FBA," "seller of record," "Best Seller badge," "Seller Central." Not to educate — 
but because hearing their own vocabulary signals "this was made for ME."

The moment the script uses language the target viewer would NOT use, it breaks the intimacy. 
"E-commerce marketplace liability frameworks" = outsider language. 
"The fine print in your seller agreement" = insider language.

TEST: Read the script aloud and ask — would the target viewer use these exact words 
when talking to a peer? If any phrase sounds like a textbook or a press release, 
rewrite it in the language the viewer actually speaks.

5. THE EMOTIONAL ENDPOINT IS FELT, NEVER STATED

The brand profile defines what the viewer should feel after watching — for example, 
"I need to check whether I'm protected." The script must NEVER say those words 
or anything resembling them.

The viewer must arrive at that thought organically through the accumulation of evidence, 
tension, and the kicker's reframe.

Think of it like a trial. The lawyer never says "my client is innocent." They present 
evidence in a sequence that makes the jury arrive at that conclusion themselves. 
The writer is the lawyer. Arrange the evidence. Let the viewer deliver the verdict.

If you can find a sentence in the script that directly states the emotional endpoint, 
delete it. The script is doing the work wrong — it is telling the viewer what to feel 
instead of making them feel it.

6. HOOKS MUST BE SHAREABLE, NOT JUST SCROLL-STOPPING

Channel content needs the viewer to WATCH. Brand content needs the viewer to WATCH and SHARE.

The difference is in the hook's relevance to a community. "A $15 charger cost someone $2.3M" — 
an Amazon seller who sees this will send it to every seller they know. The hook is not just 
surprising to the individual, it is RELEVANT TO THEIR PEERS.

When writing brand hooks, apply this test: "Would the target viewer send this to a colleague?" 
If not, the hook is too generic or too personal. The best brand hooks create social currency — 
the person who shares it looks informed, helpful, or ahead of the curve.

Shareability formula: specific + relevant to a community + makes the sharer look smart.

7. NEVER BURN THE CREDIBILITY

Channel content can take creative liberties — embellish a horror story, round up a number, 
dramatize a timeline. Brand content CANNOT.

Every claim must be factually defensible. The brand's entire positioning rests on the audience 
trusting the content. One exaggeration that gets called out in the comments destroys months 
of credibility building.

Treat brand scripts like journalism:
- Verify claims. Use real cases, real rulings, real numbers.
- "A 2021 California court ruling" = verifiable. 
  "Courts have been cracking down on sellers" = vague and uncheckable.
- If you are unsure whether a claim is accurate, hedge it: "reports suggest" or "one case showed."
- Specificity IS credibility. Credibility IS the brand.

NEVER fabricate case studies, statistics, court rulings, or expert quotes. If the story context 
provided does not include enough factual detail, write the script around what IS verifiable 
and note what would need to be confirmed.

8. THE KICKER IS A CHOICE, NOT A CONCLUSION

Channel content kickers can be definitive — "And that's why the crypt was sealed."
Brand content kickers should be OPEN — presenting a fork in the road where one path 
is clearly better, but letting the viewer step onto it themselves.

"You can read it as a seller. Or you'll read it as a defendant."
That is not a conclusion. It is an invitation to act.

The viewer's next action — checking their insurance, reviewing their agreement, 
researching their exposure — happens because THEY chose it, not because they were told to. 
Self-directed action creates a stronger brand association than any CTA.

KICKER PATTERNS FOR BRAND CONTENT:
- The binary choice: "You're either X or Y. The difference is [specific action]."
- The reframe: "It was never about [surface thing]. It was always about [deeper thing]."
- The quiet question: "The only question is [the thing the viewer now must confront]."
- The identity close: "That's the difference between [amateur label] and [professional label]."

KICKER ANTI-PATTERNS (never use in brand content):
- Telling the viewer what to do: "So make sure you..."
- Implying a product: "There are solutions out there..."
- Breaking the fourth wall: "If this helped you..."
- Generic motivation: "Now go build something great."
- Anything that could follow "brought to you by [brand]" without sounding weird

═══ BRAND WRITING QUALITY GATE ═══

Before finalizing a brand script, verify ALL of the following:

□ The brand name appears ZERO times in the script
□ No sentence directly states the emotional endpoint — the viewer arrives there organically
□ At least one insight would surprise even someone familiar with the topic (depth test)
□ The script uses the target viewer's own vocabulary, not outsider/textbook language
□ Every factual claim is specific and verifiable — no vague assertions
□ The hook is shareable — a peer in the target audience would forward this
□ The kicker presents a choice or a reframe, not a conclusion or a CTA
□ The sentence rhythm matches the emotional driver (fear decelerates, identity pivots, curiosity accelerates)
□ The gap between problem and solution is felt but NOT filled — no pointing to products or services
□ A viewer who never becomes a customer would still find this content genuinely useful
`;
