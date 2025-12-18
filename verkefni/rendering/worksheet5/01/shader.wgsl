const EPS_DIV : f32 = 0.00000001;
const EPS_PARALLEL : f32 = 0.000001;
const EPS_RAY : f32 = 0.0001;

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
@group(0) @binding(2) var<storage, read> JIT : Jitters;

@group(0) @binding(0) var<uniform> cam : Camera;
@group(0) @binding(1) var my_texture : texture_2d<f32>;

struct VertBuf {
    data: array<vec4<f32>>
};
struct IndexBuf {
    data: array<u32>
};
@group(0) @binding(3) var<storage, read> VERT : VertBuf;
@group(0) @binding(4) var<storage, read> IND  : IndexBuf;

struct MeshInfo {
    faceCount: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
};
@group(0) @binding(5) var<uniform> MESH : MeshInfo;


struct Ray {
    origin: vec3<f32>,
    dir: vec3<f32>,
};

struct Light {
    Li: vec3<f32>,
    wi: vec3<f32>,
    dist: f32,
};

struct Material {
    ambient: vec3<f32>,
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

struct Onb {
    tangent: vec3<f32>,
    binormal: vec3<f32>,
    normal: vec3<f32>,
};

const plane_onb = Onb(vec3<f32>(-1.0, 0.0, 0.0),
    vec3<f32>(0.0, 0.0, 1.0),
    vec3<f32>(0.0, 1.0, 0.0));

fn makeMaterial(base_rgb: vec3<f32>, spec_rgb: vec3<f32>, shininess: f32, ior: f32) -> Material {
    return Material(0.1 * base_rgb, 0.9 * base_rgb, spec_rgb, shininess, ior);
}

fn missMat() -> Material {
    return makeMaterial(vec3<f32>(0.0), vec3<f32>(0.0), 1.0, 1.0);
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

fn samplePointLight(P: vec3<f32>, lightPos: vec3<f32>, intensity: vec3<f32>) -> Light {
    let L = lightPos - P;
    let d = length(L);
    let wi = L / max(d, EPS_DIV);
    let Li = intensity / max(d * d, EPS_DIV);
    return Light(Li, wi, d);
}

fn intersectSphere(ray: Ray, C: vec3<f32>, r: f32, tmin: f32, tmax: f32) -> HitInfo {
    let oc = ray.origin - C;
    let b = dot(oc, ray.dir);
    let c = dot(oc, oc) - r * r;
    let disc = b * b - c;
    if disc < 0.0 { return missHit(tmax); }

    let s = sqrt(disc);
    var t = -b - s;
    if t <= tmin || t >= tmax {
        t = -b + s;
        if t <= tmin || t >= tmax { return missHit(tmax); }
    }

    let Phit = ray.origin + t * ray.dir;
    let n = Phit - C;

    
    let mat = makeMaterial(vec3<f32>(0.0), vec3<f32>(0.1, 0.1, 0.1), 42.0, 1.5);
    return okHit(t, n, mat, 2u, vec2<f32>(0.0));
}


fn intersectPlane(ray: Ray, P0: vec3<f32>, onb: Onb, tmin: f32, tmax: f32) -> HitInfo {
    let denom = dot(onb.normal, ray.dir);
    if abs(denom) < EPS_PARALLEL { return missHit(tmax); }

    let t = dot(P0 - ray.origin, onb.normal) / denom;
    if t <= tmin || t >= tmax { return missHit(tmax); }

    let Phit = ray.origin + t * ray.dir;

    
    let magnifyDiv = max(1.0, cam.U.w); 
    let baseScale = 0.2;
    let scale = baseScale / magnifyDiv; 
    let uv = vec2<f32>(dot(Phit, onb.tangent), dot(Phit, onb.binormal)) * scale;

    var base = vec3<f32>(0.1, 0.7, 0.0);
    if cam._pad1 != 0u { 
        if cam.filterMode == 0u {
            base = sample_nearest(my_texture, uv, cam.addrMode);
        } else {
            base = sample_linear(my_texture, uv, cam.addrMode);
        }
    }
    let mat = makeMaterial(base, vec3<f32>(0.0), 1.0, 1.0);
    return okHit(t, onb.normal, mat, 0u, uv);
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

    
    let mat = makeMaterial(vec3<f32>(0.4, 0.3, 0.2), vec3<f32>(0.0), 1.0, 1.0);
    return okHit(t, n, mat, 0u, vec2<f32>(0.0));
}

fn intersect_scene(ray: Ray, tmin: f32, tmax: f32) -> HitInfo {
    var best = missHit(tmax);

    for (var f: u32 = 0u; f < MESH.faceCount; f = f + 1u) {
        let h = intersectTriangleFace(ray, f, tmin, best.t);
        if h.hit && h.t < best.t { best = h; }
    }

    var h = intersectSphere(ray, vec3<f32>(0.0, 0.5, 0.0), 0.3, tmin, best.t);
    if h.hit && h.t < best.t { best = h; }

    h = intersectPlane(ray, vec3<f32>(0.0, 0.0, 0.0), plane_onb, tmin, best.t);
    if h.hit && h.t < best.t { best = h; }

    return best;
}

fn occluded_from(P: vec3<f32>, wi: vec3<f32>, maxDist: f32) -> bool {
    let eps = EPS_RAY;
    let ray = Ray(P + eps * wi, wi);
    let h = intersect_scene(ray, eps, maxDist - eps);
    if !h.hit { return false; }
    if h.shaderId == 2u { return false; } 
    return true;
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
    let PI = 3.1415926535;
    let Lpos = vec3<f32>(0.0, 1.0, 0.0);
    let I = vec3<f32>(PI, PI, PI);

    var N = hit.n;
    if dot(N, ray.dir) > 0.0 { N = -N; }

    let P = ray.origin + hit.t * ray.dir;
    let wo = normalize(-ray.dir);
    let L = samplePointLight(P, Lpos, I);

    if occluded_from(P, L.wi, L.dist) { return hit.mat.ambient; }

    let nl = max(0.0, dot(N, L.wi));
    var Lo = hit.mat.ambient + hit.mat.diffuse * L.Li * nl;

    if any(hit.mat.specular > vec3<f32>(0.0)) {
        Lo += phongSpecular(N, L.wi, wo, hit.mat.shininess, hit.mat.specular, L.Li);
    }
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

fn apply_address(uv: vec2<f32>, addrMode: u32) -> vec2<f32> {
    if addrMode == 0u { return clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0)); }
    return fract(uv);
}

fn idx_clamp(i: i32, dim: u32) -> u32 {
    return u32(clamp(i, 0, i32(dim) - 1));
}

fn idx_wrap(i: i32, dim: u32) -> u32 {
    let d = i % i32(dim);
    return u32((d + i32(dim)) % i32(dim));
}

fn sample_nearest(tex: texture_2d<f32>, uv_in: vec2<f32>, addrMode: u32) -> vec3<f32> {
    let dims = textureDimensions(tex);
    let uv = apply_address(uv_in, addrMode);
    let ab = vec2<f32>(f32(dims.x), f32(dims.y)) * uv;

    let u_i = i32(floor(ab.x + 0.5));
    let v_i = i32(floor(ab.y + 0.5));

    let U: u32 = select(idx_wrap(u_i, dims.x), idx_clamp(u_i, dims.x), addrMode == 0u);
    let V: u32 = select(idx_wrap(v_i, dims.y), idx_clamp(v_i, dims.y), addrMode == 0u);

    return textureLoad(tex, vec2<u32>(U, V), 0).rgb;
}

fn sample_linear(tex: texture_2d<f32>, uv_in: vec2<f32>, addrMode: u32) -> vec3<f32> {
    let dims = textureDimensions(tex);
    let size = vec2<f32>(f32(dims.x), f32(dims.y));

    let ab = size * apply_address(uv_in, addrMode) - vec2<f32>(0.5, 0.5);
    let i0 = vec2<i32>(floor(ab));
    let f = fract(ab);
    let i1 = i0 + vec2<i32>(1, 1);

    let u0: u32 = select(idx_wrap(i0.x, dims.x), idx_clamp(i0.x, dims.x), addrMode == 0u);
    let v0: u32 = select(idx_wrap(i0.y, dims.y), idx_clamp(i0.y, dims.y), addrMode == 0u);
    let u1: u32 = select(idx_wrap(i1.x, dims.x), idx_clamp(i1.x, dims.x), addrMode == 0u);
    let v1: u32 = select(idx_wrap(i1.y, dims.y), idx_clamp(i1.y, dims.y), addrMode == 0u);

    let c00 = textureLoad(tex, vec2<u32>(u0, v0), 0).rgb;
    let c10 = textureLoad(tex, vec2<u32>(u1, v0), 0).rgb;
    let c01 = textureLoad(tex, vec2<u32>(u0, v1), 0).rgb;
    let c11 = textureLoad(tex, vec2<u32>(u1, v1), 0).rgb;

    let cx0 = mix(c00, c10, f.x);
    let cx1 = mix(c01, c11, f.x);
    return mix(cx0, cx1, f.y);
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
