// frontend/types/r3f-primitive.d.ts
// Teach TS that the <primitive /> JSX tag exists
declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: any;
    }
  }
}
export {};
