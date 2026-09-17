# Debate UI v2

- Card sprite: `public/art/debate/tactic-card-v2.png` (1024 × 1536 RGBA).
- Generated with the built-in imagegen tool, then alpha extraction with the same tool. The PNG is consumed directly by `CardDebateHud`.
- Existing art reused: duel portrait medallions, `wheel-confirm-button-v1`, debate card/resource atlases, and the skill particle atlas.
- Vitals share the duel CSS (`dx-fighter`, top `.8cqw`); verbose explanations are in native hover titles and the rules dialog.
- Decisions are untimed; seven particle emitters derive exclusively from simulation time so pause and replay remain deterministic.

## Generation prompt

Use case: stylized-concept. Production game UI asset: ONE empty upright Chinese Three Kingdoms debate tactic card, 2:3 portrait proportion, centered and occupying 94% of canvas. Actual transparent background outside its silhouette. Hand-painted richly detailed 2D fantasy mobile strategy game item art, warm aged ivory silk center framed by carved dark rosewood, ornate sculpted antique gold bronze corners shaped like clouds, small jade clasps, subtle brush and bamboo relief at bottom, layered beveled edges, painterly highlights and shadows. Elegant luxurious tactile physical tablet, not a web UI rectangle. The central 70% of the card must be blank light parchment to overlay a large existing colorful skill icon. A small blank darker gold name plaque along bottom. Straight front view, no perspective, no text, no letters, no numbers, no symbols in center, no watermark, no external cast shadow. Preserve transparent exterior. Deliver one clean card sprite only.

## Alpha edit prompt

Edit target: this game card. Keep the exact card artwork, size, framing, colors and all ornament details unchanged. Remove ONLY the brown/green blurred background outside the physical card silhouette, including between the hanging tassels and main frame. Replace outside pixels with actual fully transparent alpha, not a checkerboard or colored backdrop. All parchment INSIDE the card remains opaque. This is a production transparent PNG sprite.
