import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,rmSync,symlinkSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=new URL('../',import.meta.url).pathname;
const inputs=['manifest.json','popup.html','popup.css','src/background.js','src/engine.js','src/content.js','src/popup.js','src/rules.js',... [16,32,48,128].map(n=>`icons/refresh-${n}.png`)];
function fixture(t) {
  const dir=mkdtempSync(join(tmpdir(),'refresh-release-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  mkdirSync(join(dir,'scripts'));
  // The script is the missing behavior during the initial RED run.
  copyFileSync(join(root,'scripts/release.py'),join(dir,'scripts/release.py'));
  for(const name of inputs) {mkdirSync(dirname(join(dir,name)),{recursive:true});copyFileSync(join(root,name),join(dir,name));}
  for(const name of ['help.html','privacy.html'])writeFileSync(join(dir,name),'<link rel="stylesheet" href="public.css">');
  writeFileSync(join(dir,'public.css'),'body { color: black; }');
  return dir;
}
function run(dir,...args) { return spawnSync('python3',['scripts/release.py',...args,'--plain'],{cwd:dir,encoding:'utf8'}); }
function ok(result) {assert.equal(result.status,0,result.stderr);}
const zip='artifacts/auto-refresh-cache-1.0.0.zip';

test('package is deterministic, runtime-only, and extracts the validated files',t=>{
  const dir=fixture(t);
  writeFileSync(join(dir,'secret.txt'),'not for release');
  ok(run(dir,'package'));
  const before=readFileSync(join(dir,zip));
  ok(run(dir,'package'));
  assert.deepEqual(readFileSync(join(dir,zip)),before);
  const result=run(dir,'inspect',zip);ok(result);
  assert.match(result.stdout,/Validated 15/);
  assert.match(result.stdout,/SHA256: [a-f0-9]{64}/);
  assert.deepEqual(readFileSync(join(dir,'artifacts/auto-refresh-cache-1.0.0/manifest.json')),readFileSync(join(dir,'manifest.json')));
});

test('missing dynamic injection dependency and incorrect icon dimensions fail before output',t=>{
  const dir=fixture(t);
  unlinkSync(join(dir,'src/content.js'));
  let result=run(dir,'package');assert.equal(result.status,1);assert.match(result.stderr,/content.js/);
  copyFileSync(join(root,'src/content.js'),join(dir,'src/content.js'));
  copyFileSync(join(root,'icons/refresh-16.png'),join(dir,'icons/refresh-32.png'));
  result=run(dir,'package');assert.equal(result.status,1);assert.match(result.stderr,/32x32/);
});

test('archive traversal entries and source directory symlinks are rejected',t=>{
  const dir=fixture(t);ok(run(dir,'package'));
  const corrupt=spawnSync('python3',['-c',`import zipfile\nwith zipfile.ZipFile('${zip}', 'a') as z: z.writestr('../escape', 'no')`],{cwd:dir,encoding:'utf8'});assert.equal(corrupt.status,0);
  let result=run(dir,'inspect',zip);assert.equal(result.status,1);assert.match(result.stderr,/Unapproved archive entry/);
  const other=mkdtempSync(join(tmpdir(),'refresh-source-'));t.after(()=>rmSync(other,{recursive:true,force:true}));
  for(const n of [16,32,48,128])copyFileSync(join(root,`icons/refresh-${n}.png`),join(other,`refresh-${n}.png`));
  rmSync(join(dir,'icons'),{recursive:true});symlinkSync(other,join(dir,'icons'));
  result=run(dir,'package');assert.equal(result.status,1);assert.match(result.stderr,/symlink/i);
});

test('repeat packaging refuses to overwrite an altered installation folder',t=>{
  const dir=fixture(t);ok(run(dir,'package'));
  writeFileSync(join(dir,'artifacts/auto-refresh-cache-1.0.0/user.txt'),'preserve me');
  const result=run(dir,'package');assert.equal(result.status,1);
  assert.equal(readFileSync(join(dir,'artifacts/auto-refresh-cache-1.0.0/user.txt'),'utf8'),'preserve me');
});
