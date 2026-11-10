# Materials and lighting

Material appearance comes from geometry, environment, and light as well as shader values. Use `metalness`, `roughness`, `clearcoat`, `transmission`, `thickness`, `ior`, `emissive`, and `envMapIntensity` as controls, not realism switches.

- Brushed/satin metal needs directional highlights and moderated roughness; polished chrome needs credible reflections.
- Glass needs thickness, transmission/refraction choices, edge highlights, and a scene worth reflecting; tint alone reads as plastic.
- Ceramic uses low metalness and broad soft highlights; rubber uses high roughness with form-defining light.
- Leather, concrete, carbon fibre, wood, liquid, and holographic surfaces need appropriate texture/normal detail or deliberate stylization.

Start with a key, restrained fill/environment, and rim or separation light. Add lights only when they clarify form. Keep output color space and tone mapping deliberate, then confirm in captures.
