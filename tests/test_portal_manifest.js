const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'manifest.json');
const contentDir = path.join(rootDir, 'content');

console.log('===================================================');
console.log('  📕 Web Portal CI 自动化清单与静态内容检验');
console.log('===================================================');

if (!fs.existsSync(manifestPath)) {
  console.error('[X] 缺少 manifest.json');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const vocabLists = manifest.vocabLists || [];
console.log(`[i] manifest.json 记录词汇单元数: ${vocabLists.length}`);

let missing = 0;
vocabLists.forEach(item => {
  if (item.ready) {
    const fPath = path.join(rootDir, item.file);
    if (!fs.existsSync(fPath)) {
      console.error(`[X] 标记为 ready 但未找到文件: ${item.file}`);
      missing++;
    }
  }
});

if (missing > 0) {
  console.error(`[X] 共有 ${missing} 个内容文件缺失！`);
  process.exit(1);
}

console.log('✅ 全部已就绪单元对应 content HTML 100% 存在！测试通过！');
console.log('\n>>> 正在执行 PWA 设施合规性检验...');
const pwaManifestPath = path.join(rootDir, 'manifest.webmanifest');
const swPath = path.join(rootDir, 'sw.js');
const offlinePath = path.join(rootDir, 'offline.html');
const iconsDir = path.join(rootDir, 'icons');

if (!fs.existsSync(pwaManifestPath)) { console.error('[X] 缺少 manifest.webmanifest'); process.exit(1); }
if (!fs.existsSync(swPath)) { console.error('[X] 缺少 sw.js'); process.exit(1); }
if (!fs.existsSync(offlinePath)) { console.error('[X] 缺少 offline.html'); process.exit(1); }

['icon-192.png', 'icon-512.png', 'icon-maskable.png', 'apple-touch-icon.png'].forEach(ic => {
  const ip = path.join(iconsDir, ic);
  if (!fs.existsSync(ip) || fs.statSync(ip).size < 500) {
    console.error(`[X] 缺少有效 PWA 图标: ${ic}`);
    process.exit(1);
  }
});
console.log('✅ PWA manifest、Service Worker、离线页与全套图标 100% 合规！');

