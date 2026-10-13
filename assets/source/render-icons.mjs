// Renders the Smriti icon set from SVG. Usage: node render.mjs <outDir>
// Source of the Smriti icon set. Render: npm i @resvg/resvg-js@2 (outside the project), then node render-icons.mjs <outDir>.
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
const CREAM = '#FFF8EE', GREEN = '#1E6B52', PETAL = '#F7C531', PETAL_EDGE = '#E2A614', CORE = '#E8892B', CORE_IN = '#F4A940';

const petals = (cx, cy, dist, rx, ry, fill, stroke) =>
  Array.from({ length: 8 }, (_, k) =>
    `<ellipse cx="${cx}" cy="${cy - dist}" rx="${rx}" ry="${ry}" transform="rotate(${k * 45} ${cx} ${cy})" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${rx * 0.12}"` : ''}/>`,
  ).join('');

/** Flower centred at (cx, cy) with overall radius r. */
const flower = (cx, cy, r, mono = false) => {
  if (mono) {
    // Alpha-only silhouette: petals with a transparent ring cut around a solid core.
    const id = `m${cx}${r}`;
    return (
      `<mask id="${id}"><rect x="0" y="0" width="${cx * 2}" height="${cy * 2}" fill="#fff"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r * 0.36}" fill="#000"/></mask>` +
      `<g mask="url(#${id})">${petals(cx, cy, r * 0.58, r * 0.27, r * 0.44, '#FFFFFF', null)}</g>` +
      `<circle cx="${cx}" cy="${cy}" r="${r * 0.26}" fill="#FFFFFF"/>`
    );
  }
  const core = `<circle cx="${cx}" cy="${cy}" r="${r * 0.36}" fill="${CORE}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="${CORE_IN}"/>`;
  return petals(cx, cy, r * 0.58, r * 0.27, r * 0.44, PETAL, PETAL_EDGE) + core;
};

const svg = (size, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}${body}</svg>`;

const render = (name, markup, width) => {
  const png = new Resvg(markup, { fitTo: { mode: 'width', value: width } }).render().asPng();
  writeFileSync(`${out}/${name}`, png);
  console.log(name, png.length, 'bytes');
};

const C = 512;
// Full icon (legacy launchers / stores): cream square, green disc, flower.
render('icon.png', svg(1024, `<circle cx="${C}" cy="${C}" r="430" fill="${GREEN}"/>${flower(C, C, 300)}`, CREAM), 1024);
// Adaptive icon: background layer (solid cream) + foreground inside the 66% safe zone.
render('android-icon-background.png', svg(1024, '', CREAM), 1024);
render('android-icon-foreground.png', svg(1024, `<circle cx="${C}" cy="${C}" r="300" fill="${GREEN}"/>${flower(C, C, 210)}`), 1024);
// Android 13+ themed icon: single-colour silhouette on transparent.
render('android-icon-monochrome.png', svg(1024, flower(C, C, 260, true)), 1024);
// Splash: disc + flower on transparent (splash background colour is cream).
render('splash-icon.png', svg(1024, `<circle cx="${C}" cy="${C}" r="440" fill="${GREEN}"/>${flower(C, C, 310)}`), 1024);
// Status-bar notification icon: white silhouette, transparent.
render('notification-icon.png', svg(96, flower(48, 48, 40, true)), 96);
render('favicon.png', svg(1024, `<circle cx="${C}" cy="${C}" r="480" fill="${GREEN}"/>${flower(C, C, 340)}`), 48);

