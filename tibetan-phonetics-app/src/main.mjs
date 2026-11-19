import {
  EXAMPLE_TEXT,
  PHONEMIC_SYSTEMS,
  convertInterlinear,
} from './interlinear.mjs';

const elInput = document.getElementById('tib-input');
const elSystem = document.getElementById('phonemic-system');
const elKeepPunct = document.getElementById('keep-punct');
const elBtnConvert = document.getElementById('btn-convert');
const elBtnExample = document.getElementById('btn-example');
const elBtnClear = document.getElementById('btn-clear');
const elOutputSection = document.getElementById('output-section');
const elPlainOutput = document.getElementById('plain-output');
const elInterlinearView = document.getElementById('interlinear-view');
const elBtnCopy = document.getElementById('btn-copy');
const elCopyStatus = document.getElementById('copy-status');
const elWarnSection = document.getElementById('warn-section');
const elWarnList = document.getElementById('warn-list');
const elViewStacked = document.getElementById('view-stacked');
const elViewInline = document.getElementById('view-inline');

for (const sys of PHONEMIC_SYSTEMS) {
  const opt = document.createElement('option');
  opt.value = sys.value;
  opt.textContent = sys.label;
  elSystem.appendChild(opt);
}
elSystem.value = 'lotsawahouse-en';

function renderInterlinearTokens(tokens) {
  elInterlinearView.replaceChildren();

  let currentLine = document.createElement('div');
  currentLine.className = 'interlinear-line';

  for (const token of tokens) {
    if (token.type === 'newline') {
      if (currentLine.childNodes.length > 0) {
        elInterlinearView.appendChild(currentLine);
      }
      currentLine = document.createElement('div');
      currentLine.className = 'interlinear-line';
      continue;
    }

    if (token.type === 'pair') {
      const pair = document.createElement('span');
      pair.className = 'word-pair';

      const tib = document.createElement('span');
      tib.className = 'word-tib';
      tib.textContent = token.tib;

      const pron = document.createElement('span');
      pron.className = 'word-pron';
      pron.textContent = token.pron;

      pair.append(tib, pron);
      currentLine.appendChild(pair);
    } else if (token.type === 'other') {
      const other = document.createElement('span');
      other.className = 'word-other';
      other.textContent = token.text;
      currentLine.appendChild(other);
    }
  }

  if (currentLine.childNodes.length > 0) {
    elInterlinearView.appendChild(currentLine);
  }
}

function runConvert() {
  const raw = elInput.value;
  if (!raw.trim()) {
    elOutputSection.hidden = true;
    elWarnSection.hidden = true;
    return;
  }

  const { tokens, plain, warnings } = convertInterlinear(raw, {
    system: elSystem.value,
    keepPunctuation: elKeepPunct.checked,
  });

  elPlainOutput.value = plain;
  renderInterlinearTokens(tokens);
  elOutputSection.hidden = false;
  elCopyStatus.textContent = '';

  elWarnList.replaceChildren();
  if (warnings.length > 0) {
    for (const w of warnings) {
      const li = document.createElement('li');
      li.textContent = w;
      elWarnList.appendChild(li);
    }
    elWarnSection.hidden = false;
  } else {
    elWarnSection.hidden = true;
  }
}

function setViewMode(mode) {
  if (mode === 'stacked') {
    elInterlinearView.classList.add('mode-stacked');
    elInterlinearView.classList.remove('mode-inline');
    elViewStacked.classList.add('active');
    elViewInline.classList.remove('active');
    elViewStacked.setAttribute('aria-pressed', 'true');
    elViewInline.setAttribute('aria-pressed', 'false');
  } else {
    elInterlinearView.classList.add('mode-inline');
    elInterlinearView.classList.remove('mode-stacked');
    elViewInline.classList.add('active');
    elViewStacked.classList.remove('active');
    elViewInline.setAttribute('aria-pressed', 'true');
    elViewStacked.setAttribute('aria-pressed', 'false');
  }
}

elBtnConvert.addEventListener('click', runConvert);
elSystem.addEventListener('change', () => {
  if (elInput.value.trim()) runConvert();
});
elKeepPunct.addEventListener('change', () => {
  if (elInput.value.trim()) runConvert();
});

elInput.addEventListener('keydown', (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
    ev.preventDefault();
    runConvert();
  }
});

elBtnExample.addEventListener('click', () => {
  elInput.value = EXAMPLE_TEXT;
  runConvert();
});

elBtnClear.addEventListener('click', () => {
  elInput.value = '';
  elPlainOutput.value = '';
  elInterlinearView.replaceChildren();
  elOutputSection.hidden = true;
  elWarnSection.hidden = true;
  elCopyStatus.textContent = '';
  elInput.focus();
});

elBtnCopy.addEventListener('click', async () => {
  if (!elPlainOutput.value) return;
  try {
    await navigator.clipboard.writeText(elPlainOutput.value);
    elCopyStatus.textContent = 'コピーしました / Copied!';
  } catch {
    elPlainOutput.select();
    document.execCommand('copy');
    elCopyStatus.textContent = 'コピーしました / Copied!';
  }
  setTimeout(() => {
    elCopyStatus.textContent = '';
  }, 2500);
});

elViewStacked.addEventListener('click', () => setViewMode('stacked'));
elViewInline.addEventListener('click', () => setViewMode('inline'));
