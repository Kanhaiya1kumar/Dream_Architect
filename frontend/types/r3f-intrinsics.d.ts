// frontend/types/r3f-intrinsics.d.ts
// Minimal JSX intrinsics so TS accepts common R3F tags used in your app.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // core
      mesh: any;
      group: any;

      // lights
      ambientLight: any;
      hemisphereLight: any;
      directionalLight: any;

      // helpers / misc
      color: any;
      fog: any;
      gridHelper: any;
      axesHelper: any;

      // keep if you still use it elsewhere
      primitive: any;
    }
  }
}

export {};
