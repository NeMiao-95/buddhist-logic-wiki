import test from 'node:test';
import assert from 'node:assert/strict';
import { get_phonetics } from 'tibetan-ewts-converter';
import {
  EXAMPLE_TEXT,
  convertInterlinear,
  parseSystemValue,
} from '../src/interlinear.mjs';

test('converts example sentence into word-level inline Tibetan + phonetics pairs', () => {
  const result = convertInterlinear(EXAMPLE_TEXT, {
    system: 'lotsawahouse-en',
    keepPunctuation: true,
  });

  assert.equal(
    result.plain,
    'གཞན་ zhen ལ་ la ཡང་ yang རང་ rang གི་ gi ཀུན་ནས་ künné སློང་བར་ longwar བྱེད་པའི་ jepé སེམས་ sem ཡང་དག་པར་ yangdakpar མྱོང་བ་ nyongwa མེད་པས་ mepé འདྲ་ dra ལ la །',
  );
  assert.equal(result.warnings.length, 0);
});

test('supports stripping punctuation when keepPunctuation is false', () => {
  const result = convertInterlinear(EXAMPLE_TEXT, {
    system: 'lotsawahouse-en',
    keepPunctuation: false,
  });

  assert.equal(
    result.plain,
    'གཞན་ zhen ལ་ la ཡང་ yang རང་ rang གི་ gi ཀུན་ནས་ künné སློང་བར་ longwar བྱེད་པའི་ jepé སེམས་ sem ཡང་དག་པར་ yangdakpar མྱོང་བ་ nyongwa མེད་པས་ mepé འདྲ་ dra ལ la',
  );
});

test('matches standard ewts-js phonetics sequence across all systems', () => {
  const verse = 'སེམས་ཙམ་ལ་ནི་བརྟེན་ནས་སུ། །\nཕྱི་རོལ་དོན་མེད་པར་ནི་རྟོགས། །';
  for (const sys of [
    'lotsawahouse-en',
    'rigpa-en',
    'padmakara-en',
    'lhasey-en',
    'thl',
  ]) {
    const res = convertInterlinear(verse, { system: sys });
    const pho = get_phonetics(parseSystemValue(sys));
    const expectedPhonOnly = pho
      .phonetics(verse, { autosplit: true })
      .replace(/\s+/g, ' ')
      .trim();
    const actualPhonOnly = res.tokens
      .filter((t) => t.type === 'pair')
      .map((t) => t.pron)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    assert.equal(actualPhonOnly, expectedPhonOnly, `Mismatch for ${sys}`);
  }
});

test('supports Wylie/EWTS input and converts it to Tibetan Unicode + phonetics', () => {
  const res = convertInterlinear("sangs rgyas dang byang chub sems dpa'/", {
    system: 'lotsawahouse-en',
  });
  assert.equal(
    res.plain,
    'སངས་རྒྱས་ sangye དང་ dang བྱང་ཆུབ་ changchub སེམས་དཔའ sempa །',
  );
});
