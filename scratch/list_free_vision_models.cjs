const fs = require('fs');
const data = JSON.parse(fs.readFileSync(__dirname + '/or_models.json', 'utf-8'));
const models = data.data || data.models || data;
const free = models.filter(m => m.id && m.id.endsWith(':free'));
console.log('Total models:', models.length, 'Free models:', free.length);
const freeVision = free.filter(m => {
  const mods = m.architecture?.input_modalities || [];
  return mods.includes('image');
});
console.log('Free + vision-capable:', freeVision.length);
freeVision.forEach(m => {
  console.log('---');
  console.log('id:', m.id);
  console.log('name:', m.name);
  console.log('context_length:', m.context_length);
  console.log('input_modalities:', m.architecture?.input_modalities);
});
