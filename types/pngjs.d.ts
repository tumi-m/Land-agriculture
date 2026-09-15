/**
 * Minimal pngjs declaration for the test suite. pngjs ships no types and the
 * scripts that build the rasters are excluded from typecheck; this covers the
 * synchronous read path used by tests/raster.test.ts.
 */
declare module "pngjs" {
  export interface PNGImage {
    width: number;
    height: number;
    data: Uint8Array;
  }

  export const PNG: {
    sync: {
      read(buffer: Uint8Array): PNGImage;
      write(image: PNGImage, options?: { deflateLevel?: number }): Buffer;
    };
  };
}
