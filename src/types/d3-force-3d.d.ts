// Ambient type shim. d3-force-3d has no published types; we only use
// a few factories and Causalist is fine treating the module as unknown.
declare module "d3-force-3d" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function forceY(accessor?: (node: any) => number): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function forceCollide(accessor?: (node: any) => number): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function forceManyBody(): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function forceLink(): any;
}
