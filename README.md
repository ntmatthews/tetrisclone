# BlockCascade

A modern falling block puzzle game implemented using HTML5, CSS3, and JavaScript, with a Python version available as well.

## Features

- Innovative block shapes and gameplay mechanics
- Special blocks with unique properties that require strategy to clear
- Score tracking and level progression with increasing difficulty
- Responsive design that works on both desktop and mobile devices
- Touch controls for mobile gameplay
- Next shape preview
- Modern graphics with CSS styling

## Game Mechanics

BlockCascade introduces some unique gameplay elements:

- **Special Blocks**: Occasionally, darker blocks will appear with special properties:
  - They have limited rotations (only 2)
  - They require two matches to clear (first match removes special status)
  - They're visually distinct with a white circle in the center

- **Gravity Levels**: As you progress through levels, gravity increases, making blocks fall faster

- **Unique Shapes**: Non-traditional block shapes create new strategic possibilities

## How to Play

1. Click the "Start Game" button to begin
2. Use arrow keys to control the falling blocks:
   - Left/Right arrows: Move sideways
   - Down arrow: Soft drop (faster fall)
   - Up arrow: Rotate block
   - Spacebar: Hard drop (instant fall)
   - P key: Pause game

## Versions

### JavaScript Version
- Open `index.html` in a web browser to play
- Features touch controls for mobile devices
- Uses modern CSS and animations

### Python Version
- Requires Python and pygame library
- Run `python blockcascade.py` to play
- Features similar gameplay mechanics

## Technical Details

- Built with vanilla JavaScript (ES2023) and Python
- Rendering with HTML5 Canvas and pygame
- Modern CSS3 styling with Grid layout
- Responsive design using media queries
- Object-oriented programming approach