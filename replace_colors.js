const fs = require('fs');
const file = 'src/app/orders/create/CreateOrderClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace hex colors with tailwind classes
content = content.replace(/bg-\[\#b5000b\]/g, 'bg-primary');
content = content.replace(/text-\[\#b5000b\]/g, 'text-primary');
content = content.replace(/border-\[\#b5000b\]/g, 'border-primary');
content = content.replace(/ring-\[\#b5000b\]/g, 'ring-primary');
content = content.replace(/shadow-\[\#b5000b\]/g, 'shadow-primary');
content = content.replace(/hover:bg-\[\#b5000b\]/g, 'hover:bg-primary');
content = content.replace(/hover:text-\[\#b5000b\]/g, 'hover:text-primary');
content = content.replace(/hover:border-\[\#b5000b\]/g, 'hover:border-primary');

content = content.replace(/hover:bg-\[\#9a0009\]/g, 'hover:bg-primary-light');
content = content.replace(/hover:bg-primary\/90/g, 'hover:bg-primary-light');
content = content.replace(/hover:bg-primary\/95/g, 'hover:bg-primary-light');

fs.writeFileSync(file, content);
console.log('Replaced colors in CreateOrderClient.tsx');
