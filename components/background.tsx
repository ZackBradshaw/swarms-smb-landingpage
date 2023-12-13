import { useMemo, useRef, useEffect } from 'react';
import { extend, useFrame, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  #define iterations 17
  #define formuparam 0.53

  #define volsteps 20
  #define stepsize 0.1

  #define zoom   0.800
  #define tile   0.850
  #define speed  0.010 

  #define brightness 0.0015
  #define darkmatter 0.300
  #define distfading 0.730
  #define saturation 0.850

  uniform float iTime;
  uniform vec2 iMouse;
  uniform vec3 iResolution;

  void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy - .5;
    uv.y *= iResolution.y / iResolution.x;
    vec3 dir = vec3(uv * zoom, 1.);
    float time = iTime * speed + .25;

    // Reduced mouse effect by changing multiplier to 0.5
    float a1 = .5 + iMouse.x / iResolution.x * 0.5;
    float a2 = .8 + iMouse.y / iResolution.y * 0.5;
    mat2 rot1 = mat2(cos(a1), sin(a1), -sin(a1), cos(a1));
    mat2 rot2 = mat2(cos(a2), sin(a2), -sin(a2), cos(a2));
    dir.xz *= rot1;
    dir.xy *= rot2;
    vec3 from = vec3(1., .5, 0.5);
    from += vec3(time * 2., time, -2.);
    from.xz *= rot1;
    from.xy *= rot2;

    float s = 0.1, fade = 1.;
    vec3 v = vec3(0.);
    for (int r = 0; r < volsteps; r++) {
      vec3 p = from + s * dir * .5;
      p = abs(vec3(tile) - mod(p, vec3(tile * 2.)));
      float pa, a = pa = 0.;
      for (int i = 0; i < iterations; i++) {
        p = abs(p) / dot(p, p) - formuparam;
        a += abs(length(p) - pa);
        pa = length(p);
      }
      float dm = max(0., darkmatter - a * a * .001);
      a *= a * a;
      if (r > 6) fade *= 1. - dm;
      v += fade;
      v += vec3(s, s * s, s * s * s * s) * a * brightness * fade;
      fade *= distfading;
      s += stepsize;
    }
    v = mix(vec3(length(v)), v, saturation);
    gl_FragColor = vec4(v * .01, 1.);
  }
`;

const StarNestMaterial = shaderMaterial(
  { iTime: 0, iMouse: new THREE.Vector2(), iResolution: new THREE.Vector3() },
  vertexShader,
  fragmentShader
);

extend({ StarNestMaterial });

export default function Background() {
  const ref = useRef<THREE.Mesh>();
  const { size, clock, mouse } = useThree();

  const material = useMemo(() => new StarNestMaterial(), []);

  // Update the material properties on each frame
  useFrame(() => {
    material.uniforms.iTime.value = clock.getElapsedTime();
    material.uniforms.iMouse.value = mouse;
    material.uniforms.iResolution.value.set(size.width, size.height, 1);
  });

  // Set the mesh to cover the entire screen and disable depth test
  useEffect(() => {
    if (ref.current) {
      const mesh = ref.current;
      (mesh.material as THREE.Material).depthTest = false;
      mesh.renderOrder = -1;
    }
  }, []);

  return (
    <mesh ref={ref as any} position={[0, 0, -1]} scale={[size.width, size.height, 1]}>
      <planeBufferGeometry attach="geometry" args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
