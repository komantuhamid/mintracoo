declare module "colorthief" {
  export default class ColorThief {
    getPalette(image: Buffer | string, colorCount?: number): Promise<number[][]>;
    getColor(image: Buffer | string): Promise<number[]>;
  }
}
