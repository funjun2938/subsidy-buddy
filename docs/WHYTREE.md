# WHYTREE — Why Tree Analysis

## Root Question

**Why does this project need to exist?**

```
Why do small businesses miss government subsidies?
├── Why? Information is fragmented
│   ├── Why? 100+ programs across dozens of portals
│   │   ├── Why? Each ministry runs its own platform
│   │   └── Why? No unified search standard exists
│   └── Why? Program descriptions use bureaucratic jargon
│       └── Why? Written for administrators, not applicants
│
├── Why? Eligibility is hard to determine
│   ├── Why? Each program has unique, complex criteria
│   │   ├── Why? Criteria span industry, revenue, region, age, years in business
│   │   └── Why? Criteria change every funding cycle
│   └── Why? Business owners don't know their own "profile" in government terms
│       └── Why? Mapping real business info to eligibility categories requires expertise
│
├── Why? Application process is intimidating
│   ├── Why? Each program demands a different document format
│   │   └── Why? 예비창업패키지 vs 초기창업패키지 have completely different templates
│   ├── Why? Writing a business plan takes 20+ hours
│   │   └── Why? Applicants rewrite from scratch each time
│   └── Why? Professional consultants charge ₩500K–₩2M per application
│       └── Why? Only large firms can afford this
│
└── Why? Time pressure compounds everything
    ├── Why? Deadlines are scattered and easy to miss
    │   └── Why? No centralized deadline tracking
    └── Why? By the time you find a program, the window may be closed
        └── Why? Discovery → Eligibility check → Application takes weeks manually
```

## Key Insights from the Why Tree

### Insight 1: The Core Problem is Information Asymmetry

The subsidies exist. The businesses qualify. But the two sides can't find each other. This is a **matching problem**, not a funding problem.

→ **Solution**: AI-powered matching engine that takes 5 business attributes and scores against all available programs.

### Insight 2: Understanding Eligibility Requires Domain Translation

Business owners think in terms of "I run a cafe in Gangnam." Government programs think in terms of "Food service industry, Seoul metropolitan area, annual revenue under ₩500M, business age under 3 years."

→ **Solution**: AI document analysis (Vision API) that extracts structured data from business registration certificates and free-text descriptions.

### Insight 3: The "Last Mile" Problem Kills Conversion

Even after finding a matching program, the application format is the final barrier. Each program has its own template with 6+ sections.

→ **Solution**: AI application document generator that produces drafts in the exact official format, with a checklist of required information items.

### Insight 4: Time is the Hidden Cost

Manual process: 2–4 weeks from discovery to submission. Our target: under 30 minutes from landing to generated application draft.

→ **Solution**: D-day countdown, deadline-sorted results, and one-click document generation.

## Why Tree → Feature Mapping

| Root Cause | Feature | Status |
|-----------|---------|--------|
| Fragmented information | Centralized grant database (공공API + seed data) | Done |
| Complex eligibility | AI matching with 5-attribute scoring | Done |
| Hard to self-assess | AI document analysis (Vision + text) | Done |
| Different formats per program | Program-specific application templates | Done |
| Expensive consultants | AI document generation (free/low-cost) | Done |
| Missed deadlines | D-day display + deadline sorting | Done |
| No expert access for small firms | Expert matching marketplace | Done |
