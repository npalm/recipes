export function buildPrompt({ instructions, preserve, style, variant = 1, count = 1 }) {
  const styles = {
    subtle: 'Apply a subtle photographic enhancement: gentle exposure, white balance, natural contrast and fine detail. Stay very close to the original.',
    editorial: 'Improve photographic lighting and tonal separation with a restrained culinary editorial finish. Keep the existing scene and composition.',
  };
  return [
    'Use the built-in image generation/editing tool to EDIT the attached base photograph. Do not generate a different dish.',
    'The first attached image is the ORIGINAL reference. The second, when present, is the BASE to edit. Preserve the original scene identity when editing the base.',
    styles[style] || styles.subtle,
    'Preserve the dish, all ingredients, their quantities, crockery, glasses, bottles, labels, readable lettering, props, background objects, camera angle, framing and aspect ratio. Do not remove, replace, invent, restyle or crop objects unless the user explicitly requests that particular change.',
    'Keep real textures and realistic colors. No artificial shine, no new garnish, no added text or watermark. Existing text and labels must stay intact.',
    preserve ? `Elements the user specifically wants preserved: ${preserve}` : '',
    `User's additional editing instructions (apply visual edits only): ${JSON.stringify(instructions || 'Improve the light and detail very subtly.')}`,
    count > 1 ? `This is variation ${variant} of ${count}. Make a small alternative in light or tone within the same constraints, not a new composition.` : '',
  ].filter(Boolean).join('\n\n');
}
