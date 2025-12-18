const EPS_DIV : f32 = 0.00000001;
const EPS_PARALLEL : f32 = 0.000001;
const EPS_RAY : f32 = 0.1;
const PI : f32 = 3.14159265359;
const SCENE_TMAX : f32 = 1200.0;

fn tea(val0: u32, val1: u32) -> u32 {
    const N = 16u;
    var v0 = val0;
    var v1 = val1;
    var s0 = 0u;
    for (var n = 0u; n < N; n = n + 1u) {
        s0 += 0x9e3779b9u;
        v0 += ((v1 << 4u) + 0xa341316cu) ^ (v1 + s0) ^ ((v1 >> 5u) + 0xc8013ea4u);
        v1 += ((v0 << 4u) + 0xad90777du) ^ (v0 + s0) ^ ((v0 >> 5u) + 0x7e95761eu);
    }
    return v0;
}

fn mcg31(prev: ptr<function, u32>) -> u32 {
    const A = 1977654935u;
    *prev = (A * (*prev)) & 0x7fffffffu;
    return *prev;
}

fn rnd(prev: ptr<function, u32>) -> f32 {
    return f32(mcg31(prev)) / f32(0x80000000u); 
}



fn spherical_direction(sin_theta: f32, cos_theta: f32, phi: f32) -> vec3<f32> {
    return vec3<f32>(
        sin_theta * cos(phi),
        sin_theta * sin(phi),
        cos_theta
    );
}


fn rotate_to_normal(n: vec3<f32>, v: vec3<f32>) -> vec3<f32> {
    let eps = 0.0000000000000001; 
    let s = sign(n.z + eps);
    let a = -1.0 / (1.0 + abs(n.z));
    let b = n.x * n.y * a;
    return vec3<f32>(1.0 + n.x * n.x * a, b, -s * n.x) * v.x +
           vec3<f32>(s * b, s * (1.0 + n.y * n.y * a), -n.y) * v.y +
           n * v.z;
}



struct VSOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) img: vec2<f32>,
};

@vertex
fn vsMain(@builtin(vertex_index) vid: u32) -> VSOut {
    var corners = array<vec2<f32>, 4>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>( 1.0,  1.0)
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

struct Torus {
    centerR: vec4<f32>,     
    abIorPad: vec4<f32>,    
    rot0: vec4<f32>,        
    rot1: vec4<f32>,        
    rot2: vec4<f32>,        
    extinction: vec4<f32>,  
};

struct TorusBuf {
    data: array<Torus>
};

struct TorusInfo {
    count: u32,
    _pad0: u32,
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

struct SpheresUBO {
    c0: vec4<f32>, 
    c1: vec4<f32>, 
    p0: vec4<f32>, 
    p1: vec4<f32>, 
};

@group(0) @binding(0)  var<uniform> cam         : Camera;
@group(0) @binding(1)  var<storage, read> ATTRIB     : AttribBuf;
@group(0) @binding(2)  var<storage, read> IND        : IndexBuf;
@group(0) @binding(3)  var<storage, read> MATERIALS  : MaterialsBuf;
@group(0) @binding(4)  var<storage, read> LIGHT_IDX  : LightIndexBuf;
@group(0) @binding(5)  var<uniform>      LIGHT_INFO  : LightInfo;
@group(0) @binding(6)  var<uniform>      aabb        : Aabb;
@group(0) @binding(7)  var<storage, read> TREE_IDS   : TreeIdsBuf;
@group(0) @binding(8)  var<storage, read> BSP_TREE   : BspTreeBuf;
@group(0) @binding(9)  var<storage, read> BSP_PLANES : BspPlanesBuf;
@group(0) @binding(10) var<uniform>      SPH         : SpheresUBO;
@group(0) @binding(11) var               renderTexture : texture_2d<f32>;
@group(0) @binding(12) var<storage, read> TORI : TorusBuf;
@group(0) @binding(13) var<uniform>      TORUS_INFO : TorusInfo;




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
    relEta: f32,
    uv: vec2<f32>,
    extinction: vec3<f32>, 
    throughput: vec3<f32>, 
    emit: bool,            
};

fn makeMaterial(emission: vec3<f32>, diffuse: vec3<f32>, spec_rgb: vec3<f32>, shininess: f32, ior: f32) -> Material {
    return Material(emission, diffuse, spec_rgb, shininess, ior);
}

fn missMat() -> Material {
    return makeMaterial(vec3<f32>(0.0), vec3<f32>(0.0), vec3<f32>(0.0), 1.0, 1.0);
}

fn luminance(c: vec3<f32>) -> f32 {
    return 0.2126 * c.x + 0.7152 * c.y + 0.0722 * c.z;
}

fn fresnel_R(cos_i: f32, cos_t: f32, eta_i: f32, eta_t: f32) -> f32 {
    let denom_s = eta_i * cos_i + eta_t * cos_t;
    let denom_p = eta_t * cos_i + eta_i * cos_t;

    if abs(denom_s) < 0.000001 || abs(denom_p) < 0.000001 {
        return 1.0;
    }

    let rs = (eta_i * cos_i - eta_t * cos_t) / denom_s;
    let rp = (eta_t * cos_i - eta_i * cos_t) / denom_p;

    return 0.5 * (rs * rs + rp * rp);
}

fn missHit(tmax: f32) -> HitInfo {
    return HitInfo(
        false,
        tmax,
        vec3<f32>(0.0),
        missMat(),
        0u,
        1.0,
        vec2<f32>(0.0),
        vec3<f32>(0.0),    
        vec3<f32>(1.0),    
        false
    );
}


fn okHit(t: f32, n: vec3<f32>, mat: Material, shaderId: u32, uv: vec2<f32>, extinction: vec3<f32>) -> HitInfo {
    let isLight = any(mat.emission > vec3<f32>(0.0));
    let isSpecular = (shaderId == 1u || shaderId == 2u);
    let isEmit = isLight || isSpecular;
    return HitInfo(
        true,
        t,
        normalize(n),
        mat,
        shaderId,
        1.0,
        uv,
        extinction,
        vec3<f32>(1.0),
        isEmit
    );
}

fn addRelEta(h: HitInfo, rel: f32) -> HitInfo {
    return HitInfo(
        h.hit,
        h.t,
        h.n,
        h.mat,
        h.shaderId,
        rel,
        h.uv,
        h.extinction,
        h.throughput,
        h.emit
    );
}

fn computeRelEta(h: HitInfo, ray: Ray, curEta: f32) -> f32 {
    if dot(h.n, ray.dir) < 0.0 { return curEta / h.mat.ior; }
    return curEta / 1.0;
}

fn torusF_local(P: vec3<f32>, R: f32, a: f32, b: f32) -> f32 {
    let x = P.x;
    let y = P.y;
    let z = P.z;

    let p = (a * a) / max(b * b, EPS_DIV);
    let A0 = 4.0 * R * R;
    let B0 = R * R - a * a;

    let xz2 = x * x + z * z;
    let sum = xz2 + p * y * y + B0;

    return sum * sum - A0 * xz2;
}

fn torusNormal_local(P: vec3<f32>, R: f32, a: f32, b: f32) -> vec3<f32> {
    let x = P.x;
    let y = P.y;
    let z = P.z;

    let p = (a * a) / max(b * b, EPS_DIV);
    let A0 = 4.0 * R * R;
    let B0 = R * R - a * a;

    let xz2 = x * x + z * z;
    let Q = xz2 + p * y * y + B0;

    
    let dFx = 4.0 * x * Q - 2.0 * A0 * x;
    let dFy = 4.0 * p * y * Q;
    let dFz = 4.0 * z * Q - 2.0 * A0 * z;

    return normalize(vec3<f32>(dFx, dFy, dFz));
}


fn intersectTorusInstance(rayWorld: Ray, idx: u32) -> HitInfo {
    let T = TORI.data[idx];

    let center = T.centerR.xyz;
    let R = T.centerR.w;           
    let a = T.abIorPad.x;          
    let b = T.abIorPad.y;          
    let ior = T.abIorPad.z;
    let sigma = T.extinction.xyz;

    
    let oWorld = rayWorld.origin - center;
    let oL = vec3<f32>(
        dot(T.rot0.xyz, oWorld),
        dot(T.rot1.xyz, oWorld),
        dot(T.rot2.xyz, oWorld)
    );
    let dL = vec3<f32>(
        dot(T.rot0.xyz, rayWorld.dir),
        dot(T.rot1.xyz, rayWorld.dir),
        dot(T.rot2.xyz, rayWorld.dir)
    );

    
    let rSphere = R + max(a, b);
    let r2 = rSphere * rSphere;

    
    let segTmin = rayWorld.tmin;
    let segTmax = min(rayWorld.tmax, 2000.0);

    
    let oc = oL;
    let bs = dot(oc, dL);
    let cs = dot(oc, oc) - r2;
    let disc = bs * bs - cs;
    if disc < 0.0 {
        return missHit(rayWorld.tmax);
    }

    let s = sqrt(max(disc, 0.0));
    var tIn  = -bs - s;
    var tOut = -bs + s;
    if tIn > tOut {
        let tmp = tIn;
        tIn = tOut;
        tOut = tmp;
    }

    
    let sphTmin = max(segTmin, tIn - EPS_RAY);
    let sphTmax = min(segTmax, tOut + EPS_RAY);
    if sphTmin > sphTmax {
        return missHit(rayWorld.tmax);
    }

    
    let yIn  = oL.y + dL.y * sphTmin;
    let yOut = oL.y + dL.y * sphTmax;
    if (yIn > b && yOut > b) || (yIn < -b && yOut < -b) {
        return missHit(rayWorld.tmax);
    }

    var ray = Ray(
        oL,
        dL,
        sphTmin,
        sphTmax
    );

    let MAX_STEPS = 64u;
    let MAX_BISECT = 6u;

    var t0 = ray.tmin;
    var P0 = ray.origin + t0 * ray.dir;
    var f0 = torusF_local(P0, R, a, b);

    var bestT = ray.tmax;
    var found = false;

    let step = (ray.tmax - ray.tmin) / f32(MAX_STEPS);

    for (var i = 1u; i <= MAX_STEPS; i = i + 1u) {
        let t1 = ray.tmin + f32(i) * step;
        let P1 = ray.origin + t1 * ray.dir;
        let f1 = torusF_local(P1, R, a, b);

        if (f0 == 0.0 || f0 * f1 < 0.0) {
            var lo = t0;
            var hi = t1;
            var flo = f0;

            for (var j = 0u; j < MAX_BISECT; j = j + 1u) {
                let mid = 0.5 * (lo + hi);
                let Pm = ray.origin + mid * ray.dir;
                let fm = torusF_local(Pm, R, a, b);

                if flo * fm <= 0.0 {
                    hi = mid;
                } else {
                    lo = mid;
                    flo = fm;
                }
            }

            let tCandidate = 0.5 * (lo + hi);
            if tCandidate > ray.tmin && tCandidate < bestT {
                bestT = tCandidate;
                found = true;
            }
        }

        t0 = t1;
        f0 = f1;
    }

    if !found {
        return missHit(rayWorld.tmax);
    }

    let tHit = bestT;
    
    let P_world = rayWorld.origin + tHit * rayWorld.dir;

    
    let P_local = ray.origin + tHit * ray.dir;
    let N_local = torusNormal_local(P_local, R, a, b);

    
    let N_world = normalize(vec3<f32>(
        T.rot0.x * N_local.x + T.rot1.x * N_local.y + T.rot2.x * N_local.z,
        T.rot0.y * N_local.x + T.rot1.y * N_local.y + T.rot2.y * N_local.z,
        T.rot0.z * N_local.x + T.rot1.z * N_local.y + T.rot2.z * N_local.z
    ));

    let mat = makeMaterial(
        vec3<f32>(0.0),
        vec3<f32>(0.0),
        vec3<f32>(0.0),
        1.0,
        ior
    );

    
    return okHit(tHit, N_world, mat, 2u, vec2<f32>(0.0), sigma);
}


fn intersectAabb(ray: Ray) -> bool {
    var tmin = ray.tmin;
    var tmax = ray.tmax;

    let p1 = (aabb.min.xyz - ray.origin) / ray.dir;
    let p2 = (aabb.max.xyz - ray.origin) / ray.dir;
    let pmin = min(p1, p2);
    let pmax = max(p1, p2);

    let box_tmin = max(pmin.x, max(pmin.y, pmin.z)) - 0.001;
    let box_tmax = min(pmax.x, min(pmax.y, pmax.z)) + 0.001;

    if box_tmin > box_tmax || box_tmin > tmax || box_tmax < tmin {
        return false;
    }
    return true;
}

fn intersectSphere(ray: Ray, center: vec3<f32>, radius: f32, typeFlag: u32, ior: f32) -> HitInfo {
    let oc = ray.origin - center;
    let b = dot(oc, ray.dir);
    let c = dot(oc, oc) - radius * radius;
    let disc = b * b - c;
    if disc < 0.0 {
        return missHit(ray.tmax);
    }

    let s = sqrt(max(disc, 0.0));
    var t = -b - s;
    if t <= ray.tmin || t >= ray.tmax {
        t = -b + s;
        if t <= ray.tmin || t >= ray.tmax {
            return missHit(ray.tmax);
        }
    }

    let P = ray.origin + t * ray.dir;
    let N = normalize(P - center);

    let mat = makeMaterial(vec3<f32>(0.0), vec3<f32>(0.0), vec3<f32>(0.0), 1.0, max(ior, 1.0));

    var sigma = vec3<f32>(0.0);
    if typeFlag == 2u {
        sigma = vec3<f32>(0.1, 0.1, 0.0);
    }

    return okHit(t, N, mat, typeFlag, vec2<f32>(0.0), sigma);
}

const MAX_LEVEL : u32 = 20u;
const BSP_LEAF : u32 = 3u;

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
    if abs(q) < EPS_DIV {
        return missHit(ray.tmax);
    }
    q = 1.0 / q;

    let o_to_v0 = v0 - ray.origin;
    let t = dot(o_to_v0, n) * q;
    if t <= ray.tmin || t >= ray.tmax {
        return missHit(ray.tmax);
    }

    let n_tmp = cross(o_to_v0, ray.dir);
    let beta = dot(n_tmp, e1) * q;
    if beta < 0.0 {
        return missHit(ray.tmax);
    }

    let gamma = -dot(n_tmp, e0) * q;
    if gamma < 0.0 || beta + gamma > 1.0 {
        return missHit(ray.tmax);
    }

    let alpha = 1.0 - beta - gamma;
    let n0 = ATTRIB.data[i0 * 2u + 1u].xyz;
    let n1 = ATTRIB.data[i1 * 2u + 1u].xyz;
    let n2 = ATTRIB.data[i2 * 2u + 1u].xyz;
    let normal = normalize(alpha * n0 + beta * n1 + gamma * n2);

    let uv = vec2<f32>(beta, gamma);

    let matData = MATERIALS.data[matIdx];
    let mat = makeMaterial(matData.emission.rgb, matData.color.rgb, vec3<f32>(0.0), 1.0, 1.0);

    return okHit(t, normal, mat, 0u, uv, vec3<f32>(0.0));
}

fn intersect_scene_bsp(ray_in: Ray, includeTori: bool) -> HitInfo {
    var r = ray_in;

    if !intersectAabb(r) {
        return missHit(r.tmax);
    }

    var hit = missHit(r.tmax);

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

            for (var j = 0u; j < node_count; j = j + 1u) {
                let tri_idx = TREE_IDS.data[node_id + j];
                let h = intersectTriangleFace(r, tri_idx);
                if h.hit && h.t < hit.t {
                    hit = h;
                    r.tmax = h.t;
                }
            }

            if branch_lvl == 0u {
                break;
            } else {
                branch_lvl = branch_lvl - 1u;
                i = branch_node[branch_lvl].x;
                node = branch_node[branch_lvl].y;
                r.tmin = branch_ray[branch_lvl].x;
                r.tmax = branch_ray[branch_lvl].y;
                if hit.hit {
                    r.tmax = min(r.tmax, hit.t);
                }
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

        let denom = select(axis_dir, 0.00000001, abs(axis_dir) < 0.00000001);
        let node_plane = BSP_PLANES.data[node];
        t = (node_plane - axis_org) / denom;

        if t > r.tmax {
            node = near_node;
        } else if t < r.tmin {
            node = far_node;
        } else {
            branch_node[branch_lvl].x = i;
            branch_node[branch_lvl].y = far_node;
            branch_ray[branch_lvl].x = max(t, r.tmin);
            branch_ray[branch_lvl].y = r.tmax;
            branch_lvl = branch_lvl + 1u;

            r.tmax = min(t, r.tmax);
            node = near_node;
        }
    }

    var bestHit = hit;

    
    
    
    
    

    
    
    
    
    
    
    

    
    
    
    
    
    

    if includeTori {
        for (var i = 0u; i < TORUS_INFO.count; i = i + 1u) {
            let ht = intersectTorusInstance(ray_in, i);
            if ht.hit && ht.t < bestHit.t {
                bestHit = ht;
            }
        }
    }

    return bestHit;
}

fn occluded_from(P: vec3<f32>, wi: vec3<f32>, maxDist: f32) -> bool {
    let eps = EPS_RAY;
    let ray = Ray(P + eps * wi, wi, eps, maxDist - eps);
    let h = intersect_scene_bsp(ray, false);
    if !h.hit {
        return false;
    }
    if any(h.mat.emission > vec3<f32>(0.0)) {
        return false;
    }
    return true;
}

fn background(dir: vec3<f32>, blueBg: bool) -> vec3<f32> {
    return vec3<f32>(0.0, 0.0, 0.0);
}


fn sampleAreaLight(P: vec3<f32>, N: vec3<f32>, seed: ptr<function, u32>) -> Light {
    if LIGHT_INFO.lightCount == 0u {
        return Light(vec3<f32>(0.0), vec3<f32>(0.0, 1.0, 0.0), SCENE_TMAX);
    }

    var totalArea = 0.0;
    for (var i = 0u; i < LIGHT_INFO.lightCount; i = i + 1u) {
        let faceIdx = LIGHT_IDX.data[i];
        let base = 4u * faceIdx;
        let i0 = IND.data[base + 0u];
        let i1 = IND.data[base + 1u];
        let i2 = IND.data[base + 2u];

        let v0 = ATTRIB.data[i0 * 2u + 0u].xyz;
        let v1 = ATTRIB.data[i1 * 2u + 0u].xyz;
        let v2 = ATTRIB.data[i2 * 2u + 0u].xyz;

        let e0 = v1 - v0;
        let e1 = v2 - v0;
        let cross_e = cross(e0, e1);
        let area = length(cross_e) * 0.5;
        totalArea += area;
    }

    if totalArea < EPS_DIV {
        return Light(vec3<f32>(0.0), vec3<f32>(0.0, 1.0, 0.0), SCENE_TMAX);
    }

    let r1 = rnd(seed) * totalArea;
    var accumulatedArea = 0.0;
    var selectedNormal = vec3<f32>(0.0);
    var selectedEmission = vec3<f32>(0.0);
    var selectedV0 = vec3<f32>(0.0);
    var selectedV1 = vec3<f32>(0.0);
    var selectedV2 = vec3<f32>(0.0);

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
        accumulatedArea += area;

        if r1 <= accumulatedArea {
            selectedNormal = normalize(cross_e);
            let matData = MATERIALS.data[matIdx];
            selectedEmission = matData.emission.rgb;
            selectedV0 = v0;
            selectedV1 = v1;
            selectedV2 = v2;
            break;
        }
    }

    let r2 = rnd(seed);
    let r3 = rnd(seed);
    let sqrt_r2 = sqrt(r2);
    let beta = 1.0 - sqrt_r2;
    let gamma = r3 * sqrt_r2;
    let alpha = 1.0 - beta - gamma;
    let lightPoint = alpha * selectedV0 + beta * selectedV1 + gamma * selectedV2;

    let L = lightPoint - P;
    let dist = length(L);
    let wi = L / max(dist, EPS_DIV);

    let cosTheta = max(0.0, -dot(wi, selectedNormal));
    let Li = selectedEmission * cosTheta * totalArea / max(dist * dist, EPS_DIV);

    return Light(Li, wi, dist);
}

fn shade_once(ray: Ray, hit: HitInfo, seed: ptr<function, u32>) -> vec3<f32> {
    var N = hit.n;
    if dot(N, ray.dir) > 0.0 {
        N = -N;
    }

    let P = ray.origin + hit.t * ray.dir;
    let L = sampleAreaLight(P, N, seed);

    if occluded_from(P, L.wi, L.dist) {
        return hit.mat.emission;
    }

    let fr = hit.mat.diffuse / PI;
    let cosTheta = max(0.0, dot(N, L.wi));
    let Lo = hit.mat.emission + fr * L.Li * cosTheta;

    return Lo;
}

const MAX_BOUNCES : i32 = 15;

fn trace(ray0: Ray, seed: ptr<function, u32>, blueBg: bool) -> vec3<f32> {
    var ray = ray0;
    var eta: f32 = 1.0;
    var acc = vec3<f32>(0.0);
    var throughput = vec3<f32>(1.0, 1.0, 1.0);

    for (var depth: i32 = 0; depth < MAX_BOUNCES; depth = depth + 1) {
        if depth >= 3 {
            let p = clamp(luminance(throughput), 0.2, 0.95);
            let xi = rnd(seed);
            
            
            
            throughput = throughput / p;
        }
        let h = intersect_scene_bsp(ray, true);
        if !h.hit {
            let bg = background(ray.dir, blueBg);
            return acc + throughput * bg;
        }

        let hRel = addRelEta(h, computeRelEta(h, ray, eta));

        if hRel.emit && any(hRel.mat.emission > vec3<f32>(0.0)) {
            acc += throughput * hRel.mat.emission;
            return acc;
        }

        var c = vec3<f32>(0.0);
            if hRel.shaderId == 0u && depth <= 6 {
        c = shade_once(ray, hRel, seed);
        }
        
        if hRel.shaderId == 1u {
            acc += throughput * c;
            let P = ray.origin + hRel.t * ray.dir;
            var N = hRel.n;
            if dot(N, ray.dir) > 0.0 {
                N = -N;
            }
            let Rdir = normalize(reflect(ray.dir, N));
            let eps = EPS_RAY;
            ray = Ray(P + eps * Rdir, Rdir, eps, SCENE_TMAX);
            continue;
        }

        
        if hRel.shaderId == 2u {
            acc += throughput * c;

            let P = ray.origin + hRel.t * ray.dir;
            var N = hRel.n;
            var entering = true;
            if dot(N, ray.dir) > 0.0 {
                N = -N;
                entering = false;
            }

            
            if !entering {
                let sigma = hRel.extinction;
                let s = hRel.t;
                let Tr = exp(-sigma * s);
                let TrAvg = (Tr.x + Tr.y + Tr.z) / 3.0;

                let xi_tr = rnd(seed);
                if xi_tr > TrAvg {
                    return acc;
                }

                throughput = throughput * (Tr / max(TrAvg, 0.000001));
            }

            let rel = hRel.relEta;
            let cosi = -dot(N, ray.dir);
            let sin2_t = rel * rel * (1.0 - cosi * cosi);
            let k = 1.0 - sin2_t;

            if k < 0.0 {
                let Rdir = normalize(reflect(ray.dir, N));
                let eps = EPS_RAY;
                ray = Ray(P + eps * Rdir, Rdir, eps, SCENE_TMAX);
                continue;
            }

            let cost = sqrt(max(k, 0.0));

            var eta_i = 1.0;
            var eta_t = hRel.mat.ior;
            if !entering {
                eta_i = hRel.mat.ior;
                eta_t = 1.0;
            }

            let Rf = fresnel_R(cosi, cost, eta_i, eta_t);
            let xi = rnd(seed);

            if xi < Rf {
                let Rdir = normalize(reflect(ray.dir, N));
                let eps = EPS_RAY;
                ray = Ray(P + eps * Rdir, Rdir, eps, SCENE_TMAX);
            } else {
                let Tdir = normalize(rel * ray.dir + (rel * cosi - cost) * N);
                let eps = EPS_RAY;
                ray = Ray(P + eps * Tdir, Tdir, eps, SCENE_TMAX);
                if entering {
                    eta = hRel.mat.ior;
                } else {
                    eta = 1.0;
                }
            }
            continue;
        }

        
        acc += throughput * c;

        let albedo = hRel.mat.diffuse;
        if all(albedo == vec3<f32>(0.0)) {
            return acc;
        }

        let Pd = (albedo.x + albedo.y + albedo.z) / 3.0;
        let xi = rnd(seed);
        if xi > Pd {
            return acc;
        }

        throughput = throughput * (albedo / max(Pd, 0.000001));

        var N = hRel.n;
        if dot(N, ray.dir) > 0.0 {
            N = -N;
        }

        let xi1 = rnd(seed);
        let xi2 = rnd(seed);
        let cos_theta = sqrt(xi1);
        let sin_theta = sqrt(max(0.0, 1.0 - xi1));
        let phi = 2.0 * PI * xi2;
        let local_dir = spherical_direction(sin_theta, cos_theta, phi);
        let wi = rotate_to_normal(N, local_dir);

        let P = ray.origin + hRel.t * ray.dir;
        let eps = EPS_RAY;
        ray = Ray(P + eps * wi, wi, eps, SCENE_TMAX);
    }

    return acc;
}


struct FSOut {
    @location(0) frame: vec4<f32>,
    @location(1) accum: vec4<f32>,
};

@fragment
fn fsMain(@location(0) img: vec2<f32>, @builtin(position) fragcoord: vec4<f32>) -> FSOut {
    let width: u32 = cam.addrMode;
    let height: u32 = cam.filterMode;
    let frame: u32 = cam._pad1;
    let N: u32 = cam._pad2;

    let invWraw = cam._pad0;
    let blueBg = invWraw < 0.0;
    let invW = abs(invWraw);
    let invH = invW * cam.aspect;
    let dpx = 2.0 * invW;
    let dpy = 2.0 * invH;

    let pixId = u32(fragcoord.y) * width + u32(fragcoord.x);
    var seed = tea(pixId, frame);

    
    let jx = rnd(&seed) - 0.5;
    let jy = rnd(&seed) - 0.5;
    let img_j = img + vec2<f32>(jx * dpx, jy * dpy);

    let center = cam.eye.xyz + cam.zoom * cam.W.xyz;
    let Pimg = center + img_j.x * cam.U.xyz + (img_j.y / cam.aspect) * cam.V.xyz;
    let dir = normalize(Pimg - cam.eye.xyz);

    var sampleRGB = trace(Ray(cam.eye.xyz, dir, EPS_RAY, SCENE_TMAX), &seed, blueBg);

    
    let L = luminance(sampleRGB);
    let Lmax = 5.0; 

    if L > Lmax {
        sampleRGB *= Lmax / max(L, EPS_DIV);
    }

    let prevAccum = textureLoad(renderTexture, vec2<u32>(fragcoord.xy), 0).rgb;
    let prevSum   = prevAccum * f32(frame);
    let accumRGB  = (prevSum + sampleRGB) / f32(frame + 1u);

    let outRGB = pow(max(accumRGB, vec3<f32>(0.0)), vec3<f32>(1.0 / cam.gamma));

    var out: FSOut;
    out.frame = vec4<f32>(outRGB, 1.0);
    out.accum = vec4<f32>(accumRGB, 1.0);
    return out;
}
