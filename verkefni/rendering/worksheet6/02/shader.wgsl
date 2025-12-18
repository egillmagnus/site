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

struct AttribBuf {
    data: array<vec4<f32>>  
};

struct IndexBuf {
    data: array<u32>  
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
    data: array<vec4<u32>>  
};

struct BspPlanesBuf {
    data: array<f32>
};

@group(0) @binding(0) var<uniform> cam : Camera;
@group(0) @binding(1) var<storage, read> JIT : Jitters;
@group(0) @binding(2) var<storage, read> ATTRIB : AttribBuf;  
@group(0) @binding(3) var<storage, read> IND : IndexBuf;      
@group(0) @binding(4) var<storage, read> MATERIALS : MaterialsBuf;
@group(0) @binding(5) var<storage, read> LIGHT_IDX : LightIndexBuf;
@group(0) @binding(6) var<uniform> LIGHT_INFO : LightInfo;
@group(0) @binding(7) var<uniform> aabb : Aabb;
@group(0) @binding(8) var<storage, read> TREE_IDS : TreeIdsBuf;
@group(0) @binding(9) var<storage, read> BSP_TREE : BspTreeBuf;
@group(0) @binding(10) var<storage, read> BSP_PLANES : BspPlanesBuf;

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


fn intersectAabb(ray: Ray) -> bool {
    var tmin = ray.tmin;
    var tmax = ray.tmax;

    for (var i = 0u; i < 3u; i = i + 1u) {
        let invD = 1.0 / ray.dir[i];
        var t0 = (aabb.min[i] - ray.origin[i]) * invD;
        var t1 = (aabb.max[i] - ray.origin[i]) * invD;

        if invD < 0.0 {
            let temp = t0;
            t0 = t1;
            t1 = temp;
        }

        tmin = max(t0, tmin);
        tmax = min(t1, tmax);

        if tmax < tmin {
            return false;
        }
    }

    return true;
}

fn intersectTriangleFace(ray: Ray, faceIdx: u32) -> HitInfo {
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

    if !intersectAabb(r) {
        return missHit(r.tmax);
    }

    var hit = missHit(r.tmax);

    const MAX_LEVEL: u32 = 20u;
    const BSP_LEAF: u32 = 3u;

    var branch_node: array<vec2<u32>, MAX_LEVEL>;
    var branch_ray: array<vec2<f32>, MAX_LEVEL>;
    var branch_lvl = 0u;

    var node = 0u;
    var t = 0.0;

    for (var i = 0u; i <= MAX_LEVEL; i = i + 1u) {
        let tree_node = BSP_TREE.data[node];
        let node_axis_leaf = tree_node.x & 3u;

        if node_axis_leaf == BSP_LEAF {
            let node_count = tree_node.x >> 2u;
            let node_id = tree_node.y;

            var found = false;
            for (var j = 0u; j < node_count; j = j + 1u) {
                let tri_idx = TREE_IDS.data[node_id + j];
                let h = intersectTriangleFace(r, tri_idx);
                if h.hit && h.t < hit.t {
                    hit = h;
                    r.tmax = h.t;
                    found = true;
                }
            }

            if found {
                return hit;
            } else if branch_lvl == 0u {
                return hit;
            } else {
                branch_lvl = branch_lvl - 1u;
                i = branch_node[branch_lvl].x;
                node = branch_node[branch_lvl].y;
                r.tmin = branch_ray[branch_lvl].x;
                r.tmax = branch_ray[branch_lvl].y;
                continue;
            }
        }

        let axis_dir = r.dir[node_axis_leaf];
        let axis_org = r.origin[node_axis_leaf];

        var near_node: u32;
        var far_node: u32;

        if axis_dir >= 0.0 {
            near_node = tree_node.z;  
            far_node = tree_node.w;  
        } else {
            near_node = tree_node.w;  
            far_node = tree_node.z;  
        }

        let node_plane = BSP_PLANES.data[node];
        let denom = select(axis_dir, 1.0e-8, abs(axis_dir) < 1.0e-8);
        t = (node_plane - axis_org) / denom;

        if t > r.tmax {
            node = near_node;
        } else if t < r.tmin {
            node = far_node;
        } else {
            
            branch_node[branch_lvl].x = i;
            branch_node[branch_lvl].y = far_node;
            branch_ray[branch_lvl].x = t;
            branch_ray[branch_lvl].y = r.tmax;
            branch_lvl = branch_lvl + 1u;

            
            r.tmax = t;
            node = near_node;
        }
    }

    return hit;
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
                ray = Ray(P + eps * R, R, eps, 1e30);
            } else {
                let T = normalize(rel * ray.dir + (rel * cosi - sqrt(k)) * N);
                let eps = EPS_RAY;
                ray = Ray(P + eps * T, T, eps, 1e30);
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
        acc = trace(Ray(cam.eye.xyz, dir, EPS_RAY, 1e30));
    } else {
        for (var i: u32 = 0u; i < N; i = i + 1u) {
            let j = JIT.data[i];
            let img_j = img + vec2<f32>(j.x * dpx, j.y * dpy);

            let center = cam.eye.xyz + cam.zoom * cam.W.xyz;
            let Pimg = center + img_j.x * cam.U.xyz + (img_j.y / cam.aspect) * cam.V.xyz;
            let dir = normalize(Pimg - cam.eye.xyz);
            acc += trace(Ray(cam.eye.xyz, dir, EPS_RAY, 1e30));
        }
        acc = acc / f32(N);
    }

    let outRGB = pow(max(acc, vec3<f32>(0.0)), vec3<f32>(1.0 / cam.gamma));
    return vec4<f32>(outRGB, 1.0);
}