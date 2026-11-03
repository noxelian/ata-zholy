import type { Group, Lang, Person, Sex } from './types'
import type { Rng } from './rng'

/** [kazakh cyrillic, russian, latin]. Common names of people born 1900–1935. */
type N = [string, string, string]

const KZ_M: N[] = [
  ['Ахмет', 'Ахмет', 'Akhmet'], ['Омар', 'Омар', 'Omar'], ['Оспан', 'Оспан', 'Ospan'], ['Әлі', 'Али', 'Ali'],
  ['Сүлеймен', 'Сулеймен', 'Suleimen'], ['Ысқақ', 'Искак', 'Yskak'], ['Әбдірахман', 'Абдрахман', 'Abdrakhman'], ['Ибраһим', 'Ибрагим', 'Ibragim'],
  ['Ыбырай', 'Ибрай', 'Ybyrai'], ['Қали', 'Кали', 'Kali'], ['Садық', 'Садык', 'Sadyk'], ['Смағұл', 'Смагул', 'Smagul'],
  ['Нұрғали', 'Нургали', 'Nurgali'], ['Жүсіп', 'Джусуп', 'Zhusip'], ['Мұхаметжан', 'Мухаметжан', 'Mukhametzhan'], ['Жұмабай', 'Джумабай', 'Zhumabai'],
  ['Сейіт', 'Сеит', 'Seit'], ['Қасым', 'Касым', 'Kasym'], ['Сәрсен', 'Сарсен', 'Sarsen'], ['Жақып', 'Джакуп', 'Zhakyp'],
  ['Мұса', 'Муса', 'Musa'], ['Әубәкір', 'Аубакир', 'Aubakir'], ['Тұрсын', 'Турсун', 'Tursyn'], ['Бейсен', 'Бейсен', 'Beisen'],
]
const KZ_F: N[] = [
  ['Күлән', 'Кулян', 'Kulan'], ['Қанипа', 'Канипа', 'Kanipa'], ['Зейнеп', 'Зейнеп', 'Zeinep'], ['Бибісара', 'Бибисара', 'Bibisara'],
  ['Пәтима', 'Фатима', 'Patima'], ['Айша', 'Айша', 'Aisha'], ['Хадиша', 'Хадиша', 'Khadisha'], ['Мәриям', 'Мариям', 'Mariyam'],
  ['Ұлжан', 'Улжан', 'Ulzhan'], ['Күләш', 'Куляш', 'Kulash'], ['Сара', 'Сара', 'Sara'], ['Рәбиға', 'Рабига', 'Rabiga'],
  ['Сәлима', 'Салима', 'Salima'], ['Нағима', 'Нагима', 'Nagima'], ['Халима', 'Халима', 'Khalima'], ['Жамал', 'Джамал', 'Zhamal'],
  ['Бибіжан', 'Бибижан', 'Bibizhan'], ['Зағипа', 'Загипа', 'Zagipa'], ['Шолпан', 'Шолпан', 'Sholpan'], ['Ақбала', 'Акбала', 'Akbala'],
]
const RU_M: N[] = [
  ['Иван', 'Иван', 'Ivan'], ['Василий', 'Василий', 'Vasily'], ['Николай', 'Николай', 'Nikolai'], ['Михаил', 'Михаил', 'Mikhail'],
  ['Пётр', 'Пётр', 'Pyotr'], ['Алексей', 'Алексей', 'Alexei'], ['Фёдор', 'Фёдор', 'Fyodor'], ['Григорий', 'Григорий', 'Grigory'],
  ['Степан', 'Степан', 'Stepan'], ['Андрей', 'Андрей', 'Andrei'], ['Семён', 'Семён', 'Semyon'], ['Яков', 'Яков', 'Yakov'], ['Павел', 'Павел', 'Pavel'], ['Егор', 'Егор', 'Yegor'], ['Сергей', 'Сергей', 'Sergei'], ['Дмитрий', 'Дмитрий', 'Dmitry'],
]
const RU_F: N[] = [
  ['Мария', 'Мария', 'Maria'], ['Анна', 'Анна', 'Anna'], ['Евдокия', 'Евдокия', 'Yevdokia'], ['Прасковья', 'Прасковья', 'Praskovya'],
  ['Александра', 'Александра', 'Alexandra'], ['Татьяна', 'Татьяна', 'Tatiana'], ['Екатерина', 'Екатерина', 'Yekaterina'], ['Анастасия', 'Анастасия', 'Anastasia'],
  ['Пелагея', 'Пелагея', 'Pelageya'], ['Клавдия', 'Клавдия', 'Klavdia'], ['Ольга', 'Ольга', 'Olga'], ['Нина', 'Нина', 'Nina'], ['Матрёна', 'Матрёна', 'Matryona'], ['Антонина', 'Антонина', 'Antonina'], ['Зинаида', 'Зинаида', 'Zinaida'], ['Агафья', 'Агафья', 'Agafya'],
]
const UA_M: N[] = [
  ['Тарас', 'Тарас', 'Taras'], ['Остап', 'Остап', 'Ostap'], ['Петро', 'Петро', 'Petro'], ['Микола', 'Микола', 'Mykola'],
  ['Іван', 'Иван', 'Ivan'], ['Василь', 'Василь', 'Vasyl'], ['Григорій', 'Григорий', 'Hryhoriy'], ['Олекса', 'Олекса', 'Oleksa'],
]
const UA_F: N[] = [
  ['Оксана', 'Оксана', 'Oksana'], ['Ганна', 'Ганна', 'Hanna'], ['Марія', 'Мария', 'Mariya'], ['Параска', 'Параска', 'Paraska'],
  ['Одарка', 'Одарка', 'Odarka'], ['Катерина', 'Катерина', 'Kateryna'], ['Галина', 'Галина', 'Halyna'], ['Олена', 'Олена', 'Olena'],
]
const DE_M: N[] = [
  ['Иоганн', 'Иоганн', 'Johann'], ['Генрих', 'Генрих', 'Heinrich'], ['Якоб', 'Якоб', 'Jakob'], ['Давид', 'Давид', 'David'],
  ['Фридрих', 'Фридрих', 'Friedrich'], ['Петер', 'Петер', 'Peter'], ['Андреас', 'Андреас', 'Andreas'], ['Корнелиус', 'Корнелиус', 'Cornelius'],
]
const DE_F: N[] = [
  ['Анна', 'Анна', 'Anna'], ['Мария', 'Мария', 'Maria'], ['Элизабет', 'Элизабет', 'Elisabeth'], ['Катарина', 'Катарина', 'Katharina'],
  ['Эмилия', 'Эмилия', 'Emilie'], ['Маргарита', 'Маргарита', 'Margarethe'], ['Фрида', 'Фрида', 'Frieda'], ['Луиза', 'Луиза', 'Luise'],
]
const TT_M: N[] = [
  ['Ғабдулла', 'Габдулла', 'Gabdulla'], ['Ахмет', 'Ахмет', 'Akhmet'], ['Хәмит', 'Хамит', 'Khamit'], ['Мансур', 'Мансур', 'Mansur'],
  ['Нұрулла', 'Нурулла', 'Nurulla'], ['Рахим', 'Рахим', 'Rakhim'], ['Шәріп', 'Шариф', 'Sharif'], ['Зиннат', 'Зиннат', 'Zinnat'],
]
const TT_F: N[] = [
  ['Фатима', 'Фатима', 'Fatima'], ['Зәйнәп', 'Зайнап', 'Zainap'], ['Мәрьям', 'Марьям', 'Maryam'], ['Сәлима', 'Салима', 'Salima'],
  ['Гайша', 'Гайша', 'Gaisha'], ['Хәдичә', 'Хадича', 'Khadicha'], ['Галия', 'Галия', 'Galiya'], ['Нәфисә', 'Нафиса', 'Nafisa'],
]
const UZ_M: N[] = [
  ['Әбдірахман', 'Абдурахман', 'Abdurakhman'], ['Каримжан', 'Каримжан', 'Karimjon'], ['Рашид', 'Рашид', 'Rashid'], ['Юсуп', 'Юсуп', 'Yusup'],
  ['Ахмаджан', 'Ахмаджан', 'Akhmadjon'], ['Нұриддин', 'Нуриддин', 'Nuriddin'], ['Тұрсын', 'Турсун', 'Tursun'], ['Хасан', 'Хасан', 'Khasan'],
]
const UZ_F: N[] = [
  ['Халима', 'Халима', 'Khalima'], ['Мұхаббат', 'Мухаббат', 'Mukhabbat'], ['Зұлфия', 'Зульфия', 'Zulfiya'], ['Насиба', 'Насиба', 'Nasiba'],
  ['Робия', 'Робия', 'Robiya'], ['Ойниса', 'Ойниса', 'Oinisa'], ['Хадича', 'Хадича', 'Khadicha'], ['Мастура', 'Мастура', 'Mastura'],
]
const UG_M: N[] = [
  ['Абдукерім', 'Абдукерим', 'Abdukerim'], ['Мәмет', 'Мамет', 'Mamet'], ['Розахун', 'Розахун', 'Rozakhun'], ['Турди', 'Турди', 'Turdi'],
  ['Ахметжан', 'Ахметжан', 'Akhmetzhan'], ['Жүсіп', 'Юсуп', 'Yusup'], ['Нұр', 'Нур', 'Nur'], ['Сабит', 'Сабит', 'Sabit'],
]
const UG_F: N[] = [
  ['Пәтимәм', 'Патимам', 'Patimam'], ['Пәтіма', 'Патима', 'Patima'], ['Аминә', 'Амина', 'Amina'], ['Ришат', 'Ришат', 'Rishat'],
  ['Зөһрә', 'Зухра', 'Zuhra'], ['Мәрия', 'Мария', 'Mariya'], ['Ханиза', 'Ханиза', 'Khaniza'], ['Аминәм', 'Аминам', 'Aminam'],
]
const KR_M: N[] = [
  ['Ким Сергей', 'Ким Сергей', 'Kim Sergei'], ['Пак Николай', 'Пак Николай', 'Pak Nikolai'], ['Ли Михаил', 'Ли Михаил', 'Li Mikhail'], ['Цой Василий', 'Цой Василий', 'Tsoi Vasily'],
  ['Хан Пётр', 'Хан Пётр', 'Khan Pyotr'], ['Тен Иван', 'Тен Иван', 'Ten Ivan'], ['Югай Алексей', 'Югай Алексей', 'Yugai Alexei'], ['Шин Григорий', 'Шин Григорий', 'Shin Grigory'],
]
const KR_F: N[] = [
  ['Ким Мария', 'Ким Мария', 'Kim Maria'], ['Пак Анна', 'Пак Анна', 'Pak Anna'], ['Ли Елена', 'Ли Елена', 'Li Yelena'], ['Цой Нина', 'Цой Нина', 'Tsoi Nina'],
  ['Хан Вера', 'Хан Вера', 'Khan Vera'], ['Тен Ольга', 'Тен Ольга', 'Ten Olga'], ['Югай Софья', 'Югай Софья', 'Yugai Sofya'], ['Шин Любовь', 'Шин Любовь', 'Shin Lyubov'],
]

const TABLE: Record<string, Record<Sex, N[]>> = {
  kazakh: { m: KZ_M, f: KZ_F },
  russian: { m: RU_M, f: RU_F },
  ukrainian: { m: UA_M, f: UA_F },
  german: { m: DE_M, f: DE_F },
  tatar: { m: TT_M, f: TT_F },
  uzbek: { m: UZ_M, f: UZ_F },
  uighur: { m: UG_M, f: UG_F },
  korean: { m: KR_M, f: KR_F },
  other: { m: RU_M, f: RU_F },
}

/** Returns a name id like "kazakh.m.4". */
/** Adds a name list for an era (key like 'kz18'). */
export function addNames(key: string, m: N[], f: N[]) {
  TABLE[key] = { m, f }
}
export type { N as NameTriple }

export function pickName(r: Rng, group: Group | string, sex: Sex): string {
  const list = TABLE[group][sex]
  return `${group}.${sex}.${r.int(0, list.length - 1)}`
}

export function nameOf(p: Pick<Person, 'name'>, lang: Lang): string {
  const [g, s, i] = p.name.split('.')
  const n = TABLE[g]?.[s as Sex]?.[Number(i)]
  if (!n) return p.name
  return n[lang === 'kz' ? 0 : lang === 'ru' ? 1 : 2]
}
