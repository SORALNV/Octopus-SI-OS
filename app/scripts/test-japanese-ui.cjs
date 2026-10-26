const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');
const appRoot = path.resolve(__dirname, '..');
function load(relative, mocks = {}) {
  const filename = path.join(appRoot, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} }, localRequire = createRequire(filename);
  Function('module', 'exports', 'require', code)(module, module.exports, (id) => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('.')) return load(path.relative(appRoot, path.resolve(path.dirname(filename), id + '.ts')));
    return localRequire(id);
  });
  return module.exports;
}
test('Japanese labels keep provider window identities, numbers, and caller text intact', () => {
  const usage = load('src/account/chatgptUsageModel.ts');
  const group = usage.accountUsageGroups({ rateLimitsByLimitId: null, rateLimits: {
    limitId: 'codex', limitName: 'My Plan', primary: { windowDurationMins: 300, usedPercent: 25, resetsAt: 123 }, secondary: null,
  } })[0];
  assert.equal(group.label, 'My Plan');
  assert.equal(group.windows[0].key, 'primary');
  assert.equal(group.windows[0].remaining, 75);
  assert.equal(group.windows[0].resetsAt, 123);
  assert.match(group.windows[0].label, /5.*時間/);
  assert.match(usage.accountRemainingLabel(75), /75%.*残り/);
  assert.match(usage.accountResetTime(123, 300), /リセット/);
});
test('Japanese command labels preserve Control shortcuts and browser file-drop identifiers', () => {
  const keyboard = load('src/keyboardShortcuts.ts');
  const event = { key: '`', code: 'Backquote', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, isComposing: false };
  assert.equal(keyboard.keyboardShortcutFromEvent(event), 'Control+Backquote');
  const drop = load('src/components/chat/attachmentDrop.ts', {
    '../../shell/clientWindowModel': { CLIENT_PANE_DRAG_MIME: 'application/x-octopus-pane' },
    './constants': { MAX_ATTACHMENT_BYTES: 1048576 },
  });
  assert.equal(drop.isAttachmentDrop({ types: ['Files'], items: [], files: [] }), true);
  assert.equal(drop.isAttachmentDrop({ types: ['application/x-octopus-pane', 'Files'], items: [], files: [] }), false);
});
test('Japanese settings search returns localized labels with the existing target ids', () => {
  const settings = load('src/components/settings/settingsCatalog.ts');
  const matches = settings.searchSettings('マイク', 'lab');
  assert.ok(matches.some(({ destination }) => destination.id === 'voice.microphone' && destination.label === 'マイク'));
  assert.ok(settings.SETTINGS_SECTIONS.some(({ id, label }) => id === 'general' && label === '一般'));
});
