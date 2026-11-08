import { z } from 'zod';

export const percent = z.number().min(0).max(100);
export const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/);
