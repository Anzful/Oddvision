// Node.js script to generate Oddvision icons
// Requires: npm install canvas

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');

  // Draw rounded rectangle background
  const radius = size * 0.2;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Draw a stylized "eye" or "vision" symbol
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.05;

  // Draw circle (crystal ball)
  const centerX = size / 2;
  const centerY = size / 2;
  const circleRadius = size * 0.3;

  ctx.beginPath();
  ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw inner circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, circleRadius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Draw sparkle
  const sparkleSize = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(centerX + circleRadius * 0.7, centerY - circleRadius * 0.7);
  ctx.lineTo(centerX + circleRadius * 0.7 + sparkleSize, centerY - circleRadius * 0.7);
  ctx.moveTo(centerX + circleRadius * 0.7 + sparkleSize/2, centerY - circleRadius * 0.7 - sparkleSize/2);
  ctx.lineTo(centerX + circleRadius * 0.7 + sparkleSize/2, centerY - circleRadius * 0.7 + sparkleSize/2);
  ctx.stroke();

  return canvas;
}

// Generate all icons
sizes.forEach(size => {
  const canvas = drawIcon(size);
  const buffer = canvas.toBuffer('image/png');
  const filename = path.join(iconsDir, `icon${size}.png`);
  
  fs.writeFileSync(filename, buffer);
  console.log(`✓ Generated icon${size}.png`);
});

console.log('\n🎉 All icons generated successfully!');
console.log('Icons saved to:', iconsDir);

