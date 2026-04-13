# Graphics APIs — Seed Reference

## Seed Config
subdomain: graphics
domain: gaming
tech_stacks: [opengl, vulkan, webgl, metal, directx, webgpu]
byte_type_default: article

## Topics to Seed

1. Graphics Pipeline — vertex processing, rasterization, fragment shading, output merger
2. Shaders — vertex shaders, fragment shaders, compute shaders, GLSL/HLSL/MSL/WGSL
3. OpenGL — core profile, VAOs, VBOs, texture units, modern OpenGL vs legacy
4. Vulkan — explicit API, command buffers, render passes, synchronization, why it's verbose
5. WebGL — OpenGL ES 2.0 in the browser, limitations, WebGL2 improvements
6. WebGPU — modern web graphics, compute shaders in browser, replacing WebGL
7. Metal — Apple's API, command encoders, resource heaps, iOS/macOS/visionOS
8. DirectX — D3D12, DXIL bytecode, Windows-native, Xbox development
9. Rendering Techniques — forward vs deferred rendering, PBR, shadow mapping
10. Textures & Materials — UV mapping, mipmaps, texture compression, PBR material workflow
11. Transformations — model/view/projection matrices, coordinate spaces, quaternions
12. Performance — draw call batching, GPU profiling, overdraw, fill rate
13. Compute Shaders — GPGPU, parallel computation, particle systems, physics on GPU
14. Anti-aliasing — MSAA, TAA, FXAA, trade-offs between quality and performance
15. Post-processing — bloom, depth of field, tone mapping, screen-space effects
16. Cross-platform — SPIR-V, shader transpilation, abstraction libraries (wgpu, bgfx)
17. Debugging Graphics — RenderDoc, Xcode GPU frame capture, NVIDIA Nsight
18. Choosing an API — OpenGL vs Vulkan vs WebGPU, when low-level control is worth it
