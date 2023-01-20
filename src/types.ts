export type QueryParams = {
  fileName?: string;
  w?: string;
  h?: string;
  quality?: string;
  resize?: string;
  webp?: string;
  crop?: string;
  crop_strategy?: string;
  gravity?: string;
  background?: string;
  zoom?: string;
  lb?: string;
  fit?: string;
};

export type ResizeOptions = {
  fileName?: string;
  w?: number;
  h?: number;
  quality?: number;
  resize?: string;
  webp?: boolean;
  crop?: string[];
  crop_strategy?: string;
  gravity?: string;
  background?: string;
  zoom?: string;
  lb?: string;
  fit?: string;
};
