import type { OpportunityRouteRow } from './queries'

export type OpportunityTagTone = 'amber' | 'blue' | 'green' | 'violet' | 'slate'

export type OpportunityReasonTag = {
  label: string
  tone: OpportunityTagTone
  tooltip: string
}

export type OpportunityNarrative = {
  headline: string
  detail: string
  tags: OpportunityReasonTag[]
}

export function getOpportunityNarrative(route: OpportunityRouteRow): OpportunityNarrative {
  const model = route.aircraft_model ?? ''

  if (route.aircraft_category === 'Turboprop') {
    return {
      headline: 'Speed & comfort upgrade',
      detail: 'CRJ improves cycle time and passenger perception on sectors that still rely on turboprops.',
      tags: [
        { label: 'Speed Upgrade', tone: 'amber', tooltip: 'Jet block times and cruise speed improve schedule appeal on short sectors.' },
        { label: 'Premium Cabin', tone: 'blue', tooltip: 'A regional jet supports a more executive-friendly onboard product than a turboprop.' },
      ],
    }
  }

  if (route.competitive_segment === 'Porter E195') {
    return {
      headline: 'Frequency defense',
      detail: 'Porter is winning with larger E195 flying. CRJ positions around schedule convenience and right-sized capacity, not a blanket fuel claim.',
      tags: [
        { label: 'Frequency Defense', tone: 'blue', tooltip: 'A smaller gauge can support more schedule choice on high-frequency business corridors.' },
        { label: 'Right-Sized Capacity', tone: 'green', tooltip: 'CRJ avoids matching a larger jet seat-for-seat when the goal is schedule utility.' },
      ],
    }
  }

  if (route.aircraft_generation === 'Next Gen') {
    return {
      headline: 'Trip-cost discipline',
      detail: 'Against newer E-Jets, the sharper pitch is aircraft right-sizing, deployment flexibility, and trip-cost discipline on regional sectors.',
      tags: [
        { label: 'Trip Cost', tone: 'green', tooltip: 'The argument is lower trip cost through smaller gauge, not a hard claim on seat-burn efficiency.' },
        { label: 'Right-Sized Capacity', tone: 'amber', tooltip: 'CRJ can protect frequency without oversupplying seats on thinner routes.' },
      ],
    }
  }

  if (model.includes('175') || model.includes('170') || model.includes('145')) {
    return {
      headline: 'Scope-friendly replacement',
      detail: 'These missions align with the CRJ family on scope, frequency, and feeder economics for short- to mid-haul regional flying.',
      tags: [
        { label: 'Trip Cost', tone: 'green', tooltip: 'Smaller regional missions reward lower trip cost and cleaner gauge matching.' },
        { label: 'Scope Fit', tone: 'violet', tooltip: 'US regional markets value aircraft that fit existing scope-clause economics and crew models.' },
      ],
    }
  }

  return {
    headline: 'Targeted regional replacement',
    detail: 'The opportunity is strongest where CRJ can win on network fit, trip cost, and premium regional positioning.',
    tags: [
      { label: 'Network Fit', tone: 'blue', tooltip: 'Use CRJ where airlines need schedule utility more than extra seats.' },
      { label: 'Right-Sized Capacity', tone: 'green', tooltip: 'Position CRJ as a precise regional tool, not a like-for-like seat replacement.' },
    ],
  }
}