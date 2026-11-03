import { CHOICES_BASE, EVENTS_BASE, HAZARDS_BASE } from './events'
import { CHOICES_MORE, EVENTS_MORE } from './branches'
import type { ChoiceDef, EventDef, Hazard } from './types'

export const CHOICES: ChoiceDef[] = [...CHOICES_BASE, ...CHOICES_MORE]
export const EVENTS: EventDef[] = [...EVENTS_BASE, ...EVENTS_MORE]
export const HAZARDS: Hazard[] = HAZARDS_BASE
