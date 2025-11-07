#!/usr/bin/env python3
"""
Generate PNG icons for Oddvision Chrome Extension
Requires: pip install Pillow
"""

from PIL import Image, ImageDraw
import os

# Create icons directory if it doesn't exist
os.makedirs('icons', exist_ok=True)

def create_gradient(width, height):
    """Create a gradient image"""
    image = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(image)
    
    # Define gradient colors (purple gradient)
    start_color = (102, 126, 234)  # #667eea
    end_color = (118, 75, 162)     # #764ba2
    
    for y in range(height):
        # Calculate interpolated color
        ratio = y / height
        r = int(start_color[0] * (1 - ratio) + end_color[0] * ratio)
        g = int(start_color[1] * (1 - ratio) + end_color[1] * ratio)
        b = int(start_color[2] * (1 - ratio) + end_color[2] * ratio)
        
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    return image

def draw_icon(size):
    """Draw an icon of the specified size"""
    # Create base with gradient
    image = create_gradient(size, size)
    draw = ImageDraw.Draw(image)
    
    # Calculate dimensions
    center_x, center_y = size // 2, size // 2
    circle_radius = int(size * 0.3)
    inner_radius = int(circle_radius * 0.4)
    line_width = max(2, int(size * 0.05))
    
    # Draw outer circle (crystal ball)
    draw.ellipse(
        [center_x - circle_radius, center_y - circle_radius,
         center_x + circle_radius, center_y + circle_radius],
        outline='white',
        width=line_width
    )
    
    # Draw inner filled circle (pupil/center)
    draw.ellipse(
        [center_x - inner_radius, center_y - inner_radius,
         center_x + inner_radius, center_y + inner_radius],
        fill='white'
    )
    
    # Draw sparkle/shine effect
    if size >= 32:
        sparkle_x = center_x + int(circle_radius * 0.6)
        sparkle_y = center_y - int(circle_radius * 0.6)
        sparkle_size = int(size * 0.1)
        
        # Horizontal line
        draw.line(
            [(sparkle_x - sparkle_size, sparkle_y),
             (sparkle_x + sparkle_size, sparkle_y)],
            fill='white',
            width=line_width
        )
        
        # Vertical line
        draw.line(
            [(sparkle_x, sparkle_y - sparkle_size),
             (sparkle_x, sparkle_y + sparkle_size)],
            fill='white',
            width=line_width
        )
    
    return image

# Generate all required sizes
sizes = [16, 32, 48, 128]

for size in sizes:
    icon = draw_icon(size)
    filename = f'icons/icon{size}.png'
    icon.save(filename, 'PNG')
    print(f'[OK] Generated {filename}')

print('\n[SUCCESS] All icons generated successfully!')
print('Icons saved to: ./icons/')

