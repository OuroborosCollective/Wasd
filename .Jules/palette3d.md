## 2024-05-18 - Selective shadow casting on GLB load
**Learning:** Instead of enabling `castShadow` blindly on all meshes of a loaded GLB, which can be computationally expensive (especially for transparent or bounding meshes), it's crucial to inspect the mesh's material and name.
**Action:** Always filter meshes by material opacity (`transparent && opacity < 0.9`) and name (`name.indexOf('bound') === -1`) before enabling shadows on a parsed scene. This maintains visual fidelity while significantly improving the rendering pipeline's performance.
