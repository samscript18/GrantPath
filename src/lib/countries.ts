// ISO region identifiers are used for identity, not for citizenship eligibility policy.
// Provider country lists still have to be authored from that provider's evidence.
const codes =
  "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SX SG SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW XK".split(
    " ",
  );
const display = new Intl.DisplayNames(["en"], { type: "region" });
export const countryCodes = codes;
export function countryCode(input: string): string | undefined {
  const canonical = canonicalCountry(input);
  return canonical ? codes.find((code) => display.of(code) === canonical) : undefined;
}
export function countryName(code: string) {
  return codes.includes(code) ? display.of(code)! : undefined;
}
export const countryNames = codes
  .map((code) => display.of(code)!)
  .sort((a, b) => a.localeCompare(b));
const names = new Map<string, string>();
for (const code of codes) {
  const name = display.of(code)!;
  names.set(code.toLowerCase(), name);
  names.set(name.toLowerCase(), name);
}
for (const [alias, code] of Object.entries({
  uk: "GB",
  britain: "GB",
  usa: "US",
  "united states of america": "US",
  turkey: "TR",
  "the gambia": "GM",
  "south korea": "KR",
  "north korea": "KP",
  "hong kong": "HK",
  "hong kong sar": "HK",
  macau: "MO",
  "czech republic": "CZ",
  "ivory coast": "CI",
  "cape verde": "CV",
}))
  names.set(alias, display.of(code)!);
export function canonicalCountry(input: string) {
  return names.get(input.trim().toLowerCase());
}
