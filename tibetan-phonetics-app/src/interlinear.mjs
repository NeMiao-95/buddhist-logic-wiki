import { get_phonetics } from 'tibetan-ewts-converter';

export const PHONEMIC_SYSTEMS = [
  { value: 'lotsawahouse-en', label: 'LotsawaHouse Phonetics — English' },
  { value: 'lotsawahouse-fr', label: 'LotsawaHouse Phonetics — French' },
  { value: 'lotsawahouse-es', label: 'LotsawaHouse Phonetics — Spanish' },
  { value: 'lotsawahouse-de', label: 'LotsawaHouse Phonetics — German' },
  { value: 'rigpa-en', label: 'Rigpa Phonetics — English' },
  { value: 'rigpa-fr', label: 'Rigpa Phonetics — French' },
  { value: 'rigpa-es', label: 'Rigpa Phonetics — Spanish' },
  { value: 'rigpa-de', label: 'Rigpa Phonetics — German' },
  { value: 'padmakara-en', label: 'Padmakara EN — Int. Simplified Phonetics' },
  { value: 'padmakara-pt', label: 'Padmakara PT — Int. Simplified Phonetics' },
  { value: 'lhasey-en', label: 'Samye Translations (Lhasey)' },
  { value: 'thl', label: 'THL Simplified Phonemic Transcription' },
];

export const EXAMPLE_TEXT =
  'གཞན་ལ་ཡང་རང་གི་ཀུན་ནས་སློང་བར་བྱེད་པའི་སེམས་ཡང་དག་པར་མྱོང་བ་མེད་པས་འདྲ་ལ།';

export function parseSystemValue(systemValue = 'lotsawahouse-en') {
  const [style, lang] = String(systemValue).split('-');
  return lang ? { style, lang } : { style };
}

export function formatPlainInterlinear(tokens) {
  const lines = [];
  let current = [];

  for (const token of tokens) {
    if (token.type === 'newline') {
      lines.push(current.join(' '));
      current = [];
    } else if (token.type === 'pair') {
      if (token.tib && token.pron) {
        current.push(`${token.tib} ${token.pron}`);
      } else if (token.tib) {
        current.push(token.tib);
      } else if (token.pron) {
        current.push(token.pron);
      }
    } else if (token.type === 'other' && token.text) {
      current.push(token.text);
    }
  }

  lines.push(current.join(' '));
  return lines.join('\n').trim();
}

export function convertInterlinear(input, options = {}) {
  const {
    system = 'lotsawahouse-en',
    keepPunctuation = true,
  } = options;

  const trimmed = (input ?? '').trim().replace(/\r\n|\r|\n/g, '\n');
  if (!trimmed) {
    return { tokens: [], plain: '', warnings: [] };
  }

  const pho = get_phonetics(parseSystemValue(system));
  const [preparedStr, prepWarns] = pho._prepare_string(
    trimmed,
    undefined,
    undefined,
    true,
    undefined,
  );
  for (const w of prepWarns) pho._warn(w);

  const tokens = [];
  let i = 0;
  const len = preparedStr.length;
  let units = 0;
  let line = 1;

  while (i < len) {
    const ch = preparedStr.charAt(i);

    if (ch === '\n' || ch === '\r') {
      line++;
      i++;
      if (ch === '\r' && i < len && preparedStr.charAt(i) === '\n') {
        i++;
      }
      tokens.push({ type: 'newline' });
      continue;
    }

    if (
      ch === '@' ||
      ch === '\u0f0b' ||
      ch === '\u0f0c' ||
      ch === ' ' ||
      ch === '\t'
    ) {
      i++;
      continue;
    }

    if (!pho._wl.tib_top(ch)) {
      const start = i;
      while (i < len) {
        const c = preparedStr.charAt(i);
        if (
          pho._wl.tib_top(c) ||
          c === '\n' ||
          c === '\r' ||
          c === '@' ||
          c === '\u0f0b' ||
          c === '\u0f0c'
        ) {
          break;
        }
        i++;
      }
      const raw = preparedStr.slice(start, i).trim();
      if (raw && keepPunctuation) {
        tokens.push({ type: 'other', text: raw });
      }
      continue;
    }

    const tsekBars = [];
    while (i < len && pho._wl.tib_top(preparedStr.charAt(i))) {
      const tibStart = i;
      const {
        toks,
        wylie,
        warns: wlWarns,
        stacks,
      } = pho._wl._to_ewts_one_tsekbar(preparedStr, len, i);
      const tib = preparedStr.slice(tibStart, tibStart + toks);
      i += toks;
      units++;

      for (const w of wlWarns) pho._warn(`line ${line}: ${w}`);
      let hasTsek = false;
      if (preparedStr.charAt(i) === '\u0f0c') {
        hasTsek = true;
        i++;
      }
      tsekBars.push({ stacks, wylie, tib, hasTsek });
    }

    let j = 0;
    const oneUnitOut = [];
    while (j <= tsekBars.length - 1) {
      const grab = pho.smart_autosplit
        ? pho._find_word_smart(tsekBars, j).grab
        : pho._find_word(tsekBars, j).grab;

      const slice = tsekBars.slice(j, j + grab);
      j += grab;

      const { pron, warns: prWarns } = pho._pronounce_processed_word(slice);
      oneUnitOut.push([pron, grab]);

      for (const w of prWarns || []) pho._warn(`line ${line}: ${w}`);
    }

    if (oneUnitOut.length > 0) {
      pho.final_line_tweak(oneUnitOut);

      let cursor = 0;
      for (const [rawPron, grab] of oneUnitOut) {
        if (!grab || grab <= 0) continue;
        const wordBars = tsekBars.slice(cursor, cursor + grab);
        cursor += grab;

        const tibWord =
          wordBars.map((b) => b.tib).join('\u0f0b') +
          (wordBars[wordBars.length - 1]?.hasTsek ? '\u0f0b' : '');
        const cleanPron = (rawPron || '')
          .replace(/@(\w)/g, (_, c) => c.toUpperCase())
          .replace(/@/g, '')
          .trim();

        if (tibWord || cleanPron) {
          tokens.push({ type: 'pair', tib: tibWord, pron: cleanPron });
        }
      }
    }
  }

  if (!units) pho._warn('No Tibetan text found!');

  return {
    tokens,
    plain: formatPlainInterlinear(tokens),
    warnings: pho.get_warnings(),
  };
}
