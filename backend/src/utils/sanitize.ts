import xss from "xss";
import { z } from "zod";

export const sanitizedString = (schema: z.ZodString) => {
  return schema.transform((val) =>
    xss(val, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script", "style"],
    }),
  );
};
