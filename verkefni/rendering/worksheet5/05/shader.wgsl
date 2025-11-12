const EPS_DIV : f32 = 0.00000001;
const EPS_PARALLEL : f32 = 0.000001;
const EPS_RAY : f32 = 0.01;

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

struct VertBuf {
    data: array<vec4<f32>>
};

struct IndexBuf {
    data: array<u32>
};

struct NormalBuf {
    data: array<vec4<f32>>
};

struct MeshInfo {
    faceCount: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
};

struct MatIndexBuf {
    data: array<u32>
};

struct MaterialData {
    color: vec4<f32>,
    emission: vec4<f32>,
};

struct MaterialsBuf {
    data: array<MaterialData>
};

@group(0) @binding(0) var<uniform> cam : Camera;
@group(0) @binding(1) var<storage, read> JIT : Jitters;
@group(0) @binding(2) var<storage, read> VERT : VertBuf;
@group(0) @binding(3) var<storage, read> IND : IndexBuf;
@group(0) @binding(4) var<uniform> MESH : MeshInfo;
@group(0) @binding(5) var<storage, read> NORM : NormalBuf;
@group(0) @binding(6) var<storage, read> MAT_IDX : MatIndexBuf;
@group(0) @binding(7) var<storage, read> MATERIALS : MaterialsBuf;
@group(0) @binding(8) var<storage, read> LIGHT_IDX : LightIndexBuf;
@group(0) @binding(9) var<uniform> LIGHT_INFO : LightInfo;

struct Ray {
    origin: vec3<f32>,
    dir: vec3<f32>,
};

struct Light {
    Li: vec3<f32>,
    wi: vec3<f32>,
    dist: f32,
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

fn sampleDirectionalLight(P: vec3<f32>, lightDir: vec3<f32>, Le: vec3<f32>) -> Light {
    let wi = normalize(-lightDir);
    let dist = 1e30;
    return Light(Le, wi, dist);
}

fn intersectTriangleFace(ray: Ray, faceIdx: u32, tmin: f32, tmax: f32) -> HitInfo {
    let base = 3u * faceIdx;
    let i0 = IND.data[base + 0u];
    let i1 = IND.data[base + 1u];
    let i2 = IND.data[base + 2u];

    let v0 = VERT.data[i0].xyz;
    let v1 = VERT.data[i1].xyz;
    let v2 = VERT.data[i2].xyz;

    let e0 = v1 - v0;
    let e1 = v2 - v0;
    let n = cross(e0, e1);

    var q = dot(ray.dir, n);
    if abs(q) < EPS_DIV { return missHit(tmax); }
    q = 1.0 / q;

    let o_to_v0 = v0 - ray.origin;
    let t = dot(o_to_v0, n) * q;
    if t <= tmin || t >= tmax { return missHit(tmax); }

    let n_tmp = cross(o_to_v0, ray.dir);
    let beta = dot(n_tmp, e1) * q;
    if beta < 0.0 { return missHit(tmax); }

    let gamma = -dot(n_tmp, e0) * q;
    if gamma < 0.0 || beta + gamma > 1.0 { return missHit(tmax); }

    let alpha = 1.0 - beta - gamma;
    let n0 = NORM.data[i0].xyz;
    let n1 = NORM.data[i1].xyz;
    let n2 = NORM.data[i2].xyz;
    let interpolated_normal = normalize(alpha * n0 + beta * n1 + gamma * n2);

    let matIdx = MAT_IDX.data[faceIdx];
    let matData = MATERIALS.data[matIdx];
    let mat = makeMaterial(matData.emission.rgb, matData.color.rgb, vec3<f32>(0.0), 1.0, 1.0);

    // Use interpolated_normal instead of n
    return okHit(t, interpolated_normal, mat, 0u, vec2<f32>(beta, gamma));
}

fn intersect_scene(ray: Ray, tmin: f32, tmax: f32) -> HitInfo {
    var best = missHit(tmax);

    for (var f: u32 = 0u; f < MESH.faceCount; f = f + 1u) {
        let h = intersectTriangleFace(ray, f, tmin, best.t);
        if h.hit && h.t < best.t { best = h; }
    }

    return best;
}

fn occluded_from(P: vec3<f32>, wi: vec3<f32>, maxDist: f32) -> bool {
    let eps = EPS_RAY;  // Increase if needed
    let ray = Ray(P + eps * wi, wi);
    let h = intersect_scene(ray, eps, maxDist - eps);
    if !h.hit { return false; }
    // Don't treat emissive surfaces as occluders
    if any(h.mat.emission > vec3<f32>(0.0)) { return false; }
    return true;
}
// Sample area light as point light at center with computed intensity
fn sampleAreaLight(P: vec3<f32>, N: vec3<f32>) -> Light {
    if LIGHT_INFO.lightCount == 0u {
        return Light(vec3<f32>(0.0), vec3<f32>(0.0, 1.0, 0.0), 1e30);
    }
    
    // Compute bounding box center of all light triangles
    var lightCenter = vec3<f32>(0.0);
    var vertexCount = 0.0;

    for (var i = 0u; i < LIGHT_INFO.lightCount; i = i + 1u) {
        let faceIdx = LIGHT_IDX.data[i];
        let base = 3u * faceIdx;
        let i0 = IND.data[base + 0u];
        let i1 = IND.data[base + 1u];
        let i2 = IND.data[base + 2u];

        lightCenter += VERT.data[i0].xyz;
        lightCenter += VERT.data[i1].xyz;
        lightCenter += VERT.data[i2].xyz;
        vertexCount += 3.0;
    }
    lightCenter = lightCenter / vertexCount;
    
    // Direction and distance from P to light center
    let L = lightCenter - P;
    let dist = length(L);
    let wi = L / dist;
    
    // Compute intensity: Ie = Σ (−wi · ne) * Le * Ae
    var Ie = vec3<f32>(0.0);

    for (var i = 0u; i < LIGHT_INFO.lightCount; i = i + 1u) {
        let faceIdx = LIGHT_IDX.data[i];
        let base = 3u * faceIdx;
        let i0 = IND.data[base + 0u];
        let i1 = IND.data[base + 1u];
        let i2 = IND.data[base + 2u];

        let v0 = VERT.data[i0].xyz;
        let v1 = VERT.data[i1].xyz;
        let v2 = VERT.data[i2].xyz;
        
        // Triangle normal and area
        let e0 = v1 - v0;
        let e1 = v2 - v0;
        let cross_e = cross(e0, e1);
        let area = length(cross_e) * 0.5;
        let ne = normalize(cross_e);
        
        // Get emission
        let matIdx = MAT_IDX.data[faceIdx];
        let matData = MATERIALS.data[matIdx];
        let Le = matData.emission.rgb;
        
        // Cosine term: max(0, -wi · ne)
        let cosTheta = max(0.0, dot(-wi, ne));
        
        // Accumulate: (−wi · ne) * Le * Ae
        Ie += cosTheta * Le * area;
    }
    
    // Li = Ie / r²
    let Li = Ie / max(dist * dist, EPS_DIV);

    return Light(Li, wi, dist);
}
fn phongSpecular(N: vec3<f32>, wi: vec3<f32>, wo: vec3<f32>, shininess: f32, specRGB: vec3<f32>, Li: vec3<f32>) -> vec3<f32> {
    let H = normalize(wi + wo);
    let nh = max(0.0, dot(N, H));
    let s = pow(nh, shininess);
    return specRGB * Li * s;
}

fn background(dir: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(0.1, 0.3, 0.6);
}

fn shade_once(ray: Ray, hit: HitInfo) -> vec3<f32> {
    var N = hit.n;
    if dot(N, ray.dir) > 0.0 { N = -N; }

    let P = ray.origin + hit.t * ray.dir;
    
    // No seed needed anymore
    let L = sampleAreaLight(P, N);
    
    // Check occlusion
    if occluded_from(P, L.wi, L.dist) {
        return hit.mat.emission;
    }
    
    // Lambertian BRDF
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
        let h = intersect_scene(ray, EPS_RAY, 1e30);
        if !h.hit { return background(ray.dir); }

        let hRel = addRelEta(h, computeRelEta(h, ray, eta));
        let c = shade_once(ray, hRel);

        if hRel.shaderId == 2u {
            acc += c;

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
                ray = Ray(P + eps * R, R);
            } else {
                let T = normalize(rel * ray.dir + (rel * cosi - sqrt(k)) * N);
                let eps = EPS_RAY;
                ray = Ray(P + eps * T, T);
                if entering {
                    eta = hRel.mat.ior;
                } else {
                    eta = 1.0;
                }
            }
            continue;
        }

        return acc + c;
    }
    return vec3<f32>(0.0);
}

@fragment
fn fsMain(@location(0) img: vec2<f32>) -> @location(0) vec4<f32> {
    let invW = cam._pad0;
    let invH = invW * cam.aspect;
    let dpx = 2.0 * invW;
    let dpy = 2.0 * invH;

    let N: u32 = u32(cam._pad2);

    var acc = vec3<f32>(0.0);
    if N == 0u {
        let center = cam.eye.xyz + cam.zoom * cam.W.xyz;
        let Pimg = center + img.x * cam.U.xyz + (img.y / cam.aspect) * cam.V.xyz;
        let dir = normalize(Pimg - cam.eye.xyz);
        acc = trace(Ray(cam.eye.xyz, dir));
    } else {
        for (var i: u32 = 0u; i < N; i = i + 1u) {
            let j = JIT.data[i];
            let img_j = img + vec2<f32>(j.x * dpx, j.y * dpy);

            let center = cam.eye.xyz + cam.zoom * cam.W.xyz;
            let Pimg = center + img_j.x * cam.U.xyz + (img_j.y / cam.aspect) * cam.V.xyz;
            let dir = normalize(Pimg - cam.eye.xyz);
            acc += trace(Ray(cam.eye.xyz, dir));
        }
        acc = acc / f32(N);
    }

    let outRGB = pow(max(acc, vec3<f32>(0.0)), vec3<f32>(1.0 / cam.gamma));
    return vec4<f32>(outRGB, 1.0);
}