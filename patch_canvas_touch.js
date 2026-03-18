const fs = require('fs');
let file = 'client/src/ui/mobileControls.ts';
let content = fs.readFileSync(file, 'utf8');

// The touchstart event on canvas shouldn't always preventDefault, otherwise it blocks clicks on UI elements rendered over the canvas if they don't capture it first.
// Wait, the mobileControls buttons have e.stopPropagation() so they work.
// But what about other UI elements?
// Let's ensure canvas touch events only preventDefault if they are actually used for camera drag or pinch zoom.

const targetBlock = `    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();

      if (e.touches.length === 2) {`;

const newBlock = `    canvas.addEventListener("touchstart", (e) => {
      // Don't prevent default blindly, only if we take action.
      // e.preventDefault();

      if (e.touches.length === 2) {
        e.preventDefault();`;

content = content.replace(targetBlock, newBlock);

const targetBlock2 = `        if (!inJoystick && !inActions) {
          cameraTouchId = touch.identifier;
          lastCamX = touch.clientX;
          lastCamY = touch.clientY;
        }
      }
    }, { passive: false });`;

const newBlock2 = `        if (!inJoystick && !inActions) {
          e.preventDefault();
          cameraTouchId = touch.identifier;
          lastCamX = touch.clientX;
          lastCamY = touch.clientY;
        }
      }
    }, { passive: false });`;

content = content.replace(targetBlock2, newBlock2);

fs.writeFileSync(file, content);
