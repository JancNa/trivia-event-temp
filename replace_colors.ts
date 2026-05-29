import * as fs from 'fs';

let content = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

content = content.replace(/text-white pr-7/g, 'text-brand-light pr-7');
content = content.replace(/text-white text-\[11px\]/g, 'text-brand-light text-[11px]');
content = content.replace(/text-white flex items-center gap-2/g, 'text-brand-light flex items-center gap-2');
content = content.replace(/text-white flex items-center justify-center/g, 'text-brand-light flex items-center justify-center');
content = content.replace(/text-white uppercase/g, 'text-brand-light uppercase');
content = content.replace(/text-white truncate/g, 'text-brand-light truncate');
content = content.replace(/text-sm text-white/g, 'text-sm text-brand-light');
content = content.replace(/text-xs mt-1/g, 'text-xs mt-1');
content = content.replace(/text-white text-xs mt-1/g, 'text-brand-light text-xs mt-1');
content = content.replace(/text-white/g, (match, offset, str) => {
  const context = str.substring(Math.max(0, offset - 50), offset + 50);
  if (context.includes('emerald-600') || context.includes('neutral-600') || context.includes('amber-600') || context.includes('red-650') || context.includes('hover:text-white') || context.includes('bg-red-950') || context.includes('text-brand-light')) {
    return 'text-white';
  }
  return 'text-brand-light';
});

fs.writeFileSync('src/components/AdminView.tsx', content);

// Also do AdminLogin
let loginContent = fs.readFileSync('src/components/AdminLogin.tsx', 'utf8');
loginContent = loginContent.replace(/text-white/g, 'text-brand-light');
fs.writeFileSync('src/components/AdminLogin.tsx', loginContent);

// And PlayView just in case
let playContent = fs.readFileSync('src/components/PlayView.tsx', 'utf8');
playContent = playContent.replace(/text-white/g, (match, offset, str) => {
  const context = str.substring(Math.max(0, offset - 50), offset + 50);
  if (context.includes('bg-red-500') || context.includes('bg-emerald-500')) return 'text-white';
  return 'text-brand-light';
});
fs.writeFileSync('src/components/PlayView.tsx', playContent);
