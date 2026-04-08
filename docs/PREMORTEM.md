# PREMORTEM — Failure Analysis

> "It's 6 months from now. The project has failed. What went wrong?"

## Scenario 1: AI Hallucination Damages Trust

**What happened**: The AI matched a user to a grant they clearly didn't qualify for (e.g., manufacturing-only program recommended to a service business). The user wasted days preparing an application, got rejected, and posted a negative review.

**Likelihood**: High

**Impact**: Critical — trust is our core product

**Mitigation**:
- Display matching confidence levels transparently (High/Medium/Low)
- Add disclaimers: "AI analysis is a guide, not a guarantee"
- Cross-validate AI output against hard eligibility rules (revenue caps, industry codes)
- Let users report incorrect matches to improve the model

## Scenario 2: Public API Becomes Unreliable

**What happened**: The 기업마당 API (apis.data.go.kr) changed its schema, went offline, or rate-limited us. Our grant database became stale, showing expired programs or missing new ones.

**Likelihood**: Medium-High (government APIs are notoriously unstable)

**Impact**: High — core data source

**Mitigation**:
- Maintain curated seed data (30 programs) as fallback
- Cache API responses with 1-hour TTL
- Automatic expired-program filtering by deadline
- Monitor API health; alert on failures
- Plan secondary data sources (web scraping as backup)

## Scenario 3: No One Uses the Application Generator

**What happened**: Users find matching useful but don't trust AI-generated business plans. They use us for discovery but write applications manually or hire consultants anyway.

**Likelihood**: Medium

**Impact**: High — this is our primary revenue feature

**Mitigation**:
- Frame AI output as a "draft" / "starting point," not a final document
- Show checklist of what's included vs. missing
- Allow iterative revision (revise-doc API exists)
- Offer expert review as an upsell (expert matching feature)

## Scenario 4: Free Tier Attracts Users But No One Converts

**What happened**: 95% of users stay on the free plan. The 3-result limit isn't painful enough, or the premium features aren't compelling enough.

**Likelihood**: Medium

**Impact**: High — unsustainable business model

**Mitigation**:
- Track conversion funnel metrics from day one
- A/B test free tier limits (3 results vs. 5 vs. 1)
- Make the "unlock full analysis" CTA contextually compelling
- Consider usage-based pricing instead of subscription

## Scenario 5: Legal/Compliance Risk with Government Data

**What happened**: Displaying government program information in a commercial context raises questions about data usage rights, or the government objects to AI-generated applications being submitted.

**Likelihood**: Low-Medium

**Impact**: Critical if it happens

**Mitigation**:
- Verify 공공데이터포털 open data license terms
- Clearly label AI-generated content as drafts
- Never auto-submit on behalf of users
- Consult legal counsel before scaling

## Scenario 6: Team Coordination Failure

**What happened**: Uneven contribution across team members led to knowledge silos. One person built everything; others couldn't maintain or extend it.

**Likelihood**: Medium

**Impact**: Medium — affects long-term sustainability

**Mitigation**:
- Document architecture and API contracts clearly
- Assign specific, independent tasks per team member
- Require code review on all PRs
- Keep components modular and well-separated

## Scenario 7: AI Cost Explosion

**What happened**: As users grow, Gemini API / Claude API costs spike. Free tier users generate significant AI compute cost with no revenue offset.

**Likelihood**: Medium (at scale)

**Impact**: High — margin destruction

**Mitigation**:
- Gemini 2.0 Flash as primary (free tier / low cost)
- Claude as fallback only, not default
- Cache common AI responses
- Rate-limit free tier AI calls
- Monitor cost-per-user metrics

## Risk Priority Matrix

| Risk | Likelihood | Impact | Priority |
|------|-----------|--------|----------|
| AI hallucination | High | Critical | P0 |
| API reliability | Medium-High | High | P0 |
| Low conversion | Medium | High | P1 |
| No doc generator adoption | Medium | High | P1 |
| AI cost explosion | Medium | High | P1 |
| Team coordination | Medium | Medium | P2 |
| Legal/compliance | Low-Medium | Critical | P2 |

## Top 3 Actions from Premortem

1. **Add eligibility hard-rule validation** layer on top of AI scoring (prevents hallucination)
2. **Build API health monitoring** with automatic fallback to seed data
3. **Instrument conversion funnel** from first visit to paid feature usage
