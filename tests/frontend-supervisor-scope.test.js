const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function storageStub() {
  const store = new Map();
  return {
    getItem(key) {
      return store.get(key) || null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

function nodeStub() {
  return {
    textContent: '',
    value: '',
    hidden: false,
    dataset: {},
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {},
    removeAttribute() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function loadFrontend() {
  const storage = storageStub();
  const context = vm.createContext({
    console,
    localStorage: storage,
    sessionStorage: storage,
    window: { location: { hash: '' } },
    document: {
      getElementById() {
        return nodeStub();
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      }
    }
  });

  ['storage.js', 'app.js'].forEach((file) => {
    vm.runInContext(
      fs.readFileSync(path.join(ROOT, 'frontend', file), 'utf8'),
      context,
      { filename: file }
    );
  });

  return context;
}

test('supervisor account with short login keeps its own scope visible', () => {
  const context = loadFrontend();
  const result = vm.runInContext(`
    const magda = state.supervisors.find((item) => normalizeKey(item.name).startsWith('magda'));
    const user = state.users.find((item) => item.role === 'supervisor' && normalizeKey(item.supervisorName).startsWith('magda'));
    state.users = state.users.map((item) =>
      item.id === user.id ? { ...item, name: 'Magda', login: 'magda', supervisorName: '' } : item
    );
    sessionStorage.setItem(ACTIVE_USER_KEY, user.id);
    JSON.stringify({
      supervisorNames: visibleSupervisors().map((item) => item.name),
      schoolCount: visibleSchools().length,
      expectedSchoolCount: magda.schools.length,
      canViewOwnRecord: canViewSupervisor(magda.name),
      canViewOtherRecord: canViewSupervisor('Adilson Manoel Fogaca')
    });
  `, context);
  const payload = JSON.parse(result);

  assert.deepEqual(payload.supervisorNames, ['Magda Gisele Silva Oliveira']);
  assert.equal(payload.schoolCount, payload.expectedSchoolCount);
  assert.equal(payload.canViewOwnRecord, true);
  assert.equal(payload.canViewOtherRecord, false);
});
