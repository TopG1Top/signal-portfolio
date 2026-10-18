import catalog from './countries.json' with {type:'json'};
export const countries = catalog;
export const countryName = (code: string, locale = 'de') => {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};
export type CountryReference = {
  code: string;
  basis: 'source_section' | 'headline_mention';
  evidence: string;
};
const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const extras: Record<string, string[]> = {
  CH: ['schweizer', 'schweizerischen', 'swiss'],
  DE: ['deutsche', 'deutschen', 'bundestag', 'bundesregierung'],
  AT: ['osterreichische', 'osterreichischen'],
  US: ['usa', 'united states', 'vereinigte staaten', 'us-'],
  GB: [
    'grossbritannien',
    'großbritannien',
    'britannien',
    'britische',
    'britischen',
    'united kingdom',
  ],
  FR: ['franzosische', 'franzosischen'],
  IT: ['italienische', 'italienischen'],
  RU: ['russische', 'russischen'],
  UA: ['ukrainische', 'ukrainischen'],
  CN: ['chinesische', 'chinesischen'],
  IL: ['israelische', 'israelischen'],
  PS: ['palastinensische', 'palastinensischen'],
  KR: ['sudkorea'],
  KP: ['nordkorea'],
};
const ambiguous = new Set(['georgia', 'jordan', 'chad', 'turkey']);
const words = (value: string) =>
  normalize(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
const patterns = countries.map((country) => ({
  code: country.code,
  aliases: [...country.aliases, ...(extras[country.code] ?? [])]
    .filter((alias) => alias !== 'us-')
    .map(words)
    .filter((alias) => alias.length >= 4 && !ambiguous.has(alias)),
}));
// Short country abbreviations are deliberately limited to these unambiguous news forms.
export function headlineCountries(title: string, sectionCountry?: string): CountryReference[] {
  const text = normalize(title),
    refs: CountryReference[] = [];
  const tokens = ' ' + words(title) + ' ';
  if (sectionCountry)
    refs.push({
      code: sectionCountry,
      basis: 'source_section',
      evidence: 'Country-specific domestic feed',
    });
  for (const country of patterns) {
    if (refs.some((ref) => ref.code === country.code)) continue;
    if (
      country.aliases.some((alias) => tokens.includes(' ' + alias + ' ')) ||
      (country.code === 'US' && /(?:^|[^\p{L}])(?:usa(?:[^\p{L}]|$)|us-)/u.test(text))
    )
      refs.push({ code: country.code, basis: 'headline_mention', evidence: title });
  }
  return refs.slice(0, 12);
}
export function countriesInBounds(bounds: number[]) {
  const [west, south, east, north] = bounds;
  return countries
    .filter((country) => {
      const [w, s, e, n] = country.bbox;
      return (
        n >= south && s <= north && (west <= east ? e >= west && w <= east : e >= west || w <= east)
      );
    })
    .map((country) => country.code);
}
