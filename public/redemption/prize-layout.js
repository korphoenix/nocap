/* Cup rim top, base and horizontal centre on a 200-unit product canvas.
   The accompanying fruit and shot glass scale with the source image. */
const cupMeasurements = {
  'bomb-01-oligo-bomb': [38,150,95],
  'bomb-02-vitali-bomb': [44,151,96],
  'bomb-03-apple-sidra-bomb': [49,151,97],
  'bomb-04-tequila-bomb': [47,151,93],
  'bomb-05-jager-bomb': [49,151,95],
  'cup-clear': [36,158,100],
  'special-01-tomato-drama': [41,149,94],
  'special-02-yuzu-you-know': [28,163,95],
  'special-03-grape-escape': [46,150,95],
  'special-04-pineapple-express': [43,151,95],
  'special-05-peach-please': [44,150,94],
  'special-06-rhythm-boy': [47,150,97],
  'special-07-mr-bougie': [50,149,96],
  'special-08-social-overdose': [49,150,96]
};
const lightShadowPrizes = new Set(['cup-clear','special-02-yuzu-you-know','special-07-mr-bougie','bomb-01-oligo-bomb','bomb-02-vitali-bomb']);
function alignPrize(id, image) {
  const box = image.parentElement;
  box.classList.toggle('contact-shadow', lightShadowPrizes.has(id));
  const measure = cupMeasurements[id];
  if (!measure) return;
  const [rim, base, centre] = measure;
  const scale = 258 / (base - rim);
  image.style.width = image.style.height = (200 * scale) + 'px';
  image.style.left = (183.5 - centre * scale) + 'px';
  image.style.top = (308 - base * scale) + 'px';
}
