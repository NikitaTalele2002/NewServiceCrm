const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

async function exists(p){
  try{ await fsp.access(p); return true; }catch{ return false; }
}

async function copyRecursive(src, dest){
  const stat = await fsp.stat(src);
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  if(stat.isDirectory()){
    await fsp.cp(src, dest, { recursive: true });
  } else {
    await fsp.copyFile(src, dest);
  }
}

async function move(src, dest){
  if(!await exists(src)){
    console.log(`[skip] not found: ${src}`);
    return;
  }
  if(await exists(dest)){
    console.log(`[skip] destination exists: ${dest}`);
    return;
  }
  await copyRecursive(src, dest);
  await fsp.rm(src, { recursive: true, force: true });
  console.log(`[moved] ${src} -> ${dest}`);
}

async function main(){
  const root = process.cwd();
  const clientDir = path.join(root, 'client');
  await fsp.mkdir(clientDir, { recursive: true });

  const frontendItems = [
    'index.html',
    'vite.config.js',
    'package.json',
    'eslint.config.js',
    'src',
    'public'
  ];

  for(const item of frontendItems){
    await move(path.join(root, item), path.join(clientDir, item));
  }

  const backendPath = path.join(root, 'backend');
  const serverPath = path.join(root, 'server');

  if(await exists(backendPath)){
    if(await exists(serverPath)){
      // merge contents
      const items = await fsp.readdir(backendPath);
      for(const it of items){
        await move(path.join(backendPath, it), path.join(serverPath, it));
      }
      try{ await fsp.rmdir(backendPath); }catch(e){}
      console.log('[merged] backend -> server');
    } else {
      // rename backend -> server
      await fsp.rename(backendPath, serverPath);
      console.log('[renamed] backend -> server');
    }
  } else {
    console.log('[skip] no backend directory found');
  }

  console.log('\nRefactor script finished. Please verify moved files and update imports/paths as needed.');
}

main().catch(err => { console.error(err); process.exit(1); });
