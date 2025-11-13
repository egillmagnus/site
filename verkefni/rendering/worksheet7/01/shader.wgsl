const EPS_DIV : f32 = 0.00000001;
const EPS_PARALLEL : f32 = 0.000001;
const EPS_RAY : f32 = 0.001;

fn tea(val0: u32, val1: u32) -> u32 {
    const N = 16u;
    var v0 = val0; var v1 = val1; var s0 = 0u;
    for (var n = 0u; n < N; n = n + 1u) {
        s0 += 0x9e3779b9u;
        v0 += ((v1 << 4u) + 0xa341316cu) ^ (v1 + s0) ^ ((v1 >> 5u) + 0xc8013ea4u);
        v1 += ((v0 << 4u) + 0xad90777du) ^ (v0 + s0) ^ ((v0 >> 5u) + 0x7e95761eu);
    }
    return v0;
}

fn mcg31(prev: ptr<function, u32>) -> u32 {
    const A = 1977654935u;              // Tang 2007
    *prev = (A * (*prev)) & 0x7fffffffu; // mod 2^31
    return *prev;
}

fn rnd(prev: ptr<function, u32>) -> f32 {
    return f32(mcg31(prev)) / f32(0x80000000u); // [0,1)
}

struct VSOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) img: vec2<f32>,
};

@vertex
fn vsMain(@builtin(vertex_index) vid: u32) -> VSOut {
    var corners = array<vec2<f32>, 4>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(1.0, 1.0)
    );
    var out: VSOut;
    let p = corners[vid];
    out.pos = vec4<f32>(p, 0.0, 1.0);
    out.img = p;
    return out;
}

struct Camera {
    eye: vec4<f32>,
    U: vec4<f32>,
    V: vec4<f32>,
    W: vec4<f32>,
    aspect: f32,
    zoom: f32,
    gamma: f32,
    _pad0: f32,
    addrMode: u32,
    filterMode: u32,
    _pad1: u32,
    _pad2: u32,
};

struct Jitters {
    data: array<vec2<f32>>
};

struct AttribBuf {
    data: array<vec4<f32>>  // Interleaved: [pos.xyz, pos.w, norm.xyz, norm.w]
};

struct IndexBuf {
    data: array<u32>  // 4 per triangle: [i0, i1, i2, matIdx]
};

struct MeshInfo {
    faceCount: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
};

struct MaterialData {
    color: vec4<f32>,
    emission: vec4<f32>,
};

struct MaterialsBuf {
    data: array<MaterialData>
};

struct LightIndexBuf {
    data: array<u32>
};

struct LightInfo {
    lightCount: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
};

struct Aabb {
    min: vec4<f32>,
    max: vec4<f32>,
};

struct TreeIdsBuf {
    data: array<u32>
};

struct BspTreeBuf {
    data: array<vec4<u32>>  // [data, id, left_child, right_child]
};

struct BspPlanesBuf {
    data: array<f32>
};

struct SpheresUBO {
    c0: vec4<f32>,     // xyz,r
    c1: vec4<f32>,     // xyz,r
    p0: vec4<f32>,     // x=type (1 mirror), y=ior, z,w unused
    p1: vec4<f32>,     // x=type (2 glass),  y=ior, z,w unused
};

@group(0) @binding(0) var<uniform> cam : Camera;
@group(0) @binding(1) var<storage, read> ATTRIB : AttribBuf;  // Interleaved pos+norm
@group(0) @binding(2) var<storage, read> IND : IndexBuf;      // Includes mat index
@group(0) @binding(3) var<storage, read> MATERIALS : MaterialsBuf;
@group(0) @binding(4) var<storage, read> LIGHT_IDX : LightIndexBuf;
@group(0) @binding(5) var<uniform> LIGHT_INFO : LightInfo;
@group(0) @binding(6) var<uniform> aabb : Aabb;
@group(0) @binding(7) var<storage, read> TREE_IDS : TreeIdsBuf;
@group(0) @binding(8) var<storage, read> BSP_TREE : BspTreeBuf;
@group(0) @binding(9) var<storage, read> BSP_PLANES : BspPlanesBuf;
@group(0) @binding(10) var<uniform> SPH : SpheresUBO;
@group(0) @binding(11) var renderTexture : texture_2d<f32>;


struct Ray {
    origin: vec3<f32>,
    dir: vec3<f32>,
    tmin: f32,
    tmax: f32,
};

struct Light {
    Li: vec3<f32>,
    wi: vec3<f32>,
    dist: f32,
};

struct Material {
    emission: vec3<f32>,
    diffuse: vec3<f32>,
    specular: vec3<f32>,
    shininess: f32,
    ior: f32,
};

struct HitInfo {
    hit: bool,
    t: f32,
    n: vec3<f32>,
    mat: Material,
    shaderId: u32,
    _padH: u32,
    relEta: f32,
    uv: vec2<f32>,
    _padUV: vec2<f32>,
};

fn makeMaterial(emission: vec3<f32>, diffuse: vec3<f32>, spec_rgb: vec3<f32>, shininess: f32, ior: f32) -> Material {
    return Material(emission, diffuse, spec_rgb, shininess, ior);
}

fn missMat() -> Material {
    return makeMaterial(vec3<f32>(0.0), vec3<f32>(0.0), vec3<f32>(0.0), 1.0, 1.0);
}

fn missHit(tmax: f32) -> HitInfo {
    return HitInfo(false, tmax, vec3<f32>(0.0), missMat(), 0u, 0u, 1.0, vec2<f32>(0.0), vec2<f32>(0.0));
}

fn okHit(t: f32, n: vec3<f32>, mat: Material, shaderId: u32, uv: vec2<f32>) -> HitInfo {
    return HitInfo(true, t, normalize(n), mat, shaderId, 0u, 1.0, uv, vec2<f32>(0.0));
}

fn addRelEta(h: HitInfo, rel: f32) -> HitInfo {
    return HitInfo(h.hit, h.t, h.n, h.mat, h.shaderId, h._padH, rel, h.uv, h._padUV);
}

fn computeRelEta(h: HitInfo, ray: Ray, curEta: f32) -> f32 {
    if dot(h.n, ray.dir) < 0.0 { return curEta / h.mat.ior; }
    return curEta / 1.0;
}

// AABB intersection test
fn intersectAabb(ray: Ray) -> bool {
    var tmin = ray.tmin;
    var tmax = ray.tmax;

    let p1 = (aabb.min.xyz - ray.origin) / ray.dir;
    let p2 = (aabb.max.xyz - ray.origin) / ray.dir;
    let pmin = min(p1, p2);
    let pmax = max(p1, p2);

    // Bias like the slides (avoid grazing artifacts on the box)
    let box_tmin = max(pmin.x, max(pmin.y, pmin.z)) - 1.0e-3;
    let box_tmax = min(pmax.x, min(pmax.y, pmax.z)) + 1.0e-3;

    if box_tmin > box_tmax || box_tmin > tmax || box_tmax < tmin {
        return false;
    }
    // Caller will clamp ray.tmin/tmax after this returns true
    return true;
}


fn intersectSphere(ray: Ray, center: vec3<f32>, radius: f32, typeFlag: u32, ior: f32) -> HitInfo {
    let oc = ray.origin - center;
    let b = dot(oc, ray.dir);
    let c = dot(oc, oc) - radius * radius;
    let disc = b * b - c;
    if disc < 0.0 { return missHit(ray.tmax); }

    let s = sqrt(max(disc, 0.0));
    var t = -b - s;
    if t <= ray.tmin || t >= ray.tmax {
        t = -b + s;
        if t <= ray.tmin || t >= ray.tmax { return missHit(ray.tmax); }
    }

    let P = ray.origin + t * ray.dir;
    var N = normalize(P - center);
    // Return material via shaderId:
    // 1u = perfect mirror, 2u = glass
    // Diffuse = 0; Emission = 0. Use ior for glass.
    let mat = makeMaterial(vec3<f32>(0.0), vec3<f32>(0.0), vec3<f32>(0.0), 1.0, max(ior, 1.0));
    return okHit(t, N, mat, typeFlag, vec2<f32>(0.0));
}

fn intersectTriangleFace(ray: Ray, faceIdx: u32) -> HitInfo {
    let base = 4u * faceIdx;
    let i0 = IND.data[base + 0u];
    let i1 = IND.data[base + 1u];
    let i2 = IND.data[base + 2u];
    let matIdx = IND.data[base + 3u];  // Material index from 4th component

    // Each vertex is 2 vec4s: [pos, norm]
    let v0 = ATTRIB.data[i0 * 2u + 0u].xyz;
    let v1 = ATTRIB.data[i1 * 2u + 0u].xyz;
    let v2 = ATTRIB.data[i2 * 2u + 0u].xyz;

    let e0 = v1 - v0;
    let e1 = v2 - v0;
    let n = cross(e0, e1);

    var q = dot(ray.dir, n);
    if abs(q) < EPS_DIV { return missHit(ray.tmax); }
    q = 1.0 / q;

    let o_to_v0 = v0 - ray.origin;
    let t = dot(o_to_v0, n) * q;
    if t <= ray.tmin || t >= ray.tmax { return missHit(ray.tmax); }

    let n_tmp = cross(o_to_v0, ray.dir);
    let beta = dot(n_tmp, e1) * q;
    if beta < 0.0 { return missHit(ray.tmax); }

    let gamma = -dot(n_tmp, e0) * q;
    if gamma < 0.0 || beta + gamma > 1.0 { return missHit(ray.tmax); }

    // Interpolate vertex normals
    let alpha = 1.0 - beta - gamma;
    let n0 = ATTRIB.data[i0 * 2u + 1u].xyz;
    let n1 = ATTRIB.data[i1 * 2u + 1u].xyz;
    let n2 = ATTRIB.data[i2 * 2u + 1u].xyz;
    let interpolated_normal = normalize(alpha * n0 + beta * n1 + gamma * n2);

    let matData = MATERIALS.data[matIdx];
    let mat = makeMaterial(matData.emission.rgb, matData.color.rgb, vec3<f32>(0.0), 1.0, 1.0);

    return okHit(t, interpolated_normal, mat, 0u, vec2<f32>(beta, gamma));
}

const MAX_LEVEL : u32 = 20u;
const BSP_LEAF : u32 = 3u;

fn intersect_scene_bsp(ray_in: Ray) -> HitInfo {
    var r = ray_in;

    // Early out: if the ray does not touch the scene box
    if !intersectAabb(r) {
        return missHit(r.tmax);
    }

    var hit = missHit(r.tmax);

    // --- Traversal state (slides style) ---
    const MAX_LEVEL: u32 = 20u;
    const BSP_LEAF: u32 = 3u;

    var branch_node: array<vec2<u32>, MAX_LEVEL>;
    var branch_ray: array<vec2<f32>, MAX_LEVEL>;
    var branch_lvl = 0u;

    var node = 0u;
    var t = 0.0;

    // --- Main traversal loop ---
    for (var i = 0u; i <= MAX_LEVEL; i = i + 1u) {
        let tree_node = BSP_TREE.data[node];
        let node_axis_leaf = tree_node.x & 3u;

        if node_axis_leaf == BSP_LEAF {
            // Leaf: test contained triangles, shrink interval on better hit
            let node_count = tree_node.x >> 2u;
            let node_id = tree_node.y;

            for (var j = 0u; j < node_count; j = j + 1u) {
                let tri_idx = TREE_IDS.data[node_id + j];
                let h = intersectTriangleFace(r, tri_idx);
                if h.hit && h.t < hit.t {
                    hit = h;
                    r.tmax = h.t;
                }
            }

            // Do not return early; finish traversal (pop or break if stack empty)
            if branch_lvl == 0u {
                break;
            } else {
                branch_lvl = branch_lvl - 1u;
                i = branch_node[branch_lvl].x;
                node = branch_node[branch_lvl].y;
                r.tmin = branch_ray[branch_lvl].x;
                r.tmax = branch_ray[branch_lvl].y;
                if hit.hit { r.tmax = min(r.tmax, hit.t); }
                continue;
            }
        }

        // Internal node
        let axis_dir = r.dir[node_axis_leaf];
        let axis_org = r.origin[node_axis_leaf];

        var near_node: u32;
        var far_node: u32;
        if axis_dir >= 0.0 {
            near_node = tree_node.z;  // left
            far_node = tree_node.w;  // right
        } else {
            near_node = tree_node.w;  // right
            far_node = tree_node.z;  // left
        }

        // Slides version: plane array indexed by node
        let node_plane = BSP_PLANES.data[node];
        let denom = select(axis_dir, 1.0e-8, abs(axis_dir) < 1.0e-8);
        t = (node_plane - axis_org) / denom;

        if t > r.tmax {
            node = near_node;
        } else if t < r.tmin {
            node = far_node;
        } else {
            // Visit near first, defer far with its own interval
            branch_node[branch_lvl].x = i;
            branch_node[branch_lvl].y = far_node;
            branch_ray[branch_lvl].x = max(t, r.tmin);
            branch_ray[branch_lvl].y = r.tmax;
            branch_lvl = branch_lvl + 1u;

            r.tmax = min(t, r.tmax);
            node = near_node;
        }
    }

    // --- Also test the two analytic spheres and return the closest overall ---
    var bestHit = hit;

    // Left mirror sphere (type=1)
    let s0_type = u32(SPH.p0.x);
    let s0_ior = SPH.p0.y;
    let h0 = intersectSphere(ray_in, SPH.c0.xyz, SPH.c0.w, s0_type, s0_ior);
    if h0.hit && h0.t < bestHit.t { bestHit = h0; }

    // Right glass sphere (type=2)
    let s1_type = u32(SPH.p1.x);
    let s1_ior = SPH.p1.y;
    let h1 = intersectSphere(ray_in, SPH.c1.xyz, SPH.c1.w, s1_type, s1_ior);
    if h1.hit && h1.t < bestHit.t { bestHit = h1; }

    return bestHit;
}




fn occluded_from(P: vec3<f32>, wi: vec3<f32>, maxDist: f32) -> bool {
    let eps = EPS_RAY;
    let ray = Ray(P + eps * wi, wi, eps, maxDist - eps);
    let h = intersect_scene_bsp(ray);
    if !h.hit { return false; }
    if any(h.mat.emission > vec3<f32>(0.0)) { return false; }
    return true;
}

fn background(dir: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(0.1, 0.3, 0.6);
}

fn sampleAreaLight(P: vec3<f32>, N: vec3<f32>) -> Light {
    if LIGHT_INFO.lightCount == 0u {
        return Light(vec3<f32>(0.0), vec3<f32>(0.0, 1.0, 0.0), 1e30);
    }

    var lightCenter = vec3<f32>(0.0);
    var vertexCount = 0.0;

    for (var i = 0u; i < LIGHT_INFO.lightCount; i = i + 1u) {
        let faceIdx = LIGHT_IDX.data[i];
        let base = 4u * faceIdx;
        let i0 = IND.data[base + 0u];
        let i1 = IND.data[base + 1u];
        let i2 = IND.data[base + 2u];

        lightCenter += ATTRIB.data[i0 * 2u + 0u].xyz;
        lightCenter += ATTRIB.data[i1 * 2u + 0u].xyz;
        lightCenter += ATTRIB.data[i2 * 2u + 0u].xyz;
        vertexCount += 3.0;
    }
    lightCenter = lightCenter / vertexCount;

    let L = lightCenter - P;
    let dist = length(L);
    let wi = L / max(dist, EPS_DIV);

    var Ie = vec3<f32>(0.0);

    for (var i = 0u; i < LIGHT_INFO.lightCount; i = i + 1u) {
        let faceIdx = LIGHT_IDX.data[i];
        let base = 4u * faceIdx;
        let i0 = IND.data[base + 0u];
        let i1 = IND.data[base + 1u];
        let i2 = IND.data[base + 2u];
        let matIdx = IND.data[base + 3u];

        let v0 = ATTRIB.data[i0 * 2u + 0u].xyz;
        let v1 = ATTRIB.data[i1 * 2u + 0u].xyz;
        let v2 = ATTRIB.data[i2 * 2u + 0u].xyz;

        let e0 = v1 - v0;
        let e1 = v2 - v0;
        let cross_e = cross(e0, e1);
        let area = length(cross_e) * 0.5;

        if area < EPS_DIV { continue; }

        let ne = normalize(cross_e);
        let matData = MATERIALS.data[matIdx];
        let Le = matData.emission.rgb;

        let cosTheta = max(0.0, -dot(wi, ne));
        Ie += cosTheta * Le * area;
    }

    let Li = Ie / max(dist * dist, EPS_DIV);
    return Light(Li, wi, dist);
}

fn shade_once(ray: Ray, hit: HitInfo) -> vec3<f32> {
    var N = hit.n;
    if dot(N, ray.dir) > 0.0 { N = -N; }

    let P = ray.origin + hit.t * ray.dir;
    let L = sampleAreaLight(P, N);

    if occluded_from(P, L.wi, L.dist) {
        return hit.mat.emission;
    }

    let PI = 3.1415926535;
    let fr = hit.mat.diffuse / PI;
    let cosTheta = max(0.0, dot(N, L.wi));
    let Lo = hit.mat.emission + fr * L.Li * cosTheta;

    return Lo;
}

const MAX_BOUNCES : i32 = 4;

fn trace(ray0: Ray) -> vec3<f32> {
    var ray = ray0;
    var eta: f32 = 1.0;
    var acc = vec3<f32>(0.0);

    for (var depth: i32 = 0; depth < MAX_BOUNCES; depth = depth + 1) {
        let h = intersect_scene_bsp(ray);
        if !h.hit { return background(ray.dir); }

        let hRel = addRelEta(h, computeRelEta(h, ray, eta));
        let c = shade_once(ray, hRel);

        // Perfect mirror
        if hRel.shaderId == 1u {
            acc += c; // (usually 0; keeps same structure)
            let P = ray.origin + hRel.t * ray.dir;
            var N = hRel.n;
            if dot(N, ray.dir) > 0.0 { N = -N; }
            let R = normalize(reflect(ray.dir, N));
            let eps = EPS_RAY;
            ray = Ray(P + eps * R, R, eps, 1e30);
            continue;
        }

        // Glass
        if hRel.shaderId == 2u {
            acc += c; // (usually 0; spheres have no emission/diffuse)
            let P = ray.origin + hRel.t * ray.dir;
            var N = hRel.n;
            var entering = true;
            if dot(N, ray.dir) > 0.0 { N = -N; entering = false; }

            let rel = hRel.relEta;
            let cosi = -dot(N, ray.dir);
            let k = 1.0 - rel * rel * (1.0 - cosi * cosi);

            if k < 0.0 {
                let R = normalize(reflect(ray.dir, N));
                let eps = EPS_RAY;
                ray = Ray(P + eps * R, R, eps, 1e30);
            } else {
                let T = normalize(rel * ray.dir + (rel * cosi - sqrt(k)) * N);
                let eps = EPS_RAY;
                ray = Ray(P + eps * T, T, eps, 1e30);
                // Update eta for subsequent hits
                if entering { eta = hRel.mat.ior; } else { eta = 1.0; }
            }
            continue;
        }

        return acc + c;
    }
    return vec3<f32>(0.0);
}
struct FSOut {
    @location(0) frame: vec4<f32>,  // gamma-corrected for the screen
    @location(1) accum: vec4<f32>,  // linear accumulated color (rgba32float)
};
@fragment
fn fsMain(@location(0) img: vec2<f32>, @builtin(position) fragcoord: vec4<f32>) -> FSOut {
    // Pull needed uniforms from Camera:
    // cam._pad0 = invW (already used)
    // cam.aspect used as usual
    // u32(cam.addrMode)  = width
    // u32(cam.filterMode)= height
    // u32(cam._pad1)     = frame number (0-based)
    // u32(cam._pad2)     = jitter count per frame (subdiv*subdiv)
    let width: u32 = cam.addrMode;
    let height: u32 = cam.filterMode;
    let frame: u32 = cam._pad1;
    let N: u32 = cam._pad2;

    // Seed PRNG uniquely per pixel + frame
    let pixId = u32(fragcoord.y) * width + u32(fragcoord.x);
    var seed = tea(pixId, frame);

    // Subpixel jitter (one random sample per frame)
    let invW = cam._pad0;
    let invH = invW * cam.aspect;
    let dpx = 2.0 * invW;
    let dpy = 2.0 * invH;

    let jx = rnd(&seed) - 0.5;
    let jy = rnd(&seed) - 0.5;
    let img_j = img + vec2<f32>(jx * dpx, jy * dpy);

    // Primary ray with jitter
    let center = cam.eye.xyz + cam.zoom * cam.W.xyz;
    let Pimg = center + img_j.x * cam.U.xyz + (img_j.y / cam.aspect) * cam.V.xyz;
    let dir = normalize(Pimg - cam.eye.xyz);
    let sampleRGB = trace(Ray(cam.eye.xyz, dir, EPS_RAY, 1e30));

    // Progressive average: accum = (prevSum + new) / (frame+1)
    // prevSum = prevAccum * frame
    let prevAccum = textureLoad(renderTexture, vec2<u32>(fragcoord.xy), 0).rgb;
    let prevSum = prevAccum * f32(frame);
    let accumRGB = (prevSum + sampleRGB) / f32(frame + 1u);

    // Output: screen (gamma) + stored linear accumulation
    let outRGB = pow(max(accumRGB, vec3<f32>(0.0)), vec3<f32>(1.0 / cam.gamma));

    var out: FSOut;
    out.frame = vec4<f32>(outRGB, 1.0);
    out.accum = vec4<f32>(accumRGB, 1.0);
    return out;
}
