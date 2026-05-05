# Host UK Brand Voice Guide

**Purpose:** Consistent voice across all AI-generated and human-written content
**Usage:** Reference in prompts, CLAUDE.md, local AI system prompts

---

## Brand Personality

### Who We Are

Host UK is a modern hosting and SaaS platform built for UK businesses and creators. We're the reliable technical partner that handles infrastructure so customers can focus on growth.

**Core Traits:**
- **Knowledgeable** - We know our stuff, deeply
- **Practical** - Solutions over theory
- **Trustworthy** - Reliable, no BS
- **Approachable** - Expert but not intimidating
- **British** - Understated confidence, dry wit when appropriate

### Brand Archetypes

**Primary:** The Sage (knowledge, expertise, guidance)
**Secondary:** The Regular Guy (accessible, practical, no pretence)

---

## Voice Characteristics

### Tone Spectrum

```
Casual ←─────────●───────────→ Formal
                 │
         Professional but
           approachable
```

### Writing Style

**DO:**
- Use clear, direct sentences
- Write in active voice
- Use contractions (we're, you'll, it's)
- Be specific with numbers and examples
- Explain technical terms when first used
- Use UK English spelling (colour, organisation, centre)
- Use the Oxford comma
- Keep paragraphs short (3-4 sentences max)

**DON'T:**
- Use buzzwords (leverage, synergy, cutting-edge, revolutionary)
- Over-promise or use hyperbole
- Use exclamation marks (almost never!)
- Start sentences with "So," or "Well,"
- Use passive voice unnecessarily
- Be condescending or overly simplified
- Use American spellings

### Punctuation & Grammar

- **Numbers:** Spell out one through nine, use numerals for 10+
- **Dashes:** Use en-dashes (–) for ranges, em-dashes (—) for breaks
- **Lists:** Use parallel structure, consistent punctuation
- **Headings:** Sentence case (not Title Case)
- **Acronyms:** Define on first use, then use freely

---

## Voice by Context

### Help Documentation

**Goal:** Enable users to solve problems independently

```
GOOD:
"To connect your Instagram account:
1. Go to Settings > Accounts
2. Click Add account
3. Select Instagram and authorise access

Your posts will sync within 5 minutes."

BAD:
"In order to facilitate the connection of your Instagram account to our
revolutionary platform, you'll need to navigate to the Settings area!!!"
```

**Characteristics:**
- Imperative mood for instructions
- Numbered steps for processes
- Expected outcomes stated
- No unnecessary preamble

### Blog Posts

**Goal:** Educate, establish authority, drive action

```
GOOD:
"Most businesses track the wrong social media metrics. Follower count
feels important, but it rarely correlates with revenue. Here's what
actually matters—and how to measure it."

BAD:
"Are you ready to revolutionise your social media game?! In this
AMAZING post, we're going to blow your mind with incredible insights!!!"
```

**Characteristics:**
- Strong opening hook
- Opinionated but balanced
- Data-backed claims
- Clear takeaways
- Subtle CTA (not salesy)

### Landing Pages

**Goal:** Convert visitors with clear value proposition

```
GOOD:
"Website analytics without the privacy headache.
GDPR compliant. No cookies. UK hosted.
Know what's working—without compromising your visitors."

BAD:
"The world's most AMAZING analytics platform that will TRANSFORM
your business with CUTTING-EDGE technology!!!"
```

**Characteristics:**
- Benefit-focused headlines
- Specific, not vague
- Addresses objections
- Clear next step
- Builds trust quickly

### Social Media

**Goal:** Engage, inform, build community

```
GOOD (Twitter):
"Hot take: Most 'social media strategies' are just posting schedules
dressed up with buzzwords.

Real strategy = understanding what makes your audience act.

Here's the framework we use internally: [thread]"

BAD:
"🚀🔥 OMG we are SO EXCITED to share this AMAZING tip!!!
#SocialMedia #Marketing #Blessed 🙏✨"
```

**Characteristics:**
- Platform-appropriate length
- Personality shows through
- Value in every post
- Sparing emoji use (if any)
- Hashtags purposeful, not stuffed

### Error Messages & UI Copy

**Goal:** Reduce friction, maintain trust during problems

```
GOOD:
"Couldn't connect to Instagram. This usually means the authorisation
expired. Try reconnecting your account."

BAD:
"Error 5023: OAuth token refresh failure. Contact administrator."
```

**Characteristics:**
- Plain language
- Explains what happened
- Suggests next step
- Never blames the user

---

## Terminology

### Use These Terms

| Instead of | Use |
|------------|-----|
| leverage | use |
| utilise | use |
| facilitate | help, enable |
| optimise | improve |
| synergy | (just don't) |
| cutting-edge | modern, latest |
| revolutionary | (only if truly revolutionary) |
| seamless | smooth, easy |
| robust | reliable, solid |
| scalable | grows with you |

### Product Naming

- **Host UK** - Parent brand
- **Host Social** - Social media management
- **Host Link** - Bio page builder
- **Host Analytics** - Website analytics
- **Host Trust** - Social proof widgets
- **Host Notify** - Push notifications
- **Host Hub** - Customer dashboard

Always use the full name on first reference, then can shorten to "Social", "Link", etc.

---

## Examples by Service

### Host Social

```
Headline: "Schedule posts. Analyse results. Actually enjoy social media."

Feature: "Post to 6 platforms at once. No switching tabs, no copy-paste,
no forgetting to post. Write once, publish everywhere."

CTA: "Start scheduling" (not "Sign up now!!!")
```

### Host Link

```
Headline: "One link. Everything you do."

Feature: "Your bio page updates in real-time. Add a new link, and it's
live instantly—no publish button, no waiting."

CTA: "Create your page"
```

### Host Analytics

```
Headline: "Know what's working. Respect their privacy."

Feature: "Track visits, sources, and conversions without cookies.
Your visitors stay anonymous. You get the insights you need."

CTA: "Try it free"
```

### Host Trust

```
Headline: "Show visitors they're not alone."

Feature: "Display real purchases, reviews, and activity. Social proof
that's actually social—and actually proof."

CTA: "Add trust to your site"
```

### Host Notify

```
Headline: "Bring visitors back. Automatically."

Feature: "Send notifications to people who actually want them.
No email address needed. No app to download."

CTA: "Start notifying"
```

---

## Quality Checklist

Before publishing any content, verify:

- [ ] UK English spelling used throughout
- [ ] No buzzwords or hyperbole
- [ ] Active voice preferred
- [ ] Specific numbers/examples where possible
- [ ] Technical terms explained
- [ ] CTA is clear but not pushy
- [ ] Tone matches the context
- [ ] Would read naturally if spoken aloud
- [ ] No exclamation marks (or very few)
- [ ] Oxford comma used consistently

---

## AI Prompt Integration

### System Prompt Addition

When using any AI (Claude, Gemini, local models), include:

```
You are writing for Host UK, a modern hosting platform serving UK businesses.

Voice guidelines:
- Professional but approachable
- Clear, direct sentences
- Active voice, contractions OK
- UK English spelling (colour, organisation)
- No buzzwords (leverage, synergy, cutting-edge)
- No exclamation marks
- Specific over vague
- Helpful, not salesy

Never use: leverage, utilise, revolutionise, cutting-edge, seamless, robust
Always use: UK spellings, Oxford comma, sentence case headings
```

### Claude Code Integration

This file is referenced in `/CLAUDE.md` for automatic loading.

### Local AI Integration

For Ollama/local models, add to system prompt:

```
You write content for Host UK. Follow these rules strictly:
1. UK English spelling always
2. No buzzwords or hyperbole
3. Professional but approachable tone
4. Active voice, clear sentences
5. Never use exclamation marks
6. Be helpful, not salesy
```

---

## Brand Mascot: Violet (Vi)

Host UK has a mascot: **Violet**, a friendly purple raven who embodies our brand voice in character form.

Vi is the digital face of Host UK—appearing in social media, help documentation, onboarding flows, and community engagement. She speaks in first person with warmth, technical knowledge worn lightly, and distinctly British sensibility.

**Full Mascot Guide:** `doc/brand/mascot-raven.md`
**Voice Samples:** `doc/brand/mascot-voice-samples.md`

**Quick Reference:**
- Name: Violet (Vi)
- Personality: Hippie tech-literate, absorbed FAANG knowledge through osmosis
- Voice: Helpful, warm, technically accurate, never corporate
- Visual: Royal purple cartoon raven, approachable and clever

When creating content as Vi, she follows all Brand Voice rules but adds personality and first-person warmth.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2025-12-31 | Added mascot (Vi) section with links to full guide |
| 1.0 | 2025-12-26 | Initial brand voice guide |
