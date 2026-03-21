/**
 * Topic Suggestion Funnel — 3-level progressive narrowing per niche.
 *
 * Level 1: Broad category (always shown when niche selected)
 * Level 2: Specific angle (shown when L1 selected)
 * Level 3: Hook/twist (shown when L2 selected)
 *
 * All selected levels are concatenated and passed to the researcher/script writer
 * as topic context: "Haunted Places > Abandoned Asylums > The one that drove doctors insane"
 */

export const TOPIC_SUGGESTIONS = {
  ai_tech_news: {
    topics: [
      { label: 'AI Breakthroughs', sub: [
        { label: 'Reasoning & Intelligence', sub: ['The AI that passed a PhD exam', 'When AI outsmarts its creators', 'The test no AI was supposed to pass'] },
        { label: 'Creative AI', sub: ['AI art that fooled the experts', 'The AI composer nobody can tell apart', 'When machines dream'] },
        { label: 'Robotics & Physical AI', sub: ['Robots learning to feel', 'The warehouse robot uprising', 'Humanoid robots are here'] },
        { label: 'Medical AI', sub: ['AI diagnosing cancer before doctors', 'The drug AI invented in 48 hours', 'AI that predicts heart attacks'] },
      ]},
      { label: 'AI & Jobs', sub: [
        { label: 'White-collar disruption', sub: ['Lawyers replaced by AI', 'The coding job that no longer exists', 'AI accountants vs human ones'] },
        { label: 'Creative industry impact', sub: ['Hollywood vs AI actors', 'Musicians losing to algorithms', 'The photographer who was replaced'] },
        { label: 'New jobs AI created', sub: ['Prompt engineering salaries', 'AI trainer — the job nobody expected', 'The humans teaching robots'] },
      ]},
      { label: 'AI Ethics & Safety', sub: [
        { label: 'Deepfakes & Misinformation', sub: ['The deepfake that started a war', 'You can\'t trust video anymore', 'AI-generated politicians'] },
        { label: 'Surveillance & Privacy', sub: ['Your face is in a database', 'The city that watches everything', 'AI predicting crime before it happens'] },
        { label: 'Existential Risk', sub: ['Why AI researchers are terrified', 'The alignment problem explained', 'The AI that tried to escape'] },
      ]},
      { label: 'Tech Giants', sub: [
        { label: 'OpenAI & Microsoft', sub: ['The power struggle inside OpenAI', 'GPT\'s secret capabilities', 'Why Microsoft bet everything on AI'] },
        { label: 'Google vs Everyone', sub: ['Google\'s AI panic mode', 'Gemini vs GPT — the real winner', 'The search engine is dying'] },
        { label: 'Apple & Meta', sub: ['Apple\'s secret AI lab', 'Meta\'s metaverse pivot to AI', 'The Vision Pro\'s AI features nobody uses'] },
      ]},
      { label: 'Future Predictions', sub: [
        { label: '2030 predictions', sub: ['What your job looks like in 2030', 'The AI singularity timeline', 'Schools in 5 years'] },
        { label: 'AGI timeline', sub: ['How close are we really', 'The race to build god', 'What happens the day after AGI'] },
      ]},
    ],
  },

  finance_money: {
    topics: [
      { label: 'Wealth Building', sub: [
        { label: 'Investing strategies', sub: ['The lazy portfolio that beats Wall Street', 'Index funds vs stock picking truth', 'The investment nobody talks about'] },
        { label: 'Saving hacks', sub: ['The envelope method 2.0', 'How to save $10K without noticing', 'The subscription audit trick'] },
        { label: 'Real estate', sub: ['House hacking explained', 'Why renting can be smarter', 'The Airbnb arbitrage strategy'] },
      ]},
      { label: 'Money Myths', sub: [
        { label: 'Debt myths', sub: ['Good debt vs bad debt is a lie', 'The credit score scam', 'Why minimum payments are designed to trap you'] },
        { label: 'Spending myths', sub: ['The latte factor is wrong', 'Frugality won\'t make you rich', 'Why budgets fail for most people'] },
        { label: 'Rich people myths', sub: ['Self-made billionaire is a myth', 'The luck factor nobody admits', 'How the rich actually think about money'] },
      ]},
      { label: 'Crypto & Web3', sub: [
        { label: 'Bitcoin', sub: ['Bitcoin halving impact explained', 'Why governments fear Bitcoin', 'The lost Bitcoin fortune'] },
        { label: 'Altcoins & Trends', sub: ['The next crypto cycle prediction', 'Meme coins — gambling or genius', 'DeFi explained for beginners'] },
      ]},
      { label: 'Side Hustles', sub: [
        { label: 'Digital', sub: ['The no-code SaaS blueprint', 'Selling digital products while you sleep', 'The newsletter business model'] },
        { label: 'Physical', sub: ['Vending machines as passive income', 'The car wash empire strategy', 'Storage unit auctions goldmine'] },
      ]},
      { label: 'Tax & System', sub: [
        { label: 'Tax strategies', sub: ['Legal ways the rich avoid taxes', 'The LLC tax hack', 'Tax write-offs you\'re missing'] },
        { label: 'Banking system', sub: ['How banks make money from you', 'The fractional reserve truth', 'Why your savings lose value every year'] },
      ]},
    ],
  },

  scary_horror: {
    topics: [
      { label: 'Haunted Places', sub: [
        { label: 'Abandoned asylums', sub: ['The asylum that drove doctors insane', 'Why they sealed the basement forever', 'The patient who predicted every death'] },
        { label: 'Ghost ships', sub: ['The Mary Celeste mystery', 'The ship that sailed itself for years', 'Crew vanished — dinner still on table'] },
        { label: 'Cursed locations', sub: ['The bridge where people jump', 'The hotel room nobody survives', 'The forest that whispers back'] },
        { label: 'Murder houses', sub: ['Living in a serial killer\'s house', 'The walls that bled', 'The family who didn\'t know'] },
      ]},
      { label: 'Unexplained Events', sub: [
        { label: 'Mass disappearances', sub: ['The village that vanished overnight', 'The Dyatlov Pass truth', '300 people gone — no trace'] },
        { label: 'Time anomalies', sub: ['The man from the future with proof', 'Time slips people actually experienced', 'The town stuck in a loop'] },
        { label: 'Sounds & signals', sub: ['The Bloop — what made that sound', 'Numbers stations still broadcasting', 'The hum only some people hear'] },
      ]},
      { label: 'Cryptids & Creatures', sub: [
        { label: 'Documented sightings', sub: ['The footage that changed everything', 'Fishermen caught something impossible', 'The creature in the cave system'] },
        { label: 'Underwater terrors', sub: ['What lives below 10,000 feet', 'The megalodon evidence', 'Deep sea cameras captured something'] },
      ]},
      { label: 'True Scary Stories', sub: [
        { label: 'Home invasions', sub: ['They lived in the walls for months', 'The camera caught someone watching', 'The babysitter who called police'] },
        { label: 'Online horror', sub: ['The deep web rabbit hole', 'The game that predicted players\' deaths', 'The chat room that wasn\'t empty'] },
        { label: 'Survival stories', sub: ['Buried alive and survived', '72 hours lost in a cave', 'The hiker who found something wrong'] },
      ]},
      { label: 'Paranormal', sub: [
        { label: 'Possessions', sub: ['The exorcism caught on camera', 'The doll that moves at night', 'The priest who quit after this case'] },
        { label: 'EVP & Evidence', sub: ['Ghost hunters recorded this', 'The photo that can\'t be explained', 'Security cameras in the morgue'] },
      ]},
    ],
  },

  motivation_self_help: {
    topics: [
      { label: 'Mindset Shifts', sub: [
        { label: 'Discipline & Habits', sub: ['The 2-minute rule that changes everything', 'Why motivation is a trap', 'How to never break a streak'] },
        { label: 'Fear & Comfort Zone', sub: ['Do the thing that scares you most', 'The 5-second rule explained', 'Comfort is killing your potential'] },
        { label: 'Failure & Growth', sub: ['The CEO who was fired from his own company', 'Failure is data, not defeat', 'Why your worst day was your best lesson'] },
      ]},
      { label: 'Success Stories', sub: [
        { label: 'Against all odds', sub: ['Homeless to CEO in 3 years', 'The blind man who climbed Everest', 'Rejected 1000 times then changed the world'] },
        { label: 'Late bloomers', sub: ['Started at 50, billionaire by 60', 'The grandma who became a bodybuilder', 'It\'s not too late — proof'] },
        { label: 'Comebacks', sub: ['From prison to Forbes list', 'The athlete doctors said would never walk', 'Bankrupt to back on top'] },
      ]},
      { label: 'Mental Health', sub: [
        { label: 'Anxiety & Stress', sub: ['The breathing trick that stops panic attacks', 'Why your phone is making you anxious', 'The 3-3-3 grounding technique'] },
        { label: 'Confidence', sub: ['Fake it till you make it actually works', 'The power pose science', 'How to stop caring what people think'] },
      ]},
      { label: 'Productivity', sub: [
        { label: 'Time management', sub: ['The Eisenhower matrix in 60 seconds', 'Why to-do lists don\'t work', 'Time blocking changed my life'] },
        { label: 'Focus', sub: ['The deep work method', 'Digital detox results after 30 days', 'One task at a time — the science'] },
      ]},
    ],
  },

  history_did_you_know: {
    topics: [
      { label: 'Ancient Civilizations', sub: [
        { label: 'Lost civilizations', sub: ['The city older than the pyramids', 'Civilizations we can\'t explain', 'The map that shouldn\'t exist'] },
        { label: 'Ancient technology', sub: ['The battery from 2000 years ago', 'Ancient surgery tools found', 'The computer from ancient Greece'] },
      ]},
      { label: 'Wars & Conflicts', sub: [
        { label: 'Untold stories', sub: ['The soldier who fought for both sides', 'The battle decided by weather', 'The spy who saved millions'] },
        { label: 'Turning points', sub: ['The mistake that changed the war', 'What if D-Day had failed', 'The 15 minutes that shaped history'] },
      ]},
      { label: 'Royal & Political', sub: [
        { label: 'Royal scandals', sub: ['The king who vanished', 'The queen who was actually a man', 'The heir nobody wanted'] },
        { label: 'Cover-ups', sub: ['The history they don\'t teach', 'Documents they classified for 100 years', 'The truth about the founding'] },
      ]},
      { label: 'Inventions & Discoveries', sub: [
        { label: 'Stolen inventions', sub: ['Tesla vs Edison — who really won', 'The invention that was buried', 'They stole his idea and got famous'] },
        { label: 'Accidental discoveries', sub: ['The mistake worth billions', 'Found it by accident in a lab', 'The explorer who got lost and changed the world'] },
      ]},
      { label: 'Bizarre History', sub: [
        { label: 'Strange events', sub: ['The dancing plague of 1518', 'When it rained frogs', 'The great molasses flood'] },
        { label: 'Weird laws & customs', sub: ['Punishments that sound made up', 'The trial of animals in court', 'Beauty standards through history'] },
      ]},
    ],
  },

  true_crime: {
    topics: [
      { label: 'Unsolved Cases', sub: [
        { label: 'Missing persons', sub: ['Vanished from a locked room', 'The student who never came home', 'Missing for 30 years — then a phone call'] },
        { label: 'Cold cases', sub: ['The DNA that cracked it 40 years later', 'The case every detective gave up on', 'New evidence just found'] },
      ]},
      { label: 'Serial Killers', sub: [
        { label: 'Caught', sub: ['The mistake that led to the arrest', 'The neighbor nobody suspected', 'Caught by a genealogy website'] },
        { label: 'Never caught', sub: ['The Zodiac\'s final cipher', 'Still hunting after 50 years', 'The one who got away'] },
      ]},
      { label: 'Heists & Fraud', sub: [
        { label: 'Perfect crimes', sub: ['The heist with zero evidence', 'The art theft worth $500 million', 'The bank robber who was too polite'] },
        { label: 'Con artists', sub: ['The fake doctor who operated for years', 'The man who sold the Eiffel Tower', 'The teenager who impersonated a pilot'] },
      ]},
      { label: 'Wrongful Convictions', sub: [
        { label: 'Freed after decades', sub: ['30 years in prison for nothing', 'The evidence they hid', 'DNA proved his innocence'] },
        { label: 'Corrupt justice', sub: ['The judge who was on the take', 'Manufactured evidence exposed', 'The witness who lied under oath'] },
      ]},
      { label: 'Forensic Breakthroughs', sub: [
        { label: 'DNA revolution', sub: ['How genetic genealogy solves cold cases', 'The smallest DNA sample that convicted', 'Ancestry.com caught a killer'] },
        { label: 'New technology', sub: ['AI solving cold cases now', 'Digital forensics catching online criminals', 'The phone data that proved everything'] },
      ]},
    ],
  },

  science_nature: {
    topics: [
      { label: 'Space & Universe', sub: [
        { label: 'Mind-bending concepts', sub: ['What happens inside a black hole', 'The universe might be a hologram', 'Time moves differently in space'] },
        { label: 'Discoveries', sub: ['The planet made of diamonds', 'Water found where nobody expected', 'The signal from deep space'] },
      ]},
      { label: 'Human Body', sub: [
        { label: 'Brain', sub: ['You only use 10% is wrong — the truth', 'How your brain tricks you daily', 'The memory palace technique'] },
        { label: 'Biology', sub: ['Why we age and how to slow it', 'The organ scientists just discovered', 'Your gut controls your mood'] },
      ]},
      { label: 'Animals', sub: [
        { label: 'Superpowers', sub: ['The animal that\'s basically immortal', 'Animals that can see the future', 'The creature that survives in space'] },
        { label: 'Intelligence', sub: ['Crows smarter than children', 'Octopus escapes that blow your mind', 'The dolphin language theory'] },
      ]},
      { label: 'Earth & Nature', sub: [
        { label: 'Extreme environments', sub: ['Life found in the most impossible place', 'The lake that turns animals to stone', 'The cave sealed for 5 million years'] },
        { label: 'Climate', sub: ['The tipping point nobody talks about', 'Ice cores reveal the future', 'The ocean current that controls everything'] },
      ]},
      { label: 'Physics', sub: [
        { label: 'Quantum weirdness', sub: ['Particles that communicate instantly', 'The cat that\'s alive and dead', 'Quantum tunneling explained simply'] },
        { label: 'Paradoxes', sub: ['The grandfather paradox solved', 'Can you travel faster than light', 'The simulation argument'] },
      ]},
    ],
  },

  relationships_dating: {
    topics: [
      { label: 'Psychology', sub: [
        { label: 'Attachment styles', sub: ['Your attachment style is ruining everything', 'Anxious-avoidant trap explained', 'How to become secure'] },
        { label: 'Attraction science', sub: ['The science behind instant chemistry', 'Why we\'re attracted to the wrong people', 'The mere exposure effect'] },
      ]},
      { label: 'Modern Dating', sub: [
        { label: 'Apps & Culture', sub: ['Why dating apps are broken by design', 'The paradox of too many choices', 'How algorithms decide your love life'] },
        { label: 'Red flags', sub: ['The red flag everyone ignores', 'Love bombing vs genuine interest', 'When nice is actually manipulative'] },
      ]},
      { label: 'Long-term Relationships', sub: [
        { label: 'Communication', sub: ['The Gottman method in 60 seconds', 'How to argue without destroying trust', 'The four horsemen of relationship death'] },
        { label: 'Keeping it alive', sub: ['Why the 7-year itch is real', 'The 5 love languages simplified', 'What happy couples do differently'] },
      ]},
      { label: 'Breakups & Healing', sub: [
        { label: 'Moving on', sub: ['The no-contact rule and why it works', 'Why it takes exactly 21 days', 'The rebound mistake'] },
        { label: 'Growth', sub: ['The breakup that saved my life', 'Finding yourself after losing them', 'Why being alone is a superpower'] },
      ]},
    ],
  },

  health_fitness: {
    topics: [
      { label: 'Exercise Myths', sub: [
        { label: 'Workout myths', sub: ['Stretching before workouts is wrong', 'Cardio doesn\'t burn fat the way you think', 'The muscle confusion myth'] },
        { label: 'What actually works', sub: ['The minimum effective dose for fitness', 'Zone 2 cardio explained', '5 minutes a day that actually work'] },
      ]},
      { label: 'Nutrition', sub: [
        { label: 'Diet myths', sub: ['Calories in calories out is too simple', 'The breakfast myth', 'Superfoods are marketing'] },
        { label: 'What to eat', sub: ['The gut microbiome diet', 'Anti-inflammatory eating explained', 'Protein timing doesn\'t matter'] },
      ]},
      { label: 'Sleep & Recovery', sub: [
        { label: 'Sleep optimization', sub: ['The temperature hack for deep sleep', 'Why 8 hours might be wrong for you', 'The 10-3-2-1 sleep method'] },
        { label: 'Recovery', sub: ['Cold plunge science explained', 'The sauna longevity connection', 'Why rest days build muscle'] },
      ]},
      { label: 'Longevity', sub: [
        { label: 'Anti-aging science', sub: ['The blue zones secret', 'Fasting and cellular repair', 'The supplement that actually has evidence'] },
        { label: 'Biohacking', sub: ['Wearable data that saves lives', 'Blood work markers to track', 'The morning routine of centenarians'] },
      ]},
    ],
  },

  gaming_popculture: {
    topics: [
      { label: 'Gaming Secrets', sub: [
        { label: 'Easter eggs', sub: ['Hidden for 20 years until someone found it', 'The developer who hid their wedding proposal', 'Easter eggs inside easter eggs'] },
        { label: 'Cut content', sub: ['The level they deleted and why', 'Beta features that were too good', 'The character that was supposed to live'] },
      ]},
      { label: 'Gaming History', sub: [
        { label: 'Industry stories', sub: ['The game that bankrupted a studio', 'The 15-year development hell', 'How a bug became a feature'] },
        { label: 'Records & feats', sub: ['The speedrun that broke reality', 'The longest gaming marathon ever', 'The impossible achievement someone got'] },
      ]},
      { label: 'Pop Culture', sub: [
        { label: 'Movies & TV', sub: ['The scene that wasn\'t in the script', 'Actors who almost got the role', 'Hidden details you missed'] },
        { label: 'Music', sub: ['The sample hidden in every hit song', 'Songs that were written in minutes', 'The album recorded in secret'] },
      ]},
      { label: 'Upcoming & Hype', sub: [
        { label: 'Anticipated releases', sub: ['Why GTA 6 will break every record', 'The game nobody believes is real', 'Sequel we\'ve waited a decade for'] },
        { label: 'Industry trends', sub: ['AI in game development now', 'The subscription model killing gaming', 'Indie games beating AAA studios'] },
      ]},
    ],
  },

  conspiracy_mystery: {
    topics: [
      { label: 'Government Secrets', sub: [
        { label: 'Declassified', sub: ['MKUltra — what they actually did', 'Operation Paperclip truth', 'The files they released at midnight'] },
        { label: 'Active cover-ups', sub: ['What\'s really in Area 51 now', 'The submarine incident they denied', 'The missing classified pages'] },
      ]},
      { label: 'Hidden Knowledge', sub: [
        { label: 'Suppressed technology', sub: ['The energy device they buried', 'Why we don\'t have flying cars yet', 'The patent that disappeared'] },
        { label: 'Secret societies', sub: ['The Bilderberg Group meetings', 'Bohemian Grove rituals', 'The order controlling global finance'] },
      ]},
      { label: 'Simulation & Reality', sub: [
        { label: 'Simulation theory', sub: ['The mathematical proof we\'re simulated', 'Glitches in the matrix people recorded', 'The physicist who changed his mind'] },
        { label: 'Mandela effects', sub: ['The logo everyone remembers wrong', 'Historical events that shifted', 'Proof of timeline changes'] },
      ]},
      { label: 'Unexplained', sub: [
        { label: 'Structures', sub: ['The tunnels under every major city', 'The building that shouldn\'t exist', 'Ancient structures aligned perfectly'] },
        { label: 'Events', sub: ['The day the sky turned red', 'Mass sightings the news ignored', 'The signal that repeated for 37 seconds'] },
      ]},
    ],
  },

  business_entrepreneur: {
    topics: [
      { label: 'Startup Stories', sub: [
        { label: 'From nothing', sub: ['$0 to $1B — the real story', 'The garage startup that beat Google', 'Started with a rejected idea'] },
        { label: 'Failures that led to success', sub: ['Pivoted at the last second', 'The company that almost died 3 times', 'Why their worst decision was their best'] },
      ]},
      { label: 'Business Models', sub: [
        { label: 'Unconventional', sub: ['The business model nobody talks about', 'How Costco makes money losing money', 'The razor blade model everywhere'] },
        { label: 'Digital', sub: ['The newsletter making $5M/year', 'One-person businesses earning millions', 'The API economy explained'] },
      ]},
      { label: 'Psychology & Strategy', sub: [
        { label: 'Pricing psychology', sub: ['Why $9.99 still works', 'The decoy effect explained', 'How Apple makes you spend more'] },
        { label: 'Growth hacks', sub: ['The referral loop that grew Dropbox', 'How Notion went viral with no ads', 'The waitlist strategy'] },
      ]},
      { label: 'Side Projects', sub: [
        { label: 'Getting started', sub: ['Validate an idea in 24 hours', 'The weekend MVP approach', 'First $1000 online blueprint'] },
        { label: 'Scaling', sub: ['From side project to full-time', 'The automation stack for solopreneurs', 'When to quit your day job'] },
      ]},
    ],
  },
};
