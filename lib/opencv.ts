import { loadOpenCV, type OpenCV } from "@opencvjs/web";

let cvPromise: Promise<typeof OpenCV> | null = null;

export async function getOpenCV(): Promise<typeof OpenCV> {
  if (!cvPromise) {
    cvPromise = loadOpenCV();
  }
  return cvPromise;
}
