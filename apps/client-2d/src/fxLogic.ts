import { Container, Graphics, Text } from "pixi.js";

type FxNode = Container | Graphics | Text;

type FxOptions = {
  x: number;
  y: number;
  text?: string;
};

function runFx(node: FxNode, tick: (deltaTime: number) => boolean) {
  let last = performance.now();
  let raf = 0;

  const frame = (now = performance.now()) => {
    const deltaTime = Math.min((now - last) / 16.67, 2);
    last = now;
    if (tick(deltaTime)) {
      raf = requestAnimationFrame(frame);
      return;
    }
    cancelAnimationFrame(raf);
    node.destroy({ children: true });
  };

  raf = requestAnimationFrame(frame);
}

export function spawnTouchRipple(layer: Container, options: FxOptions) {
  const ripple = new Graphics();
  ripple.x = options.x;
  ripple.y = options.y;
  ripple.circle(0, 0, 12);
  ripple.stroke({ width: 2, color: 0x9defff, alpha: 0.9 });
  ripple.alpha = 0.9;
  ripple.zIndex = options.y + 1;
  layer.addChild(ripple);

  runFx(ripple, (deltaTime) => {
    ripple.scale.set(ripple.scale.x + 0.055 * deltaTime);
    ripple.alpha -= 0.055 * deltaTime;
    return ripple.alpha > 0;
  });
}

export function spawnFloatingStatus(layer: Container, options: FxOptions) {
  const label = new Text({
    text: options.text ?? "!",
    style: { fontSize: 13, fill: 0xfff0cf, stroke: { color: 0x12040a, width: 3 }, fontFamily: "monospace" },
  });
  label.anchor.set(0.5, 1);
  label.x = options.x;
  label.y = options.y - 54;
  label.alpha = 0.95;
  label.zIndex = options.y + 80;
  layer.addChild(label);

  runFx(label, (deltaTime) => {
    label.y -= 0.7 * deltaTime;
    label.alpha -= 0.025 * deltaTime;
    return label.alpha > 0;
  });
}
