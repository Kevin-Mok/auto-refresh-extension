import test from 'node:test';
import assert from 'node:assert/strict';
import { pageKey, parseInterval, cleanRules } from '../src/rules.js';

test('matches serialized pages including query and port, ignoring only fragments', () => {
  assert.equal(pageKey('https://EXAMPLE.com:443/a?q=1#x'), 'https://example.com/a?q=1');
  assert.notEqual(pageKey('https://example.com/a?q=1'), pageKey('https://example.com/a?q=2'));
  assert.notEqual(pageKey('http://example.com:8080/a'), pageKey('http://example.com/a'));
  for (const url of ['chrome://settings', 'file:///a', 'bad', 'https://chromewebstore.google.com/detail/a']) assert.equal(pageKey(url), null);
});
test('accepts 1/29/30/600 seconds and normalizes excess seconds', () => {
  for (const seconds of ['1', '29', '30', '600']) assert.equal(parseInterval('0', seconds), Number(seconds));
  assert.equal(parseInterval('10', '0'), 600);
  assert.equal(parseInterval('1', '61'), 121);
});
test('rejects empty, negative, fractional, zero and unrepresentable intervals', () => {
  for (const [m,s] of [['','1'], ['1',''], ['-1','1'], ['0','-1'], ['.5','0'], ['0','1.5'], ['0','0'], ['1e2','0'], ['0','2147483648'], ['99999999999999999999','0']]) assert.throws(() => parseInterval(m,s));
});
test('stored rules are validated rather than trusted', () => {
  assert.deepEqual(cleanRules({'https://example.com/a':600,'https://example.com/a#x':2,'http://a/':0,'http://b/':'30','chrome://settings':5}), {'https://example.com/a':600});
  for (const value of [null, [], 'bad']) assert.deepEqual(cleanRules(value), {});
});
