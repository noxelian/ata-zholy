import type { EvTable } from './texts'
import { E18_RU } from './era18.ru'
import { E18_KZ } from './era18.kz'
import { E18_EN } from './era18.en'
import { E15_RU } from './era15.ru'
import { E15_KZ } from './era15.kz'
import { E15_EN } from './era15.en'
import { E19_RU } from './era19.ru'
import { E19_KZ } from './era19.kz'
import { E19_EN } from './era19.en'

/** Texts of the earlier eras, one file per era and language. */
export const ERA_RU: EvTable = { ...E15_RU, ...E18_RU, ...E19_RU }
export const ERA_KZ: EvTable = { ...E15_KZ, ...E18_KZ, ...E19_KZ }
export const ERA_EN: EvTable = { ...E15_EN, ...E18_EN, ...E19_EN }
