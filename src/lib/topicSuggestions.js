/**
 * Topic Suggestion Funnel — 3-level progressive narrowing per niche.
 *
 * Level 1: Broad category
 * Level 2: Specific angle
 * Level 3: Short hook/twist (2-4 words — compositional angle descriptors)
 *
 * All selected levels are concatenated and passed to the researcher/script writer.
 */

export const TOPIC_SUGGESTIONS = {
  ai_tech_news: {
    topics: [
      { label: 'AI Breakthroughs', sub: [
        { label: 'Reasoning & Intelligence', sub: ['beyond human level', 'caught cheating', 'real-world testing'] },
        { label: 'Creative AI', sub: ['fooling experts', 'original compositions', 'replacing artists'] },
        { label: 'Robotics', sub: ['learning emotions', 'warehouse takeover', 'humanoid progress'] },
        { label: 'Medical AI', sub: ['outperforming doctors', 'drug discovery', 'predicting illness'] },
      ]},
      { label: 'AI & Jobs', sub: [
        { label: 'White-collar disruption', sub: ['lawyers affected', 'coding obsolete', 'finance automation'] },
        { label: 'Creative industries', sub: ['Hollywood impact', 'music generation', 'photography dying'] },
        { label: 'New careers', sub: ['prompt engineering', 'AI training', 'human oversight'] },
      ]},
      { label: 'AI Ethics & Safety', sub: [
        { label: 'Deepfakes', sub: ['caught on camera', 'political impact', 'impossible to detect'] },
        { label: 'Surveillance', sub: ['facial recognition', 'predictive policing', 'mass tracking'] },
        { label: 'Existential Risk', sub: ['researchers warning', 'alignment problem', 'containment failure'] },
      ]},
      { label: 'Tech Giants', sub: [
        { label: 'OpenAI', sub: ['internal drama', 'secret projects', 'power struggle'] },
        { label: 'Google', sub: ['falling behind', 'search dying', 'Gemini controversy'] },
        { label: 'Apple & Meta', sub: ['secret labs', 'pivot strategy', 'hardware play'] },
      ]},
      { label: 'Future Predictions', sub: [
        { label: 'Near-term', sub: ['by 2030', 'next 5 years', 'already happening'] },
        { label: 'AGI timeline', sub: ['how close', 'who wins', 'what happens after'] },
      ]},
    ],
  },

  finance_money: {
    topics: [
      { label: 'Wealth Building', sub: [
        { label: 'Investing', sub: ['beating the market', 'hidden strategies', 'common mistakes'] },
        { label: 'Saving', sub: ['painless methods', 'automation tricks', 'hidden expenses'] },
        { label: 'Real Estate', sub: ['house hacking', 'rent vs buy', 'passive income'] },
      ]},
      { label: 'Money Myths', sub: [
        { label: 'Debt myths', sub: ['good vs bad', 'credit score trap', 'minimum payment scam'] },
        { label: 'Spending myths', sub: ['latte factor wrong', 'frugality limits', 'budget failures'] },
        { label: 'Wealth myths', sub: ['self-made myth', 'luck factor', 'rich mindset'] },
      ]},
      { label: 'Crypto', sub: [
        { label: 'Bitcoin', sub: ['halving impact', 'government fear', 'lost fortunes'] },
        { label: 'Altcoins', sub: ['next cycle', 'meme coins', 'DeFi explained'] },
      ]},
      { label: 'Side Hustles', sub: [
        { label: 'Digital', sub: ['no-code SaaS', 'digital products', 'newsletter model'] },
        { label: 'Physical', sub: ['vending machines', 'service businesses', 'auction flipping'] },
      ]},
      { label: 'Tax & System', sub: [
        { label: 'Tax strategies', sub: ['legal avoidance', 'LLC benefits', 'missed deductions'] },
        { label: 'Banking', sub: ['hidden profits', 'fractional reserve', 'inflation erosion'] },
      ]},
    ],
  },

  scary_horror: {
    topics: [
      { label: 'Haunted Places', sub: [
        { label: 'Abandoned buildings', sub: ['documented evidence', 'still active', 'sealed forever'] },
        { label: 'Ghost ships', sub: ['crew vanished', 'still sailing', 'recovered logs'] },
        { label: 'Cursed locations', sub: ['pattern of deaths', 'locals avoid', 'caught on camera'] },
      ]},
      { label: 'Unexplained Events', sub: [
        { label: 'Mass disappearances', sub: ['without trace', 'overnight vanishing', 'official cover-up'] },
        { label: 'Time anomalies', sub: ['documented cases', 'witness accounts', 'scientific study'] },
        { label: 'Strange signals', sub: ['still unexplained', 'repeated pattern', 'recently decoded'] },
      ]},
      { label: 'Cryptids & Creatures', sub: [
        { label: 'Documented sightings', sub: ['caught on film', 'multiple witnesses', 'scientific analysis'] },
        { label: 'Deep sea', sub: ['uncharted depths', 'new species found', 'sonar anomalies'] },
      ]},
      { label: 'True Scary Stories', sub: [
        { label: 'Home invasions', sub: ['hidden intruder', 'security footage', 'narrow escape'] },
        { label: 'Online horror', sub: ['dark web', 'interactive games', 'real identity'] },
        { label: 'Survival', sub: ['against the odds', 'days trapped', 'wrong turn'] },
      ]},
      { label: 'Paranormal', sub: [
        { label: 'Possessions', sub: ['caught on camera', 'expert testimony', 'medical mystery'] },
        { label: 'EVP & Evidence', sub: ['audio recordings', 'photo analysis', 'thermal imaging'] },
      ]},
    ],
  },

  motivation_self_help: {
    topics: [
      { label: 'Mindset Shifts', sub: [
        { label: 'Discipline & Habits', sub: ['simple rules', 'streak building', 'identity change'] },
        { label: 'Fear & Comfort Zone', sub: ['immediate action', 'gradual exposure', 'reframing fear'] },
        { label: 'Failure & Growth', sub: ['famous failures', 'data not defeat', 'pivot moments'] },
      ]},
      { label: 'Success Stories', sub: [
        { label: 'Against all odds', sub: ['from nothing', 'disability to triumph', 'repeated rejection'] },
        { label: 'Late bloomers', sub: ['started late', 'career pivot', 'second chance'] },
        { label: 'Comebacks', sub: ['rock bottom', 'public redemption', 'rebuilt everything'] },
      ]},
      { label: 'Mental Health', sub: [
        { label: 'Anxiety', sub: ['quick techniques', 'daily triggers', 'grounding methods'] },
        { label: 'Confidence', sub: ['body language', 'inner dialogue', 'social skills'] },
      ]},
      { label: 'Productivity', sub: [
        { label: 'Time management', sub: ['simple frameworks', 'priority systems', 'energy management'] },
        { label: 'Deep focus', sub: ['distraction-free', 'flow state', 'digital minimalism'] },
      ]},
    ],
  },

  history_did_you_know: {
    topics: [
      { label: 'Ancient Civilizations', sub: [
        { label: 'Lost civilizations', sub: ['recently discovered', 'still unexplained', 'older than thought'] },
        { label: 'Ancient technology', sub: ['ahead of time', 'reverse engineered', 'lost knowledge'] },
      ]},
      { label: 'Wars & Conflicts', sub: [
        { label: 'Untold stories', sub: ['classified until now', 'hidden heroes', 'double agents'] },
        { label: 'Turning points', sub: ['single decision', 'lucky break', 'almost lost'] },
      ]},
      { label: 'Royal & Political', sub: [
        { label: 'Royal scandals', sub: ['covered up', 'identity questioned', 'power struggles'] },
        { label: 'Cover-ups', sub: ['recently revealed', 'declassified files', 'suppressed truth'] },
      ]},
      { label: 'Inventions', sub: [
        { label: 'Stolen ideas', sub: ['wrong credit', 'patent wars', 'buried inventions'] },
        { label: 'Accidents', sub: ['billion-dollar mistake', 'lab accident', 'happy accident'] },
      ]},
      { label: 'Bizarre History', sub: [
        { label: 'Strange events', sub: ['mass hysteria', 'natural anomaly', 'still debated'] },
        { label: 'Weird customs', sub: ['unbelievable laws', 'animal trials', 'beauty extremes'] },
      ]},
    ],
  },

  true_crime: {
    topics: [
      { label: 'Unsolved Cases', sub: [
        { label: 'Missing persons', sub: ['without trace', 'new leads', 'decades later'] },
        { label: 'Cold cases', sub: ['DNA breakthrough', 'reopened case', 'fresh evidence'] },
      ]},
      { label: 'Serial Killers', sub: [
        { label: 'Caught', sub: ['fatal mistake', 'neighbor next door', 'technology caught'] },
        { label: 'Never caught', sub: ['still unknown', 'coded messages', 'prime suspect'] },
      ]},
      { label: 'Heists & Fraud', sub: [
        { label: 'Perfect crimes', sub: ['zero evidence', 'inside job', 'still missing'] },
        { label: 'Con artists', sub: ['false identity', 'elaborate scheme', 'years undetected'] },
      ]},
      { label: 'Wrongful Convictions', sub: [
        { label: 'Freed', sub: ['decades imprisoned', 'hidden evidence', 'DNA exoneration'] },
        { label: 'System failures', sub: ['corrupt officials', 'false testimony', 'manufactured case'] },
      ]},
      { label: 'Forensic Science', sub: [
        { label: 'DNA revolution', sub: ['genetic genealogy', 'tiny samples', 'ancestry databases'] },
        { label: 'New technology', sub: ['AI analysis', 'digital forensics', 'phone tracking'] },
      ]},
    ],
  },

  science_nature: {
    topics: [
      { label: 'Space', sub: [
        { label: 'Mind-bending concepts', sub: ['black holes', 'holographic theory', 'time dilation'] },
        { label: 'Discoveries', sub: ['exotic planets', 'water found', 'deep space signals'] },
      ]},
      { label: 'Human Body', sub: [
        { label: 'Brain', sub: ['common myths', 'daily tricks', 'memory techniques'] },
        { label: 'Biology', sub: ['aging science', 'new organs', 'gut-brain connection'] },
      ]},
      { label: 'Animals', sub: [
        { label: 'Superpowers', sub: ['immortal species', 'extreme survival', 'sensory abilities'] },
        { label: 'Intelligence', sub: ['tool usage', 'escape artists', 'communication systems'] },
      ]},
      { label: 'Earth', sub: [
        { label: 'Extreme places', sub: ['impossible life', 'sealed environments', 'deep underground'] },
        { label: 'Climate', sub: ['tipping points', 'ancient data', 'ocean systems'] },
      ]},
      { label: 'Physics', sub: [
        { label: 'Quantum', sub: ['entanglement', 'observer effect', 'tunneling explained'] },
        { label: 'Paradoxes', sub: ['time travel', 'faster than light', 'simulation theory'] },
      ]},
    ],
  },

  relationships_dating: {
    topics: [
      { label: 'Psychology', sub: [
        { label: 'Attachment styles', sub: ['self-diagnosis', 'toxic patterns', 'becoming secure'] },
        { label: 'Attraction', sub: ['chemical basis', 'wrong choices', 'mere exposure'] },
      ]},
      { label: 'Modern Dating', sub: [
        { label: 'Apps', sub: ['broken by design', 'choice overload', 'algorithm bias'] },
        { label: 'Red flags', sub: ['commonly missed', 'love bombing', 'hidden manipulation'] },
      ]},
      { label: 'Long-term', sub: [
        { label: 'Communication', sub: ['conflict styles', 'repair attempts', 'emotional bids'] },
        { label: 'Keeping spark', sub: ['novelty seeking', 'love languages', 'daily rituals'] },
      ]},
      { label: 'Breakups', sub: [
        { label: 'Moving on', sub: ['no-contact rule', 'healing timeline', 'rebound trap'] },
        { label: 'Growth', sub: ['self-discovery', 'solo strength', 'better standards'] },
      ]},
    ],
  },

  health_fitness: {
    topics: [
      { label: 'Exercise', sub: [
        { label: 'Myths debunked', sub: ['stretching wrong', 'cardio overrated', 'spot reduction'] },
        { label: 'What works', sub: ['minimum dose', 'zone 2 cardio', 'compound movements'] },
      ]},
      { label: 'Nutrition', sub: [
        { label: 'Diet myths', sub: ['calorie myths', 'breakfast debate', 'superfood marketing'] },
        { label: 'What to eat', sub: ['gut health', 'anti-inflammatory', 'protein timing'] },
      ]},
      { label: 'Sleep & Recovery', sub: [
        { label: 'Sleep hacks', sub: ['temperature trick', 'duration myths', 'wind-down routine'] },
        { label: 'Recovery', sub: ['cold exposure', 'sauna benefits', 'rest importance'] },
      ]},
      { label: 'Longevity', sub: [
        { label: 'Anti-aging', sub: ['blue zone secrets', 'fasting benefits', 'evidence-based supplements'] },
        { label: 'Biohacking', sub: ['wearable insights', 'blood markers', 'morning routines'] },
      ]},
    ],
  },

  gaming_popculture: {
    topics: [
      { label: 'Gaming Secrets', sub: [
        { label: 'Easter eggs', sub: ['hidden decades', 'developer messages', 'meta references'] },
        { label: 'Cut content', sub: ['deleted levels', 'beta features', 'character changes'] },
      ]},
      { label: 'Gaming History', sub: [
        { label: 'Industry drama', sub: ['studio collapse', 'development hell', 'accidental features'] },
        { label: 'Records', sub: ['impossible speedruns', 'marathon records', 'rare achievements'] },
      ]},
      { label: 'Pop Culture', sub: [
        { label: 'Film & TV', sub: ['improvised scenes', 'casting near-misses', 'hidden details'] },
        { label: 'Music', sub: ['hidden samples', 'speed compositions', 'secret recordings'] },
      ]},
      { label: 'Industry Trends', sub: [
        { label: 'Upcoming', sub: ['record-breaking hype', 'unexpected reveals', 'long-awaited sequels'] },
        { label: 'Shifts', sub: ['AI integration', 'subscription fatigue', 'indie dominance'] },
      ]},
    ],
  },

  conspiracy_mystery: {
    topics: [
      { label: 'Government', sub: [
        { label: 'Declassified', sub: ['mind control', 'secret operations', 'midnight releases'] },
        { label: 'Active secrets', sub: ['restricted areas', 'denied incidents', 'missing documents'] },
      ]},
      { label: 'Hidden Knowledge', sub: [
        { label: 'Suppressed tech', sub: ['buried patents', 'energy devices', 'automotive control'] },
        { label: 'Secret societies', sub: ['annual meetings', 'ritual evidence', 'financial control'] },
      ]},
      { label: 'Reality Questions', sub: [
        { label: 'Simulation theory', sub: ['mathematical evidence', 'glitch reports', 'expert converts'] },
        { label: 'Mandela effects', sub: ['logo changes', 'historical shifts', 'timeline evidence'] },
      ]},
      { label: 'Unexplained', sub: [
        { label: 'Structures', sub: ['underground tunnels', 'impossible buildings', 'perfect alignment'] },
        { label: 'Events', sub: ['sky anomalies', 'mass sightings', 'repeating signals'] },
      ]},
    ],
  },

  business_entrepreneur: {
    topics: [
      { label: 'Startup Stories', sub: [
        { label: 'From zero', sub: ['bootstrapped success', 'garage origins', 'rejected ideas'] },
        { label: 'Failures to wins', sub: ['last-minute pivots', 'near-death companies', 'worst decisions'] },
      ]},
      { label: 'Business Models', sub: [
        { label: 'Unconventional', sub: ['hidden models', 'loss-leader strategy', 'razor-blade effect'] },
        { label: 'Digital', sub: ['newsletter empires', 'solo operators', 'API economy'] },
      ]},
      { label: 'Psychology', sub: [
        { label: 'Pricing', sub: ['anchor pricing', 'decoy effect', 'premium perception'] },
        { label: 'Growth', sub: ['viral loops', 'organic growth', 'waitlist strategy'] },
      ]},
      { label: 'Side Projects', sub: [
        { label: 'Getting started', sub: ['24-hour validation', 'weekend MVP', 'first revenue'] },
        { label: 'Scaling', sub: ['going full-time', 'automation stack', 'hiring first'] },
      ]},
    ],
  },
};
