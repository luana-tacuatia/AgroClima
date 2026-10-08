import { z } from "zod";

export const forecastQuerySchema = z.object({
  lat: z.coerce.number().min(-90, "Latitude inválida").max(90, "Latitude inválida"),
  lon: z.coerce.number().min(-180, "Longitude inválida").max(180, "Longitude inválida"),
  name: z.string().min(1).max(120).optional(),
  state: z.string().min(1).max(120).optional(),
  country: z.string().min(1).max(120).optional(),
});

export type ForecastQuery = z.infer<typeof forecastQuerySchema>;
