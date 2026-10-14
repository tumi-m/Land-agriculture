/** ffprobe-static ships no types: it exports the path to its binary. */
declare module "ffprobe-static" {
  const ffprobe: { path: string };
  export default ffprobe;
}
