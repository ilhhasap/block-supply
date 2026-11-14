/**
 * Stands in for `kiwi-schema` (see the alias in vite.config.ts). Everything is kiwi's own, except
 * `compileSchema`: kiwi builds the encoder with `new Function`, which the Content-Security-Policy
 * blocks, so Copy to Figma failed on the deployed site. The same code is shipped precompiled.
 *
 * To regenerate `compiled.gen.js` after updating @magicpatterns/html-to-figma: run the dev server,
 * and in the browser console capture the second argument kiwi passes to `Function("exports", code)`
 * during one Copy; strip its first two lines (the `exports` and `require` ones) into the file.
 */
import { ByteBuffer, compileSchemaJS, type Schema } from "kiwi-schema/kiwi-esm.js";
import install, { SOURCE_LENGTH } from "./compiled.gen.js";

export * from "kiwi-schema/kiwi-esm.js";

export function compileSchema(schema: Schema) {
  if (import.meta.env.DEV && compileSchemaJS(schema).length !== SOURCE_LENGTH) {
    console.warn("[kiwi] The converter's schema changed; regenerate src/lib/kiwi/compiled.gen.js.");
  }
  const result: Record<string, unknown> = { ByteBuffer };
  install(result);
  return result;
}
